const StockTransaction = require('../../models/stock_transaction.model');
const ProductInstance = require('../../models/product_instance.model');
const Product = require('../../models/product.model');
const ProductUnit = require('../../models/product_unit.model');
const Vendor = require('../../models/vendor.model');
const Warehouse = require('../../models/warehouse.model');
const Import = require('../../models/import.model');
const PriceQuote = require('../../models/price_quote.model');
const ProductPackage = require('../../models/product_package.model');
const Seller = require('../../models/seller.model');
const TransferReport = require('../../models/transfer_report.model');
const IPriceQuote = require('./entities/priceQuote');
const IWarehouse = require('./entities/warehouse');
const IImport = require('./entities/import');
const IProduct = require('./entities/product');
// const ITransaction = require('./transaction');
const TransactionAggregate = require('./transactionAggregate');
const db = require('../../models/index');

class TransactionRepository {
  constructor() {
  }

  // query side
  async getRemovalOfConsumptionTransaction(product_id) {
    const query = `
    SELECT
    t.id as transaction_id,
    t.product_package_id,
    t.is_verified as is_verified,
    product_instance_id,
    vendor_id,
    v.name as vendor,
    p.expiry_date,
    product_id,
    pro.name as product_name,
    pro.product_type_id,
    pro.product_unit_id,
    pro_type.name as product_type,
    pro_unit.name as product_unit,
    pro_unit.convert_factor,
    entity_ext_id,
    amount,
    origin_id,
    origin_w.name as origin,
    dest_id,
    dest_w.name as dest,
    date_time,
    origin_w.is_logical as origin_type,
    dest_w.is_logical as dest_type
  FROM
    product_instance p
  INNER JOIN product pro on  pro.id = p.product_id
  INNER JOIN product_type pro_type on pro.product_type_id = pro_type.id
  INNER JOIN product_unit pro_unit on pro.product_unit_id = pro_unit.id 
  INNER JOIN vendor v on v.id = p.vendor_id
  LEFT OUTER JOIN stock_transaction t on t.product_instance_id = p.id
  INNER JOIN warehouse origin_w on origin_w.id = t.origin_id 
  INNER JOIN warehouse dest_w on dest_w.id = t.dest_id
      where pro.id = $product_id and dest_w.is_consumption_origin = true and t.is_verified is null
    `;
    const options = {bind: {product_id}};
    const result = await db.sequelize().query(query, options);
    return result[0];
  }

  async getTransactionById(transaction_id) {

    let transaction = await StockTransaction.model().findOne({
      where: {id: transaction_id },
      include: [{
        model: Warehouse.model(),
        as: 'origin'
      }, {
        model: Warehouse.model(),
        as: 'destination'
      }]
    });

    if (transaction) {
      transaction = transaction.get({plain: true});
      const {id, amount, origin, destination, product_instance_id} = transaction;
      return new TransactionAggregate({
        id,
        amount,
        origin,
        dest: destination,
        product_instance_id
      });
    }
    return new TransactionAggregate({});
  }

  async getImportByTransactionId(transaction_id) {
    let _import = await Import.model().findOne({
      where: {stock_transaction_id: transaction_id}
    });
    if (_import) {
      _import = _import.get({plain: true});
      const {id, total_price, no, invoice_no, payment_order_no, created_at} = _import;
      return new IImport(id, total_price, no, invoice_no, payment_order_no, created_at)
    }
    return new IImport();
  }

  async getProductByInstanceId(product_instance_id) {
    let product = await Product.model().findOne({
      include: [{
        model: ProductInstance.model(),
        where: {
          id: product_instance_id
        },
        group: 'product_id'
      }]
    });

    if (product) {
      product = product.get({plain: true});
      const {id} = product;
      return new IProduct(id ,product_instance_id);
    }
    return new IProduct({});
  }

  async getPriceQuoteOfProduct(product_id) {
    let priceQuote = await PriceQuote.model().findOne({
      where: {product_id, is_preferred: true}
    });

    if (priceQuote) {
      priceQuote = priceQuote.get({plain: true});
      const {id, price, is_preferred } = priceQuote;
      return new IPriceQuote(id, price, is_preferred);
    }
    return new IPriceQuote();
  }


  showReceipts(dest_id, limit, offset, all = false) {
    const conditionObj = {
      where: {
        dest_id,
        is_verified: null
      },
      include: [
        {
          model: ProductInstance.model(),
          include: [
            {
              model: Product.model(),
              include: [
                {
                  model: ProductUnit.model()
                }
              ]
            },
            {
              model: Vendor.model()
            }
          ]
        },
        {
          model: ProductPackage.model(),
          as: '',
          required: false
        },
        {
          model: Warehouse.model(),
          as: 'origin',
          required: true
        },
        {
          model: Warehouse.model(),
          as: 'destination',
          required: true
        }
      ],
      order: [
        ['date_time', 'DESC'],
      ],
      limit,
      offset,
    };

    if (all) {
      delete conditionObj.limit;
      delete conditionObj.offset;
    }

    return StockTransaction.model().findAndCountAll(conditionObj);
  }


  async getInvoiceNumber(id) {

    const imported = await Import.model().findOne({
      where: {
        stock_transaction_id: id
      }
    })
    if (!imported.invoice_no)
      return imported.no
    return;
  }


  async getById(id) {
    if (!id) throw new Error('id is not defined');

    let query = `
          SELECT
          st.ID,
          st.amount,
          origin.ID AS origin_id,
          origin.NAME AS origin_name,
          origin.is_logical AS origin_is_logical,
          origin.is_entry AS origin_is_entry,
          dest.ID AS dest_id,
          dest.NAME AS dest_name,
          dest.is_logical AS dest_is_logical,
          dest.is_entry AS dest_is_entry,
          imp.ID AS imp_id,
          imp.total_price AS imp_total_price,
          imp.NO AS imp_no,
          imp.invoice_no AS imp_invoice_no,
          imp.payment_order_no AS imp_payment_order_no,
          imp.created_at AS imp_created_at,
          pq.ID AS pq_id,
          pq.price AS pq_price,
          pq.valid_to AS pq_valid_to,
          P.ID AS product_id,
          pi.ID AS instance_id 
        
        FROM
          stock_transaction AS st
          INNER JOIN warehouse AS origin ON st.origin_id = origin.ID
          INNER JOIN warehouse AS dest ON st.dest_id = dest.ID
          LEFT OUTER JOIN import AS imp ON st.ID = imp.stock_transaction_id
          INNER JOIN product_instance AS pi ON st.product_instance_id = pi.ID
          INNER JOIN product AS P ON pi.product_id = P.ID
          LEFT OUTER JOIN 
          (
            select price_quote.* from
              (SELECT product_id, MAX ( entry_date ) AS max_entry_date FROM price_quote GROUP BY product_id) AS filtered_pq
              INNER JOIN price_quote 
              ON 
                price_quote.product_id = filtered_pq.product_id 
              AND
                price_quote.seller_id IS NULL
              And 
                price_quote.entry_date = filtered_pq.max_entry_date
          ) as pq
          on pq.product_id = p.id
        WHERE
          st.id = $1;

    `;
    let transaction = await db.sequelize().query(query, {
      bind: [id],
      type: db.sequelize().QueryTypes.SELECT
    })

    if (transaction && transaction.length) {

      transaction = transaction[0];
      const origin = new IWarehouse(transaction.origin_id, transaction.origin_name, transaction.origin_is_logical, transaction.origin_is_entry);
      const dest = new IWarehouse(transaction.dest_id, transaction.dest_name, transaction.dest_is_logical, transaction.dest_is_entry);

      let priceQuote;
      let _import;

      if (transaction.imp_id && transaction.imp_total_price && transaction.imp_invoice_no && transaction.imp_payment_order_no)
        _import = new IImport(transaction.imp_id, transaction.imp_total_price, transaction.amount, transaction.imp_invoice_no,
          transaction.imp_payment_order_no, transaction.imp_created_at);

      else if (transaction.pq_id)
        priceQuote = new IPriceQuote(transaction.pq_id, transaction.pq_price);


      const product = new IProduct(transaction.product_id, transaction.instance_id);
      return new ITransaction(transaction.id, transaction.amount, origin, dest, priceQuote, _import, product);

    }

    return new ITransaction();
  }

  async findReportTrans(id) {
    if (!id)
      throw new Error('id of report is required to find related transaction')

    const res = await TransferReport.model().findOne({
      where: {
        id
      },
      include: [
        {
          model: StockTransaction.model(),
          required: true
        }
      ]
    });

    if (!res)
      throw new Error('report not found');

    return res.get({ plain: true });

  }

  async findSellerIdFromImportId(id) {
    return (await Import.model().findOne({
      where: { id },
      include: [{
        attributes: ['entity_ext_id'],
        model: StockTransaction.model(),
        required: true
      }]
    })).get({ plain: true });
  }

  async findSellerNameFromImport(id) {
    return (await Seller.model().findOne({ where: { id } })).get({ plain: true }).name;
  }

  async findImportFromPriceQoute(id) {
    return (await StockTransaction.model().findOne({
      attributes: [],
      where: { id },
      include: [{
        model: Import.model(),
        attributes: ['invoice_no', 'payment_order_no', 'created_at'],
        required: true
      }]
    })).get({ plain: true }).import;
  }

  async checkErrorStatusOfTransaction(id) {
    const res = await db.sequelize().query(`
    SELECT price_quote.* FROM stock_transaction
    INNER JOIN product_instance ON product_instance.id = stock_transaction.product_instance_id
    INNER JOIN product ON product.id = product_instance.product_id
    INNER JOIN price_quote ON price_quote.product_id = product.id
    WHERE stock_transaction.id = :id`,
      {replacements: {id}, type: db.sequelize().QueryTypes.SELECT});

    if (res[0])
      return res;

    return null;
  }

  // command side
  recordBulkTransferOrder(transactionItems) {
    if (!transactionItems)
      throw new Error('Transaction items is not passed');

    if (!transactionItems.length)
      return Promise.resolve([]);

    return StockTransaction.model().bulkCreate(transactionItems);
  }

