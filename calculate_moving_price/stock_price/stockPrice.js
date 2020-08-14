
class IStockPrice {
    constructor(productId, id, currentTransId, currentPrice, importId, priceQuoteId) {
      this.id = id;
      this.productId = productId;
      this.currentTransId = currentTransId;
      this.currentPrice = currentPrice;
      this.investigatingTransId = currentTransId;
      this.currentImportId = importId;
      this.currentPriceQuoteId = priceQuoteId;
  
      if (!productId)
        throw new Error('product id is required to use stock price')
  
      if (this.id && !this.currentTransId)
        throw new Error('invalid info of last stock price for product');
  
      if (this.id && priceQuoteId && importId)
        throw new Error('stock price record can not be derived from both import and price quote');
  
      if (this.id && !priceQuoteId && !importId)
        throw new Error('stock price record must be derived from import or price quote');
  
    }
  
    getRepo() {
      const StockPriceRepo = require('./stockPriceRepository');
      return new StockPriceRepo();
    }
  
    setInvestigatingTransaction(transId) {
      this.investigatingTransId = transId;
    }
  
    async setUnknownPrice(priceQuoteId) {
  
      return this.getRepo().setUnknownPrice(this.id, this.investigatingTransId, this.productId, priceQuoteId);
    }
  
    async setPrice(newStock, price, sourceId, isImport = true) {
  
      if (!sourceId)
        throw new Error('source of stock change is not clear');
  
      if (price < 0 || (isImport && !price))
        throw new Error('new price of product is not valid');
  
      if (!this.investigatingTransId)
        throw new Error('transaction id of stock price is not clear');
  
      if (this.currentPriceQuoteId && !this.currentPrice && !isImport && !price)
        throw new Error('there is another unknown stock price for this price quote')
  
      await this.calculateCurrentStock();
  
      if (sourceId && !isImport && !price)
        return this.setUnknownPrice(sourceId);
  
      this.newPrice = price;
  
      if (this.id) {
        if (this.currentPrice === null || (!newStock && this.investigatingTransId === this.currentTransId)) {
          if (this.investigatingTransId !== this.currentTransId)
            throw new Error('updating stock price with invalid transaction id');
          return this.getRepo().updatePrice(this.id, this.newPrice);
        } else if (this.currentPrice && this.investigatingTransId === this.currentTransId) {
          return this.getRepo().updatePrice(this.id, this.newPrice);
        } else {
            if (this.investigatingTransId === this.currentTransId)
            throw new Error('adding stock price with existing trans id');
  
            if (!newStock || newStock < 0)
            throw new Error('invalid new stock');
  
          this.newPrice = Math.round(((this.currentPrice * this.currentStock) + (newStock * this.newPrice)) / (this.currentStock + newStock));
          return this.getRepo().addNewPrice(this.investigatingTransId, this.productId, this.newPrice, sourceId, isImport);
        }
      } else {
        return this.getRepo().addNewPrice(this.investigatingTransId, this.productId, this.newPrice, sourceId, isImport);
      }
  
    }
  
    async calculateCurrentStock() {
      const InspectionRepo = require('./inspectionRepository');
      const SharedWarehouseRepo = require('./warehouseRepository');
  
      if (!this.investigatingTransId)
        throw new Error('investigating id is not clear to calculate stock for')
  
      const warehouses = (await new SharedWarehouseRepo().getAll()).filter(x => !x.is_logical);
  
      this.currentStock = 0;
      for (let i = 0; i < warehouses.length; i++) {
        const inspection = new InspectionRepo({
          productId: this.productId,
          warehouseId: warehouses[i].id
        });
        this.currentStock += (await inspection.calculateStock(this.investigatingTransId)).amount || 0;
      }
    }
  
  }
  
  
  module.exports = IStockPrice;
  