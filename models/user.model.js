const Sequelize = require('sequelize');

let User;
const init = (seq) => {
  User = seq.define('user', {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4
    },
    username: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    firstname: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    surname: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    role: {
      type: Sequelize.STRING,
      allowNull: false,
    }
  }, {
      tableName: 'user',
      timestamps: false,
      underscored: true
    });
};

let makeRelations = () => {
  const Warehouse = require('./warehouse.model');
  User.hasOne(Warehouse.model(), {foreignKey: {name: 'clerk_id'}});
};

module.exports = {
  init,
  model: () => User,
  makeRelations
};
