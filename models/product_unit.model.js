const Sequelize = require('sequelize');

let ProductUnit;
const init = (seq) => {
  ProductUnit = seq.define('product_unit', {
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
    convert_factor: {
      type: Sequelize.FLOAT,
      allowNull: true
    },
    accuracy: { // Decimal points
      type: Sequelize.INTEGER,
    },
  }, {
      tableName: 'product_unit',
      timestamps: false,
      underscored: true,
    });
};

const makeRelations = () => {

  let Product = require('./product.model');

  ProductUnit.belongsTo(ProductUnit, {as: 'ref'});
  ProductUnit.hasMany(Product.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
};

module.exports = {
  init,
  model: () => ProductUnit,
  makeRelations
};
