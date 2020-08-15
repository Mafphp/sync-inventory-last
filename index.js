const db = require('./models/index');
const cron = require("node-cron");
const express = require("express");
const path = require("path");
const {
  chain,
  PORT,
  center_name,
  clinics,
  sent_directory,
  isClinic,
  table_names,
  received_sync_directory,
  received_insert_directory,
  currentServer,
  aggregateServers,
  CENTRAL_WAREHOUSE_ID,
  EVERY_FEW_SECONDS
} = require('./consts');;
const {
  writeToCsv,
  readFilesFromDirectory,
  deleteFiles,
  readCSVFile,
  upsert,
  convertOriginAndDestinationWarehouse,
  objectToArray,
  makeDirectory,
  sendFile
} = require('./helpers');;
const app = express();
const logger = require("./logger").Logger;


// NEW FUNCTIONS
const getTablesNeedToSyncToRelevantServer = async ({origin = {}, destination = []}) => {
  const servers = [];
  for (let index = 0; index < destination.length; index++) {
    const server = destination[index];
    const tables = {};
    // read table_names from consts files
    table_names.forEach(table => {
      tables[table] = [];
    });
    servers.push({
      name: server.server_name.toLowerCase(),
      port: server.port,
      user: server.user,
      warehouse_id: server.warehouse_id,
      host: server.host,
      tables: tables
    });
  }
 
  // get data from sync_queue
  for (let index = 0; index < servers.length; index++) {
    const server = servers[index];
    const queries = [];
    Object.keys(server.tables).forEach(table => {
      const query = db.sequelize().query(
        `select * from ${table} where id in (select record_id from sync_queue where sent_at is null and table_name = '${table}' and warehouse_id = '${server.warehouse_id}')`
      );
      queries.push(query);
    });
    const result = await Promise.all(queries);
    Object.keys(server.tables).forEach((key, index) => {
      server.tables[key] = result[index][0];
    });
  }

  /**
   * read records of tables for each server
   */
  // loop on servers
  const now = Date.now();
  for (let index = 0; index < servers.length; index++) {
    const server = servers[index];
    // loop on tables
    for (let index = 0; index < table_names.length; index++) {
      const table_name = table_names[index];
      let table_data = server.tables[table_name];
      const file_name = `${currentServer.server_name.toLowerCase()}-${server.name.toLowerCase()}-${table_name}-${now}.csv`
      convertOriginAndDestinationWarehouse(table_data, table_name, server.warehouse_id, server.name);
      // START transfer between two warehouse
      if (table_name === 'stock_transaction' && !isClinic) {
        const clinicsArray = objectToArray(clinics);
        const clinicsIds = clinicsArray.map(x => x.warehouse_id);
        table_data.forEach(x => {
          if (clinicsIds.includes(x.origin_id) && clinicsIds.includes(x.dest_id)) {
            ['origin_id', 'dest_id'].forEach(key => {
              if (x[key] !== server.warehouse_id) {
                x[key] = aggregateServers['CHAIN'].warehouse_id;
              } else {
                x[key] = CENTRAL_WAREHOUSE_ID;
              }
            });
          }
        });
      }
      // END transfer between two warehouse
      await writeToCsv(table_data, sent_directory, file_name)
    }
  }

  // scp files into server (CLINIC)
  const sent_directory_files = await readFilesFromDirectory(sent_directory);
  for (let index = 0; index < servers.length; index++) {
    const server = servers[index];
    const related_files_to_server = sent_directory_files.filter(x => server.name.toLowerCase() === path.basename(x).split('-')[1].toLowerCase());
    for (let index = 0; index < related_files_to_server.length; index++) {
      const file_path = related_files_to_server[index];
      const file_name =  path.basename(file_path);
      // send_file_path
      const send_file_path = file_path;
      // destination_name
      const destination_name = file_name.split('-')[1];
      // destination_file_name
      const destination_file_name = file_name;
      // destination_directory
      const destination_directory = received_insert_directory;
      try {
        const data = await sendFile({send_file_path, destination_file_name, destination_directory, destination_name});
        if (data && data.length) {
          // await deleteFiles([file_path])
          await Promise.all(data.map(x => db.sequelize().query(`update sync_queue set sent_at = current_timestamp where record_id = '${x.id}' and warehouse_id = '${server.warehouse_id}'`)));
        }
        await deleteFiles([send_file_path])
      } catch (error) {
        await deleteFiles([send_file_path])
        console.error(`${server.name}, ${path.basename(file_path).split('-')[2]}=> an error occurred on transferring files`);
        logger.error(`${server.name}, ${path.basename(file_path).split('-')[2]}=> an error occurred on transferring files`);
      }
    }
  }
  return sent_directory_files.length;
}
const readDirectoryFilesAndUpdateSyncAt = async (sync_directory_path) => {
  // read directory received
  const received_sync_directory_files = await readFilesFromDirectory(sync_directory_path);
  for (let index = 0; index < received_sync_directory_files.length; index++) {
    const file_path = received_sync_directory_files[index];
    try {
      const data = await readCSVFile(file_path);
      await Promise.all(data.map(x => db.sequelize().query(`update sync_queue set synced_at = current_timestamp where record_id = '${x.id}' and warehouse_id = '${x.warehouse_id}'`)));
      await deleteFiles([file_path])
    } catch (error) {
      console.error('an error occurred during read received directory');
    }
  }
  return received_sync_directory_files.length;
}
const readDirectoryFilesAndInsertRecords = async (insert_directory_path) => {
  const received_directory_files = await readFilesFromDirectory(insert_directory_path);
  let sort_tables_for_insert = [];
  table_names.forEach(table_name => {
    const items = received_directory_files.filter(x => path.basename(x).split('-')[2].toLowerCase() === table_name.toLowerCase());
    items.sort((a, b) => path.basename(a).split('-')[3] - path.basename(b).split('-')[3]);
    sort_tables_for_insert = sort_tables_for_insert.concat(items);
  });
  for (let index = 0; index < sort_tables_for_insert.length; index++) {
    const queries = [];
    const received_file_path = sort_tables_for_insert[index];
    const table = path.basename(received_file_path).split('-')[2].toLowerCase();
    const data = await readCSVFile(received_file_path);
    data.forEach(value => {
      queries.push(upsert({...value, data_json: value['data_json'] && JSON.parse(value['data_json'])}, {id: value.id}, table));
    });
    const result = await Promise.all(queries);
    const file_name = `${center_name}-${path.basename(received_file_path).split('-')[0]}-sync_queue-${Date.now()}.csv`
    // const path_file = path.join(__dirname, sent_directory, file_name);
    await writeToCsv(result.map(x => ({id: x, warehouse_id: currentServer.warehouse_id})), sent_directory, file_name);
    // scp file
    const sent_directory_files = await readFilesFromDirectory(sent_directory);
    for (let index = 0; index < sent_directory_files.length; index++) {
      const file_path = sent_directory_files[index];
      const file_name =  path.basename(file_path);
      // send_file_path
      const send_file_path = file_path;
      // destination_name
      const destination_name = file_name.split('-')[1];
      // destination_file_name
      const destination_file_name = file_name;
      // destination_directory
      const destination_directory = received_sync_directory;
      try {
        const data = await sendFile({send_file_path, destination_file_name, destination_directory, destination_name});
        if (data && data.length) {
          await deleteFiles([received_file_path]);
          await deleteFiles([send_file_path]);
        }
      } catch (error) {
        console.error(`could not send send file to ${destination_name}`);
        logger.error(`could not send send file to ${destination_name}`);
        await deleteFiles([send_file_path]);
      }
    }

  }
  return received_directory_files.length;
}

let isInit = true;
const initDirectory = async () => {
  makeDirectory(sent_directory);
  makeDirectory(received_insert_directory);
  makeDirectory(received_sync_directory);
}

// schedule tasks to be run on the server
cron.schedule(`*/${EVERY_FEW_SECONDS} * * * * *`, async function() {
  if (isInit) {
    await initDirectory();
    db.useMainDB();
    await db.isReady();
    isInit = false;
  }
  try {
    if (isClinic) {
      console.log(`***** CLINIC cron-job started running at: ${new Date()}`);
      const sync_files_count = await readDirectoryFilesAndUpdateSyncAt(received_sync_directory);
      console.log(`${sync_files_count} files synced`);
      const insert_files_count = await readDirectoryFilesAndInsertRecords(received_insert_directory);
      console.log(`${insert_files_count} files inserted`);
      const sent_files_count = await getTablesNeedToSyncToRelevantServer({origin: currentServer, destination: objectToArray(chain)});
      console.log(`${sent_files_count} files sents`);
      console.log(`***** CLINIC cron-job finished at: ${new Date()}`);
    }
    if (!isClinic) {
      console.log(`***** CHAIN cron-job started running at: ${new Date()}`);
      const sync_files_count = await readDirectoryFilesAndUpdateSyncAt(received_sync_directory);
      console.log(`${sync_files_count} files synced`);
      const insert_files_count = await readDirectoryFilesAndInsertRecords(received_insert_directory);
      console.log(`${insert_files_count} files inserted`);
      const sent_files_count = await getTablesNeedToSyncToRelevantServer({origin: currentServer, destination: objectToArray(clinics)});
      console.log(`${sent_files_count} files sents`);
      console.log(`***** CHAIN cron-job finished at: ${new Date()}`);
    }
  } catch (err) {
      logger.error(err);
      console.error(err)
  }
})


app.listen(PORT, () => console.log(`${center_name} listen to port ${PORT}`));
