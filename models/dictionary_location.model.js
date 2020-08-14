const Sequelize = require('sequelize');

let DictionaryLocation;
const init = seq => {
  DictionaryLocation = seq.define('dictionary_location',
  {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4
    },
    name: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    },
    direction: {
      type: Sequelize.STRING,
    },
    defaultLoc: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    first_day_of_week: {
      type: Sequelize.STRING
    },
    months: {
      type: Sequelize.JSON,
    },
    locale_symbol: {
      type: Sequelize.STRING,
      defaultValue: 'en',
      allowNull: false
    },
    unicode_currency: {
      type: Sequelize.STRING,
      allowNull: false
    }
  }, {
    tableName: 'dictionary_location',
    timestamps: false,
    underscored: true
  });
};

const makeRelations = () => {
  const DictionaryWord = require('./dictionary_word.model');
  DictionaryLocation.hasMany(DictionaryWord.model());
};

module.exports = {
  init,
  model: () => DictionaryLocation,
  makeRelations
};