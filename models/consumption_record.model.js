const Sequelize = require('sequelize');

let ConsumptionRecord;
const init = (seq) => {

  ConsumptionRecord = seq.define('consumption_record', {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },
    start_date: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    end_date: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    url: {
      type: Sequelize.STRING,
      allowNull: false
    },
  }, {
    tableName: 'consumption_record',
    timestamps: false,
    underscored: true
  });
}

const makeRelations = () => {};

module.exports = {
  init,
  model: () => ConsumptionRecord,
  makeRelations
};

