const Sequelize = require('sequelize');

let InventoryTaking;
const init = (seq) => {
  
  InventoryTaking = seq.define('inventory_taking', {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },
    date: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
      allowNull: false,
    },
    logical_amount: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    physical_amount: {
      type: Sequelize.INTEGER,
    },
    days_to_end: {
      type: Sequelize.INTEGER,
    },
    product_instance_id: {
      type: Sequelize.UUID,
    },
    warehouse_id: {
        type: Sequelize.UUID,
    },
    stock_transaction_id: {
        type: Sequelize.UUID,
    }
  }, {
    tableName: 'inventory_taking',
    timestamps: false,
    underscored: true,
  });
};

const makeRelations = () => {
  const ProductInstance = require('./product_instance.model');
  const Warehouse = require('./warehouse.model');
  const Transaction = require('./stock_transaction.model');

  InventoryTaking.belongsTo(ProductInstance.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
  InventoryTaking.belongsTo(Warehouse.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
  InventoryTaking.belongsTo(Transaction.model(), {foreignKey: {allowNull: false}});
};

module.exports = {
  init,
  model: () => InventoryTaking,
  makeRelations
};
