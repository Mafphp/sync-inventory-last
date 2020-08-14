
class IImport {
    constructor(id, totalPrice, no, invoice_no, payment_order_no, created_at) {
      this.id = id;
      this.totalPrice = totalPrice;
      this.no = no;
      this.invoice_no = invoice_no;
      this.payment_order_no = payment_order_no;
      this.created_at = created_at;
      this.fee = Math.round(totalPrice / no);
    }
  
    setFee(fee) {
      this.fee = fee;
      return this;
    }
  }
  
  
  module.exports = IImport;
  