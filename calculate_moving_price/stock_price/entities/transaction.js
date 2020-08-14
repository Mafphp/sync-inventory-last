const {generateCode4CharAZ} = require('../../../helpers');

class Transaction {
  constructor(id, sellerId, amount, originId, destId, productInstanceId, productPackageId, is_verified) {
    this.id = id;
    this.sellerId = sellerId;
    this.amount = amount;
    this.originId = originId;
    this.destId = destId;
    this.productInstanceId = productInstanceId;
    this.productPackageId = productPackageId;
    this.isVerified = is_verified;
  }

  async addOrGetProductInstance(productId, vendorId, expiryDate, productCode) {
    const Repository = require('../../repositories/importReopository');

    const productInstanceLastCode = await new Repository().lastProductInstanceCode(productId); // last code of product instance
    const code = `${productCode}-${generateCode4CharAZ(productInstanceLastCode)}`;

    let productInstance = await new Repository().getProductInstanceBasedOn(productId, vendorId, expiryDate);
    if (!productInstance) {
      productInstance = await new Repository().productInstanceAdded(productId, vendorId, expiryDate, code);
    }

    this.productInstanceId = productInstance.id;
  }

  async addTransaction() {
    const Repository = require('../../repositories/importReopository');
    return new Repository().stockTransactionAdded(this.productPackageId, this.productInstanceId, this.originId, this.destId, this.sellerId, this.amount, this.isVerified);
  }
}

module.exports = Transaction;