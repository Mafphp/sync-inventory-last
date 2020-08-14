const Sequelize = require('sequelize');

let SyncQueue;
const init = (seq) => {
    SyncQueue = seq.define('sync_queue', {
        id: {
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
        },
        table_name: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        record_id: {
            type: Sequelize.UUID,
            allowNull: false,
        },
        warehouse_id: {
            type: Sequelize.UUID,
            allowNull: false,
        },
        sent_at: {
            type: Sequelize.DATE,
            defaultValue: null,
            allowNull: true,
        },
        synced_at: {
            type: Sequelize.DATE,
            defaultValue: null,
            allowNull: true,
        },
        is_update: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            allowNull: true,
        },
        is_delete: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            allowNull: true,
        },
    }, {
        tableName: 'sync_queue',
        timestamps: true,
        underscored: true,
    });
};

const makeRelations = async () => {
}

module.exports = {
    init,
    model: () => SyncQueue,
    makeRelations
};