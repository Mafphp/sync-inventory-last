const Sequelize = require('sequelize');

let StockTransaction;
const init = (seq) => {

  StockTransaction = seq.define('stock_transaction', {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },
    entity_ext_id: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    product_package_id: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    date_time: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
    amount: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    is_verified: {
      type: Sequelize.BOOLEAN,
      defaultValue: null
    },
    product_package_id: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    product_instance_id: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    origin_id: {
      type: Sequelize.UUID,
    },
    dest_id: {
      type: Sequelize.UUID,
    },
  }, {
      tableName: 'stock_transaction',
      timestamps: true,
      underscored: true,
    });
};

const makeRelations = () => {
  const ProductInstance = require('./product_instance.model');
  const Warehouse = require('./warehouse.model');
  const InventoryTaking = require('./inventory_taking.model');
  const TrnasferReport = require('./transfer_report.model');
  const StockPrice = require('./stock_price.model');
  const Import = require('./import.model');
  const ProductPackage = require('./product_package.model');

  StockTransaction.belongsTo(ProductInstance.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
  StockTransaction.belongsTo(ProductPackage.model(), {foreignKey: {allowNull: true}, onDelete: 'RESTRICT'});
  StockTransaction.belongsTo(Warehouse.model(), {foreignKey: {name: 'origin_id', allowNull: false}, onDelete: 'RESTRICT', as: 'origin'});
  StockTransaction.belongsTo(Warehouse.model(), {foreignKey: {name: 'dest_id', allowNull: false}, onDelete: 'RESTRICT', as: 'destination'});
  StockTransaction.hasMany(InventoryTaking.model(), {foreignKey: {allowNull: false}});
  StockTransaction.hasMany(StockPrice.model(), {foreignKey: {allowNull: false}});
  StockTransaction.hasOne(Import.model(), {foreignKey: {allowNull: false}});
  StockTransaction.hasOne(TrnasferReport.model(), {foreignKey: {allowNull: false}});
};

module.exports = {
  init,
  model: () => StockTransaction,
  makeRelations
};
