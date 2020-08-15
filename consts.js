const defaultWarehouses = {
    CONSUMPTION: {
      id: 'bc126be5-adb7-48ca-b0e4-168c1937933d',
      name: 'Consumption',
      is_logical: true,
      is_chain: false,
    },
    PURCHASE: {
      id: '43acb9f2-a79a-4120-9935-660fd96921a0',
      name: 'Purchase',
      is_logical: true,
      is_source: true,
      is_not_purchase: false,
      is_chain: false,
    },
    LOSS: {
      id: 'd837a204-348a-467c-8fb9-e5b4f2d4cfb6',
      name: 'Loss',
      is_logical: true,
      is_lack_reason: true,
      is_chain: false,
    },
    DAMAGE: {
      id:  '89e2a6bd-482d-4c05-b51f-afa70a92dbf7',
      name: 'Damage',
      is_logical: true,
      is_entry: true,
      is_chain: false,
    },
    EXPIRED_GOODS: {
      id: 'b5e4c8aa-df74-42ae-ab96-27c0928c3736',
      name: 'Expired Goods',
      is_logical: true,
      is_lack_reason: true,
      is_chain: false,
    },
    CENTRAL_WAREHOUSE: {
      id: '6aac9d2a-0bf6-493a-b89a-6104334ba1f1',
      name: 'Central Warehouse',
      is_logical: false,
      is_entry: true,
      is_chain: false,
    },
    BENCH_STOCK: {
      id: 'afa71db0-06eb-4050-9251-d3d132559393',
      name: 'Bench Stock',
      is_logical: false,
      is_consumption_origin: true,
      is_chain: false,
    },
    INVENTORY_TAKING: {
      id: '9aa99460-515f-4815-a119-dcdb3d209f5a',
      name: 'Inventory Taking',
      is_logical: true,
      is_chain: false,
    },
    MISTAKE: {
      id: '28cb8026-5e8a-11e9-8647-d663bd873d93',
      name: 'Mistake',
      is_logical: true,
      is_extra_reason: true,
      is_chain: false,
    },
    FOUND: {
      id: '50fd0863-3dc8-46c1-82a4-bce5cfa35777',
      name: 'Found',
      is_source: true,
      is_logical: true,
      is_chain: false,
    },
    CHARITY: {
      id: '37702f60-6649-4e04-9698-328ba6cf5703',
      name: 'Charity',
      is_source: true,
      is_logical: true,
      is_chain: false,
    },
    OTHERS: {
      id: '2300b27f-a5d2-4687-a47a-5944a44a7c40',
      name: 'Others',
      is_source: true,
      is_logical: true,
      is_extra_reason: true,
      is_chain: false,
    },
    DISCOUNT: {
      id: '6d021a2a-1fdc-11ea-a5e8-2e728ce88125',
      name: 'Discount',
      is_source: true,
      is_logical: true,
      is_chain: false,
    },
    COMMODITY_WARD: {
      id: '0d17e396-1fdd-11ea-978f-2e728ce88125',
      name: 'Commodity ward',
      is_source: true,
      is_logical: true,
      is_chain: false,
    },
  }; 

  require('dotenv').config();

const center_name = process.env.NAME_OF_CENTER;
const sent_directory = process.env.SENT_DIRECTORY;
const received_insert_directory = process.env.RECEIVED_INSERT_DIRECTORY;
const received_sync_directory = process.env.RECEIVED_SYNC_DIRECTORY;
const isClinic = process.env.IS_CLINIC === 'true' ? true : false;
const scp_enabled = process.env.IS_SCP === 'true' ? true : false;
const EVERY_FEW_SECONDS = process.env.EVERY_FEW_SECONDS || 20;
const PORT = process.env.PORT || '3500';
const table_names = ['vendor', 'seller', 'product_unit', 'product_type', 'product', 'product_package', 'product_instance', 'stock_transaction', 'import', 'stock_price', 'price_quote', 'inventory_taking', 'sync_queue'];

const clinics = {
    "BEHAFARIN": {
        "host": process.env.BEHAFARIN_HOST,
        "port": process.env.BEHAFARIN_PORT,
        "user": process.env.BEHAFARIN_USER,
        "password": process.env.BEHAFARIN_PASSWORD,
        "name": "BEHAFARIN",
        "warehouse_id": "38df3d75-7b0e-477c-a0c8-cfe911ad0499"
    },
    "GOLSHAHR": {
        "host": process.env.GOLSHAHR_HOST,
        "port": process.env.GOLSHAHR_PORT,
        "user": process.env.GOLSHAHR_USER,
        "password": process.env.GOLSHAHR_PASSWORD,
        "name": "GOLSHAHR",
        "warehouse_id": "7bea89aa-3a38-4892-a998-8d35ede52100",
    },
    "MOHAMMADSHAHR": {
        "host": process.env.MOHAMMADSHAHR_HOST,
        "port": process.env.MOHAMMADSHAHR_PORT,
        "user": process.env.MOHAMMADSHAHR_USER,
        "password": process.env.MOHAMMADSHAHR_PASSWORD,
        "name": "MOHAMMADSHAHR",
        "warehouse_id": "56a5c302-e70e-429e-9339-faee61877336",
    },
    "FARDIS": {
        "host": process.env.FARDIS_HOST,
        "port": process.env.FARDIS_PORT,
        "user": process.env.FARDIS_USER,
        "password": process.env.FARDIS_PASSWORD,
        "name": "FARDIS",
        "warehouse_id": "b39f6509-1f2e-49c2-9cd6-24fc15cf82de",
    },
    "AMOL": {
        "host": process.env.AMOL_HOST,
        "port": process.env.AMOL_PORT,
        "user": process.env.AMOL_USER,
        "password": process.env.AMOL_PASSWORD,
        "name": "AMOL",
        "warehouse_id": "d148b18c-8984-46e6-95fe-524b3ac599ef",
    }
}

const chain = {
    "CHAIN": {
        "host": process.env.CHAIN_HOST,
        "port": process.env.CHAIN_PORT,
        "user": process.env.CHAIN_USER,
        "password": process.env.CHAIN_PASSWORD,
        "name": "Chain Center",
        "warehouse_id": "93e81237-1e9a-40df-a0aa-1c1cb87412a1",
    }
}

const CENTRAL_WAREHOUSE_ID = '6aac9d2a-0bf6-493a-b89a-6104334ba1f1';
const BENCH_STOCK_ID = 'afa71db0-06eb-4050-9251-d3d132559393';
const CONSUMPTION_ID = 'bc126be5-adb7-48ca-b0e4-168c1937933d';

const aggregateServers = {...clinics,...chain};
const currentServer = {server_name: center_name.toLowerCase(), ...aggregateServers[center_name.toUpperCase()]};
module.exports = {
    center_name,
    sent_directory,
    received_insert_directory,
    received_sync_directory,
    isClinic,
    PORT,
    clinics,
    chain,
    table_names,
    currentServer,
    aggregateServers,
    scp_enabled,
    BENCH_STOCK_ID,
    CENTRAL_WAREHOUSE_ID,
    CONSUMPTION_ID,
    EVERY_FEW_SECONDS,
    defaultWarehouses
}