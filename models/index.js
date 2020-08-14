const Sequelize = require('sequelize');
const DictionaryLocation = require('./dictionary_location.model');
const DictionaryWord = require('./dictionary_word.model');
const User = require('./user.model');
const InventoryTaking = require('./inventory_taking.model');
const PriceQuote = require('./price_quote.model');
const ProductInstance = require('./product_instance.model');
const ProductType = require('./product_type.model');
const ProductUnit = require('./product_unit.model');
const Product = require('./product.model');
const ProductPackage = require('./product_package.model');
const PurchaseOrder = require('./purchase_order.model');
const PurchaseOrderItems = require('./purchase_order_items.model');
const Import = require('./import.model');
const Seller = require('./seller.model');
const StockTransaction = require('./stock_transaction.model');
const Vendor = require('./vendor.model');
const Warehouse = require('./warehouse.model');
const TransferReport = require('./transfer_report.model');
const StockPrice = require('./stock_price.model');
const ConsumptionRecord = require('./consumption_record.model');
const SyncQueue = require('./sync_queue.model');
const {config} = require('../env');
Sequelize.useCLS(require('cls-hooked').createNamespace('HIS-W-NS'));

const Op = Sequelize.Op;
let sequelize;
let tableList = [
  DictionaryLocation,
  DictionaryWord,
  User,
  InventoryTaking,
  PriceQuote,
  ProductInstance,
  ProductType,
  ProductUnit,
  Product,
  Seller,
  StockTransaction,
  Import,
  Vendor,
  Warehouse,
  TransferReport,
  StockPrice,
  ConsumptionRecord,
  ProductPackage,
  PurchaseOrder,
  PurchaseOrderItems,
  SyncQueue
];

let connectionString;

useMainDB = () => {
  connectionString = `postgres://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
};

useMainDB();

isReady = (force = false, ConnectionTest = false, clean = false, newConnection = false) => {
  return new Promise((resolve) => {
    if (!sequelize || newConnection) {

      console.log('-> ', `makeing new connection to database with conncetion string: ${connectionString}`);

      sequelize = new Sequelize(connectionString, {
        dialect: 'postgres',
        pool: {
          max: 5,
          min: 0,
          idle: 10000
        },
        logging: false,
        dialectOptions: {
          useUTC: false //for reading from database
        },
      });
    }

    let connect = () =>
      sequelize
        .authenticate()
        .then(async () => {
          tableList.forEach(model => {
            model.init(sequelize);
          });

          tableList.forEach(model => {
            model.makeRelations();
          });
          console.log('-> ', 'sync models and database');
          return force ? sequelize.sync({force: true}) : sequelize.sync();
        })
        .then(async () => {
          if (ConnectionTest || clean) {
            resolve();
            return;
          }

          console.log('-> ', 'making complex constraints');

          for (let index = 0; index < tableList.length; index++) {
            const model = tableList[index];
            if (model.hasOwnProperty('makeConstraints')) {
              const arr =  model.makeConstraints();
              for (let index = 0; index < arr.length; index++) {
                await sequelize.query(arr[index])
              }
            }
          }
          resolve();
        })
        .catch(err => {
          console.error('-> ', 'Unable to connect to the database:', err);
          setTimeout(connect, 5000);
        });
    connect();
  });
};

module.exports = {
  isReady,
  sequelize: () => sequelize,
  tableList,
  Op,
  useMainDB
};
