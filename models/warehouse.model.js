const Sequelize = require('sequelize');

let Warehouse;
const init = (seq) => {

  Warehouse = seq.define('warehouse', {
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
    is_logical: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    is_consumption_origin: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    is_entry: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    is_source: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    is_not_purchase: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    is_lack_reason: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    is_extra_reason: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    is_chain: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
  }, {
      tableName: 'warehouse',
      timestamps: false,
      underscored: true,
    });
};

const makeRelations = () => {
  const StockTransaction = require('./stock_transaction.model');
  const InventoryTaking = require('./inventory_taking.model');
  const User = require('./user.model');
  
  Warehouse.hasMany(StockTransaction.model(), {foreignKey: {name: 'origin_id', allowNull: false}, onDelete: 'RESTRICT'});
  Warehouse.hasMany(StockTransaction.model(), {foreignKey: {name: 'dest_id', allowNull: false}, onDelete: 'RESTRICT'});
  Warehouse.hasMany(InventoryTaking.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
  Warehouse.belongsTo(User.model(), {foreignKey: {name: 'clerk_id'}, onDelete: 'SET NULL'});
};

const makeConstraints = () => {
  return [
    `ALTER TABLE warehouse DROP CONSTRAINT IF EXISTS same_consumption_logical`,
    `ALTER TABLE warehouse ADD CONSTRAINT same_consumption_logical CHECK ((is_logical AND is_consumption_origin) is false)`,
  ]
}

module.exports = {
  init,
  model: () => Warehouse,
  makeRelations,
  makeConstraints
};
