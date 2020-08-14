const Sequelize = require('sequelize');

let ProductInstance;
const init = (seq) => {

  ProductInstance = seq.define('product_instance', {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },
    expiry_date: {
      type: Sequelize.DATEONLY,
    },
    code: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    }
  }, {
      tableName: 'product_instance',
      timestamps: false,
      underscored: true,
    });
};

const makeRelations = () => {
  const Product = require('./product.model');
  const Vendor = require('./vendor.model');
  const StockTransaction = require('./stock_transaction.model');
  const InventoryTaking = require('./inventory_taking.model');

  ProductInstance.belongsTo(Product.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
  ProductInstance.belongsTo(Vendor.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
  ProductInstance.hasMany(StockTransaction.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
  ProductInstance.hasMany(InventoryTaking.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
};

module.exports = {
  init,
  model: () => ProductInstance,
  makeRelations
};
