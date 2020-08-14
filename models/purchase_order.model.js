const Sequelize = require('sequelize');

let PurchaseOrder;
const init = (seq) => {
  PurchaseOrder = seq.define('purchase_order', {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },
    date: {
      type: Sequelize.DATEONLY,
    },
    order_number: {
      type: Sequelize.STRING,
      unique: true,
    },
    status: {
      type: Sequelize.ENUM(['rejected', 'confirmed', 'pending']),
    },
    item_count: {
      type: Sequelize.INTEGER,
    },
    description: {
      type: Sequelize.TEXT,
    },
    data_json: {
        type: Sequelize.JSON,
    }
  }, {
      tableName: 'purchase_order',
      timestamps: true,
      underscored: true,
    });
};

const makeRelations = () => {
  const User = require('./user.model');
  const PurchaseOrderItems = require('./purchase_order_items.model');
  PurchaseOrder.belongsTo(User.model(), {foreignKey: {allowNull: false, name: 'created_by'}, onDelete: 'RESTRICT'});
  PurchaseOrder.hasMany(PurchaseOrderItems.model(), {foreignKey: {allowNull: false, name: 'purchase_order_id'}, onDelete: 'RESTRICT'});
};

module.exports = {
  init,
  model: () => PurchaseOrder,
  makeRelations
};
