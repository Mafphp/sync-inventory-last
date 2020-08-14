class ITransactionAggregate {
    constructor(payload) {
        this.id = payload['id'] || null;
        if (payload) {
            ['id', 'entity_ext_id',
                'date_time',
                'amount',
                'is_verified',
                'created_at',
                'updated_at',
                'product_instance_id',
                'origin',
                'product',
                '_import',
                'priceQuote',
                'dest'
            ].forEach(key => {
                if (payload[key]) {
                    this[key] = payload[key];
                } else {
                    this[key] = null;
                }
            });
        }
    }
  
    async verify() {
      if (!this.id) throw new Error('transaction id  is not defined');
      const TransactionRepository = require('./transactionRepository');
      await new TransactionRepository().verified(this.id);
      if (!this.dest || !this.dest.id)
        throw new Error('transaction destination is not clear');
  
      if (!this.dest.is_logical && this.dest.is_entry)
        return this.updateStockPrice();
    }
  
  
    async unverify() {
      if (!this.id) throw new Error('transaction id is not defined');
  
      const TransactionRepository = require('./transactionRepository');
      let transRepo = new TransactionRepository()
      await transRepo.unverified(this.id);
      return transRepo.registerNewReject(this.id);
    }
  
    async updateStockPrice() {
  
      if (this.priceQuote && !this.priceQuote.price)
        throw new Error('the price quote of this receipt is still incomplete');
  
      const StockPriceRepo = require('./stockPriceRepository');
      const istockPrice = await new StockPriceRepo().loadLastPrice(this.product.id);
  
      if (istockPrice.id && !istockPrice.currentPrice) {
        if (!this.priceQuote.price)
          throw new Error('cannot verifiy receipt due to unknown price of product in warehouse')
        else
          istockPrice.currentPrice = this.priceQuote.price;
      }
  
      istockPrice.setInvestigatingTransaction(this.id);
  
      if (this.priceQuote) {
        return istockPrice.setPrice(this.amount, this.priceQuote.price, this.priceQuote.id, false)
  
      } else if (this._import) {
        return istockPrice.setPrice(this.amount, this._import.fee, this._import.id)
      } else {
        throw new Error('price quote or import are not found in order to receipt verification')
      }
    }
  }
  
  
  module.exports = ITransactionAggregate;
  