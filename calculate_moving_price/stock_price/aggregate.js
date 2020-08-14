const {defaultWarehouses} = require('../../consts');
const err = require('../../errors');
const StockTransaction = require('../../models/stock_transaction.model');
const InventoryTaking = require('../../models/inventory_taking.model');
const uuidv4 = require('uuid/v4');
const moment = require('moment');

const getInspectionWarehouse = (id) => {
  const warehouse = Object.values(defaultWarehouses).find(x => x.id === id);
  if (!warehouse)
    throw err.inspection.InvalidInspectionWarehouse();
  return warehouse;
};

const inspectionIsConsistent = (inspections, isPackage = false) => {
  let packages = [];
  for (let inspectionKey in inspections) {
    const inspection = inspections[inspectionKey];
    if ((inspection.physicalCount || inspection.physicalCount === 0) && inspection.physicalCount !== inspection.logicalCount) {
      if (!inspection.diffReasons)
        throw err.inspection.DiffReasonMissing();

      let diffSum = 0;
      Object.keys(inspection.diffReasons).forEach(key => {
        let diffReasonWarehouse = getInspectionWarehouse(key);
        if (!diffReasonWarehouse.is_logical) {
          throw err.inspection.DiffReasonPhysical(diffReasonWarehouse);
        }
        // check package = true
        if (isPackage) {
          inspection.diffReasons[key].forEach(el => {
            diffSum += el.factor * parseInt(el.packageDiffCount, 10);
          });
          packages = inspection.diffReasons[key];
        } else {
          diffSum += inspection.diffReasons[key]
        }
      });
      // 53859240000 logical  
      // 48412800000  physical
      // 5446440000‬ (1107000 * 4.92 = 5446440 )
      if (inspection.logicalCount && diffSum !== Math.abs(inspection.logicalCount - inspection.physicalCount)) {
        throw err.inspection.InconsistentSummation();
      }
    }
  }
  return packages;
};

