const Sequelize = require('sequelize');
let Product;
const tableName = 'product';
const init = (seq) => {

  Product = seq.define(tableName, {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },
    name: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    },
    warningZone:{
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    code: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    },
    product_type_id: {
      type: Sequelize.UUID,
    },
    product_unit_id: {
      type: Sequelize.UUID,
    }
  }, {
      tableName: tableName,
      timestamps: false,
      underscored: true,
  },);
};
const makeRelations = () => {
  const ProductType = require('./product_type.model');
  const ProductUnit = require('./product_unit.model');
  const ProductInstance = require('./product_instance.model');
  const PriceQuote = require('./price_quote.model');
  const StockPrice = require('./stock_price.model');
  const PurchaseOrderItems = require('./purchase_order_items.model');

  Product.belongsTo(ProductType.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
  Product.belongsTo(ProductUnit.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
  Product.hasMany(ProductInstance.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
  Product.hasMany(PriceQuote.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
  Product.hasMany(StockPrice.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
  Product.hasMany(PurchaseOrderItems.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
};

module.exports = {
  init,
  model: () => Product,
  makeRelations
};
