const Sequelize = require('sequelize');

let Import;
const init = (seq) => {

  Import = seq.define('import', {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },
    no: {
      type: Sequelize.STRING,
      allowNull: false
    },
    invoice_no: {
      type: Sequelize.STRING,
    },
    total_price: {
      type: Sequelize.DOUBLE,
      defaultValue: 0,
    },
    import_ext_id: {
      type: Sequelize.STRING,
      allowNull: false
    },
    payment_order_no: {
      type: Sequelize.STRING
    },
    created_at: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
      allowNull: false
    },
    stock_transaction_id: {
      type: Sequelize.UUID,
    }
  }, {
      tableName: 'import',
      timestamps: false,
      underscored: true,
    });
};

const makeRelations = () => {
  const StockTransaction = require('./stock_transaction.model');
  const StockPrice = require('./stock_price.model');

  Import.belongsTo(StockTransaction.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
  Import.hasMany(StockPrice.model(), {foreignKey: {allowNull: true}, onDelete: 'RESTRICT'});
};

module.exports = {
  init,
  model: () => Import,
  makeRelations
};