module.exports = class InspectionAggregate {
  constructor(payload, productRequired = true, warehouseRequired = true) {
    if (!payload)
      throw err.payloadIsNotDefined();

    this.warehouseId = payload.warehouseId;
    this.productId = payload.productId;
    if (!this.warehouseId && warehouseRequired)
      throw err.inspection.NoWarehouseSpecified();

    if (!this.productId && productRequired)
      throw err.inspection.NoProductSpecified();
    this.dateTime = payload.dateTime ? payload.dateTime : new Date();
    this.transactions = [];
    this.transactionsAreSet = false;
    this.isPackage = payload.isPackage ? true : false;
    this.packages = [];
    this.logicalCount = null;
    this.first = !!payload.first;
    if (payload.detailedInspection) {
      if (payload.first) {
        const inventoryTakingWarehoue = defaultWarehouses['INVENTORY_TAKING'];
        for (let inspectionKey in payload.detailedInspection) {
          payload.detailedInspection[inspectionKey].diffReasons = {
            [inventoryTakingWarehoue.id]: payload.detailedInspection[inspectionKey].physicalCount
          }
        }
      }
      const packages = inspectionIsConsistent(payload.detailedInspection, this.isPackage);
      if (this.isPackage) {
        this.packages = packages;
      }
      this.detailedInspection = payload.detailedInspection
    } else {
      this.detailedInspection = {}
    }
    this.physicalCount = this.getPhysicalCount();
  }

  isJustChecking() {
    return this.physicalCount === null;
  }

  showsDifference() {
    return Object.values(this.detailedInspection).map(v => v.physicalCount && v.physicalCount !== v.logicalCount).reduce((x, y) => x || y, false);
  }

  setTransactions(raw) {
    raw.forEach(t => {
      t.amount *= t.origin_id.toLowerCase() === this.warehouseId.toLowerCase() ? -1 : t.dest_id.toLowerCase() === this.warehouseId.toLowerCase() ? 1 : NaN;
    });
    this.transactions = raw;
    // [{pid: 1, amount: 100} , {pid: 1, amount: 200}, {pid: 2, amount: 100}]
    raw.forEach(r => {
      const piId = r.product_instance_id;
      const logicalCount = raw.filter(t => t.product_instance_id === piId).map(t => t.amount).reduce((x, y) => x + y, 0);
      if (!this.detailedInspection[piId]) {
        this.detailedInspection[piId] = {logicalCount, physicalCount: null};
      } else {
        this.detailedInspection[piId].logicalCount = logicalCount;
      }
    });
    // output {1: {logical: 300, physical: null}, 2: {logical: 100, physical: null}}
    inspectionIsConsistent(this.detailedInspection, this.isPackage);
    this.logicalCount = this.getLogicalCount();
    this.physicalCount = this.getPhysicalCount();
    this.transactionsAreSet = true;
  }

  getPhysicalCount() {
    const inspections = Object.values(this.detailedInspection);
    if (!inspections.length)
      return null;

    return inspections
      .map(r => r.physicalCount || 0)
      .reduce((x, y) => x !== null && y !== null ? x + y : null, 0);
  }

  getLogicalCount(exceptionId) {
    let trans = this.transactions;
    if (exceptionId) {
      trans = trans.filter(x => x.transaction_id !== exceptionId);
    }
    return trans.map(r => r.amount).reduce((x, y) => x + y, 0);
  }

  getProductInfo() {
    return (this.transactions && this.transactions.length) ?
      {
        product_id: this.transactions[0].product_id,
        name: this.transactions[0].product_name,
        product_type_id: this.transactions[0].product_type_id,
        product_type_name: this.transactions[0].product_type,
        product_unit_id: this.transactions[0].product_unit_id,
        product_unit_name: this.transactions[0].product_unit,
        convert_factor: this.transactions[0].convert_factor,
        product_instance_code: this.transactions[0].product_instance_code,
        product_code: this.transactions[0].product_code,
      } : null;
  }
  getLogicalCountForInstance(instanceId) {
    return this.transactions.reduce((x, y) => {
      if (y.product_instance_id === instanceId)
        return x + y.amount;
      else
        return x;
    }, 0);
  }

  calculateStock(exceptionId) {
    if (!this.transactionsAreSet)
      throw err.inspection.StockCannotBeCalculatedBeforeLoadingTransactions();

    this.logicalCount = this.getLogicalCount(exceptionId);
    return {amount: this.logicalCount, raw: this.transactions, detailedInspection: this.detailedInspection, productInfo: this.getProductInfo()};
  }
  getTotalCountOfEachPackage(productInstanceId) {
    const product_instance_packages = [];
    this.transactions.filter(el => el.product_instance_id === productInstanceId).forEach(transaction => {
      const _package = {
        package_id: transaction.product_package_id,
        logical_count: transaction.amount,
      }
      const foundPackage = product_instance_packages.find(el => el.package_id === transaction.product_package_id)
      if (foundPackage) {
        foundPackage.logical_count += transaction.amount;
      } else {
        product_instance_packages.push(_package);
      }
    });
    return product_instance_packages;
  }

  async inventoryTakingDbInserts() {
    if (this.isPackage) {
      return this.inventoryTakingProductInstanceIsPackage();
    }
    return this.inventoryTakingProductInstanceIsNormal();
  }
  async inventoryTakingProductInstanceIsPackage() {
    const dateTime = moment(this.dateTime);
    const transTime = moment(dateTime).add(100, 'millisecond');
    const lossTransTime = moment(dateTime).add(-100, 'millisecond');
    if (this.physicalCount === null) {
      throw err.inspection.PhysicalCountRequired();
    }
    // logicalCount
    // physicalCount
    // diffReasons: {}
    let dbInserts = [];
    Object.keys(this.detailedInspection).forEach(pid => {
      const productInstanceId = pid;
      // const anotherProductInstances = Object.keys(this.detailedInspection)[0];
      const logicalCount = this.detailedInspection[productInstanceId].logicalCount; // 3000
      const physicalCount = this.detailedInspection[productInstanceId].physicalCount; // 2000
      const diffReasons = this.detailedInspection[productInstanceId].diffReasons;
      const packages = this.getTotalCountOfEachPackage(productInstanceId);
      if (!packages.length) return;
      if (diffReasons) {
       
        const contradictionDestWarehouseId = Object.keys(diffReasons)[0]; // warehouse id for contradiction
        const clientUsedPackages = diffReasons ? diffReasons[contradictionDestWarehouseId] : null; // packages
        // if not found any package for this instance
        const transactionIds = packages.map(() => uuidv4());

        packages.forEach((pkg, index) => {
          const packageUsedFound = clientUsedPackages.find(p => p.packageId === pkg.package_id);
          // transaction record
          let physical_amount = packageUsedFound ? pkg.logical_count - (parseInt(packageUsedFound.packageDiffCount, 10) * packageUsedFound.factor) : pkg.logical_count;
          if (physicalCount > logicalCount) {
            physical_amount = packageUsedFound ? pkg.logical_count + (parseInt(packageUsedFound.packageDiffCount, 10) * packageUsedFound.factor) : pkg.logical_count;
          }
    
          dbInserts.push({data: {
            id: transactionIds[index],
            dest_id: this.warehouseId,
            origin_id: defaultWarehouses.INVENTORY_TAKING.id,
            product_instance_id: productInstanceId,
            date_time: moment(transTime).toISOString(),
            amount: physical_amount,
            is_verified: true,
            product_package_id: pkg.package_id,
          }, model: StockTransaction.model()});
          // transaction record (check is first)
          if (!this.first) { 
            dbInserts.push({data: {
              origin_id: this.warehouseId,
              dest_id: defaultWarehouses.INVENTORY_TAKING.id,
              product_instance_id: productInstanceId,
              date_time: moment(lossTransTime).toISOString(),
              amount: physical_amount,
              is_verified: true,
              product_package_id: pkg.package_id,
            }, model: StockTransaction.model()});
          }
          // inventory taking record
          dbInserts.push({data: {
            product_instance_id: productInstanceId,
            warehouse_id: this.warehouseId,
            date: moment(dateTime).toISOString(),
            logical_amount: pkg.logical_count,
            physical_amount: physical_amount,
            stock_transaction_id: transactionIds[index],
            is_verified: true
          }, model: InventoryTaking.model()});
        });
        // after loop server packages
    
        // packages client for contradiction
        clientUsedPackages.forEach(packageUsed => {
          dbInserts.push({data: {
            origin_id: this.warehouseId,
            dest_id: contradictionDestWarehouseId,
            product_instance_id: productInstanceId,
            date_time: moment(lossTransTime).toISOString(),
            amount: (parseInt(packageUsed.packageDiffCount, 10) * packageUsed.factor),
            is_verified: true,
            product_package_id: packageUsed.packageId,
          }, model: StockTransaction.model()});
        });
      } else {
        const transactionIds = packages.map(() => uuidv4());
        packages.forEach((pkg, index) => {
          dbInserts.push({data: {
            id: transactionIds[index],
            dest_id: this.warehouseId,
            origin_id: defaultWarehouses.INVENTORY_TAKING.id,
            product_instance_id: productInstanceId,
            date_time: moment(transTime).toISOString(),
            amount: pkg.logical_count,
            is_verified: true,
            product_package_id: pkg.package_id,
          }, model: StockTransaction.model()});
          // transaction record (check is first)
          if (!this.first) { 
            dbInserts.push({data: {
              origin_id: this.warehouseId,
              dest_id: defaultWarehouses.INVENTORY_TAKING.id,
              product_instance_id: productInstanceId,
              date_time: moment(lossTransTime).toISOString(),
              amount: pkg.logical_count,
              is_verified: true,
              product_package_id: pkg.package_id,
            }, model: StockTransaction.model()});
          }
          dbInserts.push({data: {
            product_instance_id: productInstanceId,
            warehouse_id: this.warehouseId,
            date: moment(dateTime).toISOString(),
            logical_amount: pkg.logical_count,
            physical_amount: pkg.logical_count,
            stock_transaction_id: transactionIds[index],
            is_verified: true
          }, model: InventoryTaking.model()});
        });
      }
    });
    let results = [];
    for (let i = 0; i < dbInserts.length; i++) {
      results.push(await dbInserts[i].model.create(dbInserts[i].data));
    }
    return results;
  }
  async inventoryTakingProductInstanceIsNormal() {
    const dateTime = moment(this.dateTime);
    const transTime = moment(dateTime).add(100, 'millisecond');
    const lossTransTime = moment(dateTime).add(-100, 'millisecond');

    if (this.physicalCount === null)
      throw err.inspection.PhysicalCountRequired();

    let dbInserts = [];


    Object.keys(this.detailedInspection).map(piId => {
      this.generatedTransId = uuidv4();
      const user_claimed_logical_amount = this.detailedInspection[piId].logicalCount;
      if (!user_claimed_logical_amount && user_claimed_logical_amount !== 0)
        throw err.inspection.LogicalCountRequired();

      const logical_amount = this.getLogicalCountForInstance(piId);

      if (!logical_amount && logical_amount !== 0)
        throw err.inspection.LogicalCountRequired();

      if (user_claimed_logical_amount !== logical_amount)
        throw err.inspection.ChangeInLogicalCount(user_claimed_logical_amount, logical_amount);

      this.new_physical_amount = (this.detailedInspection[piId].physicalCount || this.detailedInspection[piId].physicalCount === 0) ? this.detailedInspection[piId].physicalCount : logical_amount;
      let newTrans, newIT;
      newTrans = {
        id: this.generatedTransId,
        product_instance_id: piId,
        origin_id: defaultWarehouses.INVENTORY_TAKING.id,
        dest_id: this.warehouseId,
        date_time: moment(transTime).toISOString(),
        amount: this.new_physical_amount,
        is_verified: true
      };
      newIT = {
        product_instance_id: piId,
        warehouse_id: this.warehouseId,
        date: moment(dateTime).toISOString(),
        logical_amount,
        physical_amount: this.new_physical_amount,
        stock_transaction_id: this.generatedTransId,
        is_verified: true
      };

      dbInserts.push(...[
        {data: newTrans, model: StockTransaction.model()},
        {data: newIT, model: InventoryTaking.model()},
      ]);

      if (!this.first) {
        newTrans = {
          product_instance_id: piId,
          origin_id: this.warehouseId,
          dest_id: defaultWarehouses.INVENTORY_TAKING.id,
          date_time: moment(lossTransTime).toISOString(),
          amount: this.new_physical_amount,
          is_verified: true
        };
        dbInserts.push({data: newTrans, model: StockTransaction.model()});
      }
      if (this.transactions.length && logical_amount !== this.new_physical_amount) {

        Object.keys(this.detailedInspection[piId].diffReasons).forEach(key => {
          let origin_id = this.warehouseId;
          let dest_id = key;
          if (logical_amount < this.new_physical_amount) {
            let temp = origin_id;
            origin_id = dest_id;
            dest_id = temp;
          }
          newTrans = {
            product_instance_id: piId,
            origin_id,
            dest_id,
            date_time: moment(lossTransTime).toISOString(),
            amount: Math.abs(this.detailedInspection[piId].diffReasons[key]),
            is_verified: true
          };
          dbInserts.push({data: newTrans, model: StockTransaction.model()})
        })

      }
    });
    let results = [];
    for (let i = 0; i < dbInserts.length; i++) {
      results.push(await dbInserts[i].model.create(dbInserts[i].data));
    }
    return results;
  }

  async updateStockPriceForCreatedTransactions(pirceQuoteId) {
    const StockPriceRepo = require('../../stock-price/repositories/stockPriceRepository');
    const istockPrice = await new StockPriceRepo().loadLastPrice(this.productId);
    istockPrice.setInvestigatingTransaction(this.generatedTransId);
    return istockPrice.setPrice(this.new_physical_amount, null, pirceQuoteId, false);
  }

};
