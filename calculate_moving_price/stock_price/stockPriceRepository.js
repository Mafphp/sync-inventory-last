const db = require('../../models/index');
const StockPrice = require('../../models/stock_price.model');
const StockTransaction = require('../../models/stock_transaction.model');
const IStockPrice = require('./stockPrice');

class StockPriceRepository {


  async loadLastPrice(product_id) {
    let res;
    let whereObject;
    let isForStock = false;
    if (!Array.isArray(product_id)) {
      whereObject = {
        product_id
      }
    } else {
      whereObject = {
        product_id: { [db.Op.in]: product_id }
      }
      isForStock = true;
    }
    res = await StockPrice.model().findAll({
      where: whereObject,
      include: [
        {
          model: StockTransaction.model(),
          required: true,
        }
      ],
      order: [
        ['date_time', 'DESC']
      ],

    })

    if (res && res.length) {
      if (isForStock) {
        return res.map(el => el.get({ plain: true }));
      }
      res = res[0].get({ plain: true })
      return new IStockPrice(product_id, res.id, res.stock_transaction_id, res.mv_price, res.import_id, res.price_quote_id);
    }
    else return new IStockPrice(product_id, null);

  }

  setUnknownPrice(id, stock_transaction_id, product_id, price_quote_id) {

    if (id)
      return StockPrice.model().update({
        stock_transaction_id,
      },
        {
          where: {
            id
          }
        });

    return StockPrice.model().create({
      stock_transaction_id,
      price_quote_id,
      product_id,
      mv_price: null
    });
  }

  updatePrice(id, price) {
    return StockPrice.model().update({
      mv_price: price
    }, {
        where: {
          id
        }
      })
  }

  addNewPrice(stock_transaction_id, product_id, mv_price, sourceId, isImport = true) {
    const obj = {
      stock_transaction_id,
      product_id,
      mv_price
    }

    if (isImport)
      obj.import_id = sourceId;
    else
      obj.price_quote_id = sourceId;

    return StockPrice.model().create(obj)
  }

  async getUnknownsOfPriceQoutes(pqIds) {

    const res = (await StockPrice.model().findAll({
      where: {
        price_quote_id: {
          [db.Op.in]: pqIds
        }
      }
    })).map(x => x.get({plain: true}))

    if (res && res.length) {
      const stockPrices = [];
      for (let i = 0; i < res.length; i++) {
        stockPrices.push(new IStockPrice(res[0].product_id, res[0].id, res[0].stock_transaction_id, res[0].mv_price, res[0].import_id, res[0].price_quote_id));
      }
      return stockPrices;
    }
  }
}



module.exports = StockPriceRepository;
