class IPriceQuote {
    constructor(id, price, is_preferred) {
      this.id = id || null;
      this.price = price || null;
      this.is_preferred = is_preferred || false;
    }
  }
  
  
  module.exports =  IPriceQuote;
  