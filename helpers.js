const CSVToJSON = require('csvtojson');
const ObjectsToCsv = require('objects-to-csv')
const fs = require("fs");
const util = require('util');
const path = require('path');
const SetTransactionAsVerified = require('./calculate_moving_price/setTransactionAsVerified');
const { isClinic, aggregateServers, scp_enabled, CONSUMPTION_ID, CENTRAL_WAREHOUSE_ID, BENCH_STOCK_ID, table_names, clinics} = require('./consts');

function generateCode4CharAZ(element) {
  if (!element) return 'AAAA';
  const listAZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
  let found = false;
  for (const item of listAZ) {
    for (const item2 of listAZ) {
      for (const item3 of listAZ) {
        for (const item4 of listAZ) {
          const current = item + item2 + item3 + item4;
          if (found)
            return current;
          if(element === current)
            found = true;
        }
      }
    }
  }
  return ('AAAA');
}

const writeToCsv = async (data, directory_path, filename) => {
  let path_file = path.join(__dirname, directory_path, filename)
  if (scp_enabled) {
    path_file = `/sync-files/${directory_path}${filename}`
  }
  if (data && data.length) {
    data.forEach(element => {
      for (const key in element) {
        if (element.hasOwnProperty(key)) {
          const value = element[key];
          if (value instanceof Date) {
            element[key] = new Date(value).getTime()
          }
        }
      }
    });
    const csv = new ObjectsToCsv(data);
    // Save to file:
    await csv.toDisk(path_file);
  }
}

const copyFileToClinicServer = async (file_path, file_name, dest_path) => {
    const pathToFile = file_path;
    const pathToNewDestination = path.join(__dirname, '..', file_name.split('-')[0].toLowerCase(), dest_path, file_name)
    fs.copyFileSync(pathToFile, pathToNewDestination);
}

const copyFileToChainServer = async (file_path, file_name, dest_path) => {
     const pathToFile = file_path;
    const pathToNewDestination = path.join(__dirname, '..', `chain`, dest_path, file_name)
    fs.copyFileSync(pathToFile, pathToNewDestination);
}

const copyFileToRelevantServer = async (file_path, file_name, dest_path, dest_server) => {
    const pathToFile = file_path;
    const pathToNewDestination = path.join(__dirname, '..', dest_server, dest_path, file_name)
    try {
      fs.copyFileSync(pathToFile, pathToNewDestination);
    } catch (error) {
      throw new Error(`destination ${dest_server} does not exists`)
    }
}

const transferFileFromLocalHostToRemoteHost = async (username, host, port, password, files_path, remote_path) => {
    var path, NodeSSH, ssh, fs
    fs = require('fs')
    path = require('path')
    NodeSSH = require('node-ssh').NodeSSH
    ssh = new NodeSSH()
    try {
      const options = {
        host: host,
        username: username,
        port: port,
        password: password,
        readyTimeout: 2000
      }
      await ssh.connect(options)
      const files = [];
      files_path.forEach(file => {
        files.push({local: file, remote: path.join(remote_path, path.basename(file))})
      });
      console.log(files);
      await ssh.putFiles(files);
    } catch (error) {
      console.log(error);
      throw new Error('destination is not available')
    }
}

const readFilesFromDirectory = (directory_path) => {
  if (scp_enabled) {
    directory_path = `/sync-files/${directory_path}`; 
  }
  function sort_asc(a, b) {
      if (a.time > b.time) return 1;
      if (b.time > a.time) return -1;
      return 0;
  }
  let exists_files = fs.readdirSync(directory_path, function(err, files){
      return files.map(function (fileName) {
        return {
          name: fileName,
          time: fs.statSync(dir + '/' + fileName).mtime.getTime()
        };
      })
      .sort((a, b) => a.time - b.time)
      .map(v => v.name);
  });
  let result = [];
  exists_files = exists_files.map(file => ({table_name: path.basename(file).split('-')[2], file_name: file, time: path.basename(file).split('-')[3]}));
  const resultGrouped = groupBy(exists_files, 'table_name')
  table_names.forEach(tableName => {
      if (resultGrouped[tableName]) {
          resultGrouped[tableName].sort(sort_asc);
          result = result.concat(resultGrouped[tableName]);
      }
  })
  return result.map(x => path.resolve(__dirname, directory_path, x.file_name));
}

const groupBy = function(xs, key) {
    return xs.reduce(function(rv, x) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
};

const deleteFiles = async (files_path) => {
    const unlink = util.promisify(fs.unlink);
    try {
        const unlinkPromises = files_path.map(file_path => unlink(file_path));
        return Promise.all(unlinkPromises);
    } catch(err) {
        console.log(err);
    }
}

async function upsert(values, condition, tableName) {
    for (const key in values) {
      if (values.hasOwnProperty(key)) {
        const element = values[key];
        if (element === '') {
          values[key] = null
        }
        if (['created_at', 'updated_at', 'date_time', 'valid_to', 'entry_date', 'date'].includes(key)) {
          values[key] = new Date(Number(element));
        }
      }
    }
    const db = require(`./models/index`);
    const Model = require(`./models/${tableName}.model`);
    const model = Model.model();
    return db.sequelize().transaction(async () => {
      const obj = await model.findOne({ where: condition });
      if(obj) {
        if (tableName === 'stock_transaction' && !isClinic) {
          delete values.origin_id;
          delete values.dest_id;
        }
        await obj.update(values);
        if (tableName === 'stock_transaction' && values.is_verified === '1') {
          await new SetTransactionAsVerified().verify(values.id);
        }
        if (tableName === 'product') {
          const ProductInstance = require('./models/product_instance.model');
          const findAllProductInstances = await ProductInstance.model().findAll({where: {product_id: values.id}});
          await Promise.all(findAllProductInstances.map(x => ProductInstance.model().update({code: `${values.code}-${x.code.split('-')[1]}`}, {where: {id: x.id}})));
        }
        return values.id;
      } else {
        await model.create(values);
      } 
      return values.id;
  });

}

const readCSVFile = async (file_path) => {
    return CSVToJSON().fromFile(file_path);
}

const convertOriginAndDestinationWarehouse = (data, tableName, destination_warehouse_id, target_name) => {
  if (!isClinic && tableName === 'stock_transaction') {
    data = data.filter(x => x.origin_id === destination_warehouse_id || x.dest_id === destination_warehouse_id);
  }
  if (!isClinic && tableName === 'inventory_taking') {
    data = data.filter(x => x.warehouse_id === destination_warehouse_id);
  }
  if (!['stock_transaction', 'inventory_taking'].includes(tableName)) return;
  // central , bench stock
  // chain mapping data for sending data to clinic
  data.forEach(element => {
    // from chain to clinic
    if (!isClinic) {
      const clinicsArray = objectToArray(clinics);
      const clinicsIds = clinicsArray.map(x => x.warehouse_id);
      // example(transaction): clinic(fardis) => clinic(amol)
      if (clinicsIds.includes(element['origin_id']) && clinicsIds.includes(element['dest_id'])) {
        if ([aggregateServers[target_name.toUpperCase()].warehouse_id].includes(element['origin_id'])) {
          element['origin_id'] = CENTRAL_WAREHOUSE_ID;
        } else {
          element['origin_id'] = aggregateServers['CHAIN'].warehouse_id;
        }
        if ([aggregateServers[target_name.toUpperCase()].warehouse_id].includes(element['dest_id'])) {
          element['dest_id'] = CENTRAL_WAREHOUSE_ID;
        } else {
          element['dest_id'] = aggregateServers['CHAIN'].warehouse_id;
          // destination warehouse, don't need to accept this removal stock so need to set is_verified = true
          element['is_verified'] = true;
        }
        
      } else {
        // import into some warehouse like amol or fardis
        if ([aggregateServers[target_name.toUpperCase()].warehouse_id].includes(element['origin_id'])) {
          element['origin_id'] = CENTRAL_WAREHOUSE_ID;
        }
        if ([aggregateServers[target_name.toUpperCase()].warehouse_id].includes(element['dest_id'])) {
          element['dest_id'] = CENTRAL_WAREHOUSE_ID;
        }
        if ([aggregateServers[target_name.toUpperCase()].warehouse_id].includes(element['warehouse_id'])) {
          element['warehouse_id'] = CENTRAL_WAREHOUSE_ID;
        }
      }
      // if (clinicsIds.includes(element['origin_id'])) {
      //   element['origin_id'] = CENTRAL_WAREHOUSE_ID;
      // }
      // if (clinicsIds.includes(element['dest_id'])) {
      //   element['dest_id'] = CENTRAL_WAREHOUSE_ID;
      // }
    }
    // from clinic to chain
    if (isClinic) {
      ['origin_id', 'dest_id', 'warehouse_id'].forEach(key => {
        if (element[key] === BENCH_STOCK_ID) {
          element[key] = CONSUMPTION_ID;
        }
        if (element[key] === CENTRAL_WAREHOUSE_ID) {
          element[key] = aggregateServers[target_name.toUpperCase()].warehouse_id;
        }
      });
    }
    
  });
}

const objectToArray = (object) => {
  const array = [];
  Object.keys(object).forEach(key => {
    array.push({
        server_name: key.toLowerCase(),
        ...object[key]
    })
  });
  return array;
}

const makeDirectory = (path_directory) => {
  let _path_directory = path_directory;
  if (scp_enabled) {
    _path_directory = `/sync-files/${path_directory}`;
  }
  if (!fs.existsSync(_path_directory)){
    fs.mkdirSync(_path_directory);
  }
}

const sendFile = async ({send_file_path, destination_file_name, destination_directory, destination_name}) => {
  try {
    if (scp_enabled) {
      const serverInfo = aggregateServers[destination_name.toUpperCase()]
      const concatDestinationAddress = `${destination_name.toUpperCase()}_DIRECTORY`;
      let data = [];
      if (process.env[concatDestinationAddress]) {
        const destinationMainDirectory = `${process.env[concatDestinationAddress]}${destination_directory}`;
        await transferFileFromLocalHostToRemoteHost(serverInfo.user, serverInfo.host, serverInfo.port, serverInfo.password,[send_file_path], destinationMainDirectory);
        data = await readCSVFile(send_file_path);
      }
      return data;
    } else {
      await copyFileToRelevantServer(send_file_path, destination_file_name, destination_directory, destination_name);
      const data = await readCSVFile(send_file_path);
      return data || [];
    }
  } catch (error) {
    console.error(`✖ ${destination_name} is not available, could not sent file "${path.basename(send_file_path)}" to destination ${destination_name}`);
    throw new Error('could not send file, directory or server not found');
}
}
module.exports = {
    copyFileToChainServer,
    copyFileToClinicServer,
    groupBy,
    writeToCsv,
    transferFileFromLocalHostToRemoteHost,
    readFilesFromDirectory,
    deleteFiles,
    readCSVFile,
    upsert,
    convertOriginAndDestinationWarehouse,
    objectToArray,
    copyFileToRelevantServer,
    makeDirectory,
    sendFile,
    generateCode4CharAZ
}