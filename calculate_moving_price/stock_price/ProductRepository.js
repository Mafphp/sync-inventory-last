const ProductType = require('../../models/product_type.model');
const ProductUnit = require('../../models/product_unit.model');
const ImportTransaction = require('./entities/transaction');
const Product = require('../../models/product.model');
const db = require('../../models/index');
const PriceQuote = require('../../models/price_quote.model');

module.exports = class ProductRepository {
  constructor() {

  }

  searchType(name) {
    return ProductType.model().findAll({
      limit: 5,
      where: {
        name: {
          [db.Op.iLike]: '%' + name.trim() + '%'
        }
      }
    });
  }

  async searchCompositeUnits(name) {
    return ProductUnit.model().findAll({
      limit: 5,
      where: {
        name: {
          [db.Op.iLike]: '%' + name.trim() + '%'
        },
        ref_id: {
          [db.Op.ne]: null
        },
        convert_factor: {
          [db.Op.ne]: null
        }
      }
    })
  }

  async showBaseUnits() {
    return ProductUnit.model().findAll({
      where: {
        ref_id: null,
        convert_factor: null
      }
    })
  }

  searchProduct(arg) {
    arg = arg ? arg.trim() : '';

    return Product.model().findAll({
      include: [{
        model: ProductUnit.model(),
      }],
      limit: 5,
      attributes: ['id', 'name', 'code'],
      where: {
        [db.Op.or]: [
          {
            name: {
              [db.Op.iLike]: '%' + arg + '%'
            }
          },
          {
            code: {
              [db.Op.iLike]: '%' + arg + '%'
            }
          }
        ]
      },
      order: [
        ['name', 'ASC'],
      ],
    })

  }

  async getOrAddProductInstance(product_id, vendor_id, expiry_date) {
    const prod = await Product.model().findOne({where: {id: product_id}});
    const it = new ImportTransaction();
    await it.addOrGetProductInstance(prod.id, vendor_id, expiry_date, prod.code);
    return it.productInstanceId;
  }

  async createPriceQuoteIfNotExist(product_id) {
    if (!product_id) throw new Error('product id is not defined');
    let priceQuote = await PriceQuote.model().findOne({where: {product_id}});
    if (!priceQuote) {
      priceQuote = await PriceQuote.model().create({product_id});
    }
    return priceQuote;
  }

};
