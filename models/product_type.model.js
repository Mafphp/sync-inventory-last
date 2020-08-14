const Sequelize = require('sequelize');

let ProductType;
const init = (seq) => {
  ProductType = seq.define('product_type', {
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
    tableName: 'product_type',
    timestamps: false,
    underscored: true,
  });
};

const makeRelations = () => {
  const Product = require('./product.model');
  ProductType.hasMany(Product.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
};

module.exports = {
  init,
  model: () => ProductType,
  makeRelations
};