  recordTransferToExpired(transactionItem) {
    if (!transactionItem)
      throw new Error('Transaction items is not passed');

    return StockTransaction.model().create({
      product_instance_id: transactionItem.product_instance_id,
      origin_id: transactionItem.origin_id,
      dest_id: transactionItem.dest_id,
      amount: transactionItem.amount,
      is_verified: true,
    });

  }

  verified(id) {
    if (!id) throw new Error('transaction id is not defined');
    return StockTransaction.model().update({ is_verified: true }, {  where: { id } });
  }

  unverified(id) {
    if (!id) throw new Error('transaction id is not defined');
    return StockTransaction.model().update({ is_verified: false }, {where: { id } });
  }

  async registerNewReject(id) {
    if (!id)
      throw new Error('trans id is required to register new reject report')

    return TransferReport.model().create({
      stock_transaction_id: id
    });
  }

  async showUnconfirmedRemovals(warehouseId, showPendings, showRejecteds, showRejectsWithReport, offset, limit) {
    if (!warehouseId)
      throw new Error('show rejected removals needs warehouse id');

    if (!showPendings && !showRejecteds)
      throw new Error('unconfirmed removals shows either pending or rejected list');

    const andConditions = [
      {
        origin_id: warehouseId
      }
    ];

    if (showPendings && !showRejecteds)
      andConditions.push({
        is_verified: {
          [db.Op.eq]: null
        }
      });
    else if (showRejecteds && !showPendings)
      andConditions.push({
        is_verified: false
      });
    else
      andConditions.push({
        [db.Op.or]: [
          {
            is_verified: {
              [db.Op.eq]: null
            }
          },
          {
            is_verified: false
          }
        ]
      });

    if (showRejecteds && !showRejectsWithReport)
      andConditions.push({
        '$transfer_report.desc$': {
          [db.Op.eq]: null
        }
      });


    return StockTransaction.model().findAndCountAll({
      attributes: ['amount', 'date_time', 'is_verified'],
      where: {
        [db.Op.and]: andConditions
      },
      include: [
        {
          attributes: ['id', 'created_at', 'desc'],
          model: TransferReport.model(),
          required: false,
        },
        {
          attributes: ['code', 'expiry_date'],
          model: ProductInstance.model(),
          required: true,
          include: [
            {
              attributes: ['name', 'code'],
              model: Product.model(),
              required: true,
              include: [
                {
                  attributes: ['name', ['convert_factor', 'cf']],
                  model: ProductUnit.model(),
                  required: true,
                }
              ]
            },
            {
              attributes: ['name'],
              model: Vendor.model(),
              required: true,
            }
          ],
        },
        {
          attributes: ['name'],
          model: Warehouse.model(),
          as: 'origin'
        },
        {
          attributes: ['name'],
          model: Warehouse.model(),
          as: 'destination'
        }
      ],
      order: [
        ['is_verified', 'ASC'],
        ['date_time', 'DESC']
      ],
      offset,
      limit

    })
  }

  saveRejectReport(id, desc) {
    return TransferReport.model().update({
      desc
    }, {
        where: {
          id
        }
      })
  }

  async getRemovals(origin, dest, startDate, endDate, is_purchase_Officer) {

    if (!origin || !dest || !startDate || !endDate) throw new Error('properties are incomplete');

    let query = `
    select 
      org.name as origin,
      dst.name as destination,
      pro.name as product_name,
      unit.name as unit,
      unit.convert_factor as factor,
      trans.amount,
      price_quote.price,
      trans.date_time,
      pkg.id as product_package_id,
      pkg.name as product_package_name,
      pkg.convert_factor as product_package_convert_factor,
      vendor.name as vendor, 
      seller.name as seller,
      import.invoice_no as invoice_number,
      import.no as import_number,
      import.total_price,
      trans.is_verified,
      inst.expiry_date
    from stock_transaction trans
      LEFT JOIN stock_price ON stock_price.stock_transaction_id = trans.id
      LEFT JOIN price_quote ON price_quote.id = stock_price.price_quote_id
      join warehouse org on org.id = trans.origin_id 
      join warehouse dst on dst.id = trans.dest_id 
      join product_instance inst on inst.id = trans.product_instance_id
      join product pro on pro.id = inst.product_id
      join product_unit unit on pro.product_unit_id = unit.id
      join vendor on vendor.id = inst.vendor_id 
      left outer join seller on seller.id = trans.entity_ext_id
      left outer join product_package pkg on pkg.id = trans.product_package_id
      left outer join import on import.stock_transaction_id = trans.id
    where
    org.id ${is_purchase_Officer ? 'IN (select id from warehouse where is_source = true)' : '= :origin'} and
    dst.id = :dest and
    DATE(trans.date_time) BETWEEN DATE(:startDate) AND DATE(:endDate)
    ORDER BY trans.date_time DESC
    `;
    let transactions = await db.sequelize().query(query, {
      replacements: { origin, dest, startDate, endDate, is_purchase_Officer },
      type: db.sequelize().QueryTypes.SELECT
    })
    return transactions;
  }

}

module.exports = TransactionRepository;
