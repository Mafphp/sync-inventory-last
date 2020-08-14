const Sequelize = require('sequelize');

let Vendor;
const init = (seq) => {
  
  Vendor = seq.define('vendor', {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },
    // serial: {
    //   unique: true,
    //   type: Sequelize.INTEGER,
    //   autoIncrement: true,
    // },
    name: {
      type: Sequelize.STRING,
      unique: true,
      allowNull: false,
    },
    data_json: {
      type: Sequelize.JSON
    }
  }, {
    tableName: 'vendor',
    timestamps: false,
    underscored: true,
  });
};

const makeRelations = () => {
  const ProductInstance = require('./product_instance.model');
  Vendor.hasMany(ProductInstance.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
};

module.exports = {
  init,
  model: () => Vendor,
  makeRelations
};
