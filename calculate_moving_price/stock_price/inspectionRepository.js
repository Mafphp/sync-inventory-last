const moment = require('moment');
const SharedProductRepo = require('./ProductRepository');
const InspectionAggregate = require('./aggregate');
const db = require('../../models/index');
const { defaultWarehouses } = require('../../consts');

class InspectionRepository extends InspectionAggregate {
  constructor(payload, productRequired = true, warehouseRequired = true) {
    super(payload, productRequired, warehouseRequired);
  }

  async findLastReferenceTransaction() {
    const query = `
      select
        max(date) as max_date
      from
        inventory_taking i
      join
        product_instance p
      on
        product_instance_id = p.id
        and p.product_id = $productId
      where
        warehouse_id = $warehouseId
    ${this.dateTime ? 'and date <= $beforeTime' : ''}`;

    const res = await (db.sequelize().query(query, {
      bind: {
        warehouseId: this.warehouseId,
        productId: this.productId,
        beforeTime: moment(this.dateTime).toISOString(),
      },
      type: db.sequelize().QueryTypes.SELECT
    }));
    return res[0] ? res[0].max_date : null;
  }

  async findAllTransactions() {
    const lastTransDate = await this.findLastReferenceTransaction();
    const query = `
      select
        t.id as transaction_id,
        t.is_verified as is_verified,
        t.product_package_id as product_package_id,
        pp.name as package_name,
        pp.convert_factor as package_convert_factor,
        product_instance_id,
        p.code as product_instance_code,
        pro.code as product_code,
        vendor_id,
        v.name as vendor,
        p.expiry_date,
        p.product_id,
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
        t.date_time,
        origin_w.is_logical as origin_type,
        dest_w.is_logical as dest_type,
        CASE WHEN stock_price.price_quote_id IS NOT NULL THEN price_quote.price
            ELSE import.total_price / t.amount
        END AS "fee_price"
      FROM
        product_instance p
        join product pro on pro.id = p.product_id
        join product_type pro_type on pro.product_type_id = pro_type.id
        join product_unit pro_unit on  pro.product_unit_id = pro_unit.id 
        join vendor v on v.id = p.vendor_id
        left outer join stock_transaction t on t.product_instance_id = p.id
        left outer join stock_price stock_price on stock_price.stock_transaction_id = t.id
        left outer join import on import.stock_transaction_id = t.id
        left outer join price_quote on price_quote.id = stock_price.price_quote_id and price_quote.is_preferred = true
        left outer join product_package pp on pp.id = t.product_package_id
        join warehouse origin_w on origin_w.id = t.origin_id
        join warehouse dest_w on dest_w.id = t.dest_id
      where
        ((t.origin_id = $warehouseId and t.is_verified != false)
        or (t.dest_id = $warehouseId and t.is_verified = true) )
        and p.product_id = $productId

  
  ${lastTransDate ? 'and T.DATE_TIME >= $lastTransDate' : ''}
  ${this.dateTime ? 'and date(T.DATE_TIME) <= $beforeTime' : ''}`;
    const res = await db.sequelize().query(query, {
      bind: {
        warehouseId: this.warehouseId,
        productId: this.productId,
        lastTransDate,
        beforeTime: moment(this.dateTime).format('YYYY-MM-DD'),
      },
      type: db.sequelize().QueryTypes.SELECT
    });
    this.setTransactions(res);
  }

  async calculateStock(exceptionId) {
    if (!this.transactionsAreSet)
      await this.findAllTransactions();

    return super.calculateStock(exceptionId);
  }

  async countProductTransactions() {
    const c = await db.sequelize().query(`
      select
        count(*)
      from
	      product_instance p
      join stock_transaction t on
        t.product_instance_id = p.id 
      where
        p.product_id = $productId`, {
        bind: {
          productId: this.productId,
        },
        type: db.sequelize().QueryTypes.SELECT
      });

    return +c[0].count;
  }

  async findTrnsBasedOnExpiry() {
    const query =

      `
  select id,vendor, "prodName","warningType","expiryDate",warehouse, sum(amount) ,$warehouseId as "warehouseId"
  from 
  (select
  w.name as warehouse ,p.id, v.name as vendor, pro.name as "prodName",
  p.expiry_date as "expiryDate",
  CASE WHEN   p.expiry_date < now()  THEN 'Expired'
  WHEN p.expiry_date - pro."warningZone" <= now()  THEN 'Warning'
  END AS "warningType",
  CASE WHEN  t.is_verified= true and t.origin_id = $warehouseId
  THEN -1*t.amount
  else  t.amount
  END AS "amount"
  from product_instance p
  join vendor  v on p.vendor_id = v.id
  join warehouse w on w.id = $warehouseId
  join stock_transaction t on t.product_instance_id = p.id
  join product pro on p.product_id= pro.id
  where 
  (pro."warningZone" is not null
  and  p.expiry_date - pro."warningZone" <= now() 
  or pro."warningZone" is  null and p.expiry_date < now())
  and 
	(t.origin_id = $warehouseId
  or (t.dest_id = $warehouseId
  and t.is_verified = true))) as result
	GROUP BY id ,vendor, "prodName","expiryDate","warningType",warehouse
  having sum(amount) > 0
  `

    const res = await db.sequelize().query(query,{
      bind: {
        warehouseId: this.warehouseId,
      }, 
        type: db.sequelize().QueryTypes.SELECT
      });
    return res

  }



  async countWarehouseTransactions() {
    const c = await db.sequelize().query(`
      select
        count(*)
      from 
        stock_transaction t
      where
        	((t.origin_id = $warehouseId and t.is_verified != false)
	        or (t.dest_id = $warehouseId and t.is_verified = true) )`, {
        bind: {
          warehouseId: this.warehouseId,
        },
        type: db.sequelize().QueryTypes.SELECT
      });

    return +c[0].count;
  }

  async fixPreliminaryDetailedInspections() {
    const pre = this.detailedInspection;
    this.detailedInspection = {};
    for (const row in pre) {
      if (pre[row].vendorId && pre[row].expiryDate) {
        const productInstanceId = await new SharedProductRepo().getOrAddProductInstance(this.productId, pre[row].vendorId, pre[row].expiryDate);
        this.detailedInspection[productInstanceId] = {
          physicalCount: pre[row].physicalCount,
          logicalCount: 0,
          diffReasons: { [defaultWarehouses.INVENTORY_TAKING.id]: pre[row].physicalCount }
        }
      } else {
        this.detailedInspection[row] = pre[row];
      }
    }
  }

  async insertRequestForQuote() {
    return new SharedProductRepo().createPriceQuoteIfNotExist(this.productId);
  }
}

module.exports = InspectionRepository;