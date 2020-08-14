const Sequelize = require('sequelize');

let PurchaseOrderItems;
const init = (seq) => {
  PurchaseOrderItems = seq.define('purchase_order_items', {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },
    amount: {
      type: Sequelize.INTEGER,
    },
    description: {
      type: Sequelize.TEXT,
    },
    name_of_center: {
      type: Sequelize.STRING,
    },
    data_json: {
        type: Sequelize.JSON,
    }
  }, {
      tableName: 'purchase_order_items',
      timestamps: false,
      underscored: true,
    });
};

const makeRelations = () => {
  const Product = require('./product.model');
  const PurchaseOrder = require('./purchase_order.model');
  PurchaseOrderItems.belongsTo(Product.model(), {foreignKey: {allowNull: false, name: 'product_id'}, onDelete: 'RESTRICT'});
  PurchaseOrderItems.belongsTo(PurchaseOrder.model(), {foreignKey: {allowNull: false, name: 'purchase_order_id'}, onDelete: 'RESTRICT'});
};

module.exports = {
  init,
  model: () => PurchaseOrderItems,
  makeRelations
};
