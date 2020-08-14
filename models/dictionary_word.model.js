const Sequelize = require('sequelize');

let DictionaryWord;
const init = seq => {
  DictionaryWord = seq.define('dictionary_word', {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4
    },
    key_word: {
      type: Sequelize.STRING,
      unique: false,
      allowNull: false,
    },
    value: {
      type: Sequelize.STRING,
      unique: false,
      allowNull: true,
    }
  }, {
    tableName: 'dictionary_word',
    timestamps: false,
    underscored: true
  });
};

const makeRelations = () => {
  const DictionaryLocation = require('./dictionary_location.model');
  DictionaryWord.belongsTo(DictionaryLocation.model());
};

module.exports = {
  init,
  model: () => DictionaryWord,
  makeRelations
};