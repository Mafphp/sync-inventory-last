require('dotenv').config();
const center_name = process.env.NAME_OF_CENTER;
const sent_directory = process.env.SENT_DIRECTORY;
const received_insert_directory = process.env.RECEIVED_INSERT_DIRECTORY;
const received_sync_directory = process.env.RECEIVED_SYNC_DIRECTORY;
const isClinic = process.env.IS_CLINIC === 'true' ? true : false;
const scp_enabled = process.env.IS_SCP === 'true' ? true : false;
const EVERY_FEW_SECONDS = process.env.EVERY_FEW_SECONDS || 20;
const PORT = process.env.PORT || '3500';
const config = {
    database: process.env.DATABASE,
    username: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASS,
    dialect: "postgres",
    port: process.env.DB_PORT
}

module.exports = {
    center_name,
    sent_directory,
    received_insert_directory,
    received_sync_directory,
    isClinic,
    PORT,
    scp_enabled,
    EVERY_FEW_SECONDS,
    config
}