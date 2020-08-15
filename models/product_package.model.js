const Sequelize = require('sequelize');

let ProductPackage;
const init = (seq) => {
  ProductPackage = seq.define('product_package', {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    convert_factor: {
      type: Sequelize.FLOAT,
      allowNull: true
    },
    product_id: {
      type: Sequelize.UUID,
    }
  }, {
      tableName: 'product_package',
      timestamps: false,
      underscored: true,
    });
};

const makeRelations = () => {

  let Product = require('./product.model');

  ProductPackage.belongsTo(Product.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
};

module.exports = {
  init,
  model: () => ProductPackage,
  makeRelations
};
