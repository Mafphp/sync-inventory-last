const Sequelize = require('sequelize');

let StockPrice;
const init = (seq) => {

  StockPrice = seq.define('stock_price', {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },
    date_time: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    mv_price: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    stock_transaction_id: {
      type: Sequelize.UUID,
    }
  }, {
      tableName: 'stock_price',
      timestamps: false,
      underscored: true,
    });
};

const makeRelations = () => {
  const StockTrans = require('./stock_transaction.model');
  const Import = require('./import.model');
  const PriceQuote = require('./price_quote.model');
  const Product = require('./product.model');

  StockPrice.belongsTo(StockTrans.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
  StockPrice.belongsTo(Product.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
  StockPrice.belongsTo(Import.model(), {foreignKey: {allowNull: true}, onDelete: 'RESTRICT'});
  StockPrice.belongsTo(PriceQuote.model(), {foreignKey: {allowNull: true}, onDelete: 'RESTRICT'});
};

const makeConstraints = () => {
  return [
    'ALTER TABLE stock_price DROP CONSTRAINT IF EXISTS rfq_or_import_is_not_null',
    'ALTER TABLE stock_price ADD  CONSTRAINT rfq_or_import_is_not_null CHECK  ( ((price_quote_id IS NULL) and (NOT import_id IS NULL)) or ((NOT price_quote_id IS NULL) and (import_id IS NULL)) )'
  ]
}

module.exports = {
  init,
  model: () => StockPrice,
  makeRelations,
  makeConstraints
};
