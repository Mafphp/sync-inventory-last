const Sequelize = require('sequelize');

let TransferReport;
const init = (seq) => {
  TransferReport = seq.define('transfer_report', {
    id: {
      primaryKey: true,
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
    },
    desc: {
      type: Sequelize.STRING,
    }
  }, {
      tableName: 'transfer_report',
      timestamps: true,
      underscored: true,
    });
};

const makeRelations = () => {

  let StockTrans = require('./stock_transaction.model');
  TransferReport.belongsTo(StockTrans.model(), {foreignKey: {allowNull: false}, onDelete: 'RESTRICT'});
 
};

module.exports = {
  init,
  model: () => TransferReport,
  makeRelations
};
