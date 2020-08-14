const Sequelize = require('sequelize');

let PriceQuote;
const init = (seq) => {

  PriceQuote = seq.define('price_quote', {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },
    price: {
      type: Sequelize.INTEGER,
    },
    entry_date: {
      type: Sequelize.DATE,
      defaultValue: Date.now()
    },
    valid_to: {
      type: Sequelize.DATE
    },
    delivery_duration: {
      type: Sequelize.INTEGER,
    },
    is_preferred: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    comments: {
      type: Sequelize.STRING
    }
  }, {
      tableName: 'price_quote',
      timestamps: false,
      underscored: true,
    });
    
};

const makeRelations = () => {
  const Product = require('./product.model');
  const Seller = require('./seller.model');
  const StockPrice = require('./stock_price.model');

  PriceQuote.belongsTo(Product.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
  PriceQuote.belongsTo(Seller.model(), {onDelete: 'RESTRICT'});
  PriceQuote.hasMany(StockPrice.model(), {foreignKey: {allowNull: true}, onDelete: 'RESTRICT'});
};

module.exports = {
  init,
  model: () => PriceQuote,
  makeRelations
};
