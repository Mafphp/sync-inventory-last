class IWarehouse {
    constructor(payload) {
      this.id = payload['id'] || null;
      if (payload) {
        ['id',
          'name',
          'is_logical',
          'is_consumption_origin',
          'is_entry',
          'is_source',
          'is_not_purchase',
          'is_lack_reason',
          'is_extra_reason',
          'clerk_id'
        ].forEach(key => {
          if (payload[key]) {
            this[key] = payload[key];
          } else {
            this[key] = null;
          }
        })
      }
  
    }
  
  
  }
  
  
  module.exports = IWarehouse;