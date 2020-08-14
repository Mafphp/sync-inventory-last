const Warehouse = require('../../models/warehouse.model');

module.exports = class WarehouseRepository {
  constructor() {

  }
  async findPhysicals() {
    return Warehouse.model().findAll();
  }
  async getAll() {
    let res = (await Warehouse.model().findAll({
      order: ['name']
    })).map(x => x.get({plain: true}));

    return res;
  };
}
