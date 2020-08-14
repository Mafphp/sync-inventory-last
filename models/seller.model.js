const Sequelize = require('sequelize');

let Seller;
const init = (seq) => {

  Seller = seq.define('seller', {
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
    data_json: {
      type: Sequelize.JSON
    }
  }, {
      tableName: 'seller',
      timestamps: false,
      underscored: true,
    });
};

const makeRelations = () => {
  const PriceQuote = require('./price_quote.model');

  Seller.hasMany(PriceQuote.model(), {onDelete: 'RESTRICT'});
};

module.exports = {
  init,
  model: () => Seller,
  makeRelations
};
