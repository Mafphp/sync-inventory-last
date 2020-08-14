const StockTransactionRepository = require('./stock_price/transactionRepository');
const TransactionBuilder = require('./stock_price/transactionBuilder');

class SetTransactionAsVerified {
    constructor() {
        this.transactionBuilder;
    }

    async verify(transaction_id) {
        if (!transaction_id) throw new Error('transaction id is required');

        let transaction = await new StockTransactionRepository().getTransactionById(transaction_id);
        if (!transaction || !transaction.id) {
            throw new Error('transaction with this information does not exist');
        }


        this.transactionBuilder = new TransactionBuilder(transaction);

        // loading product with product_instance_id in transaction
        await this.loadingProduct();
        // entering from purchase
        await this.transactionEnteringFromPurchase();
        // entering from others
        await this.transactionEnteringFromOther();
        // internal removal
        await this.transactionInternalRemoval();

        this.transactionBuilder = this.transactionBuilder.build();
        return this.transactionBuilder.verify();
    }

    async transactionEnteringFromPurchase() {
        const {
            id,
            amount
        } = this.transactionBuilder;
        const importModel = await new StockTransactionRepository().getImportByTransactionId(id);
        if (importModel && importModel['id'] && importModel['invoice_no']) {
            const {
                totalPrice
            } = importModel;
            importModel.setFee(Math.round(totalPrice / amount));
            this.transactionBuilder.setImport(importModel);
        }
    }

    async transactionEnteringFromOther() {
        const {
            id
        } = this.transactionBuilder;
        const importModel = await new StockTransactionRepository().getImportByTransactionId(id);

        if (importModel && !importModel['invoice_no']) {
            this.transactionBuilder.setImport(null);
            // check price quote define for this product_id
            await this.checkPriceQuote();
        }
    }

    async transactionInternalRemoval() {
        const {
            id
        } = this.transactionBuilder;
        const importModel = await new StockTransactionRepository().getImportByTransactionId(id);
        if (importModel && !importModel['id']) {
            this.transactionBuilder.setImport(null);
        }
    }

    async loadingProduct() {
        const productModel = await new StockTransactionRepository().getProductByInstanceId(this.transactionBuilder['product_instance_id']);
        if (!productModel && !productModel['id']) {
            throw new Error('not found any product with this product instance id');
        }
        this.transactionBuilder.setProduct(productModel);
    }

    async checkPriceQuote() {
        const {
            product,
            dest
        } = this.transactionBuilder;
        if (!dest['is_entry']) return;
        const priceQuoteModel = await new StockTransactionRepository().getPriceQuoteOfProduct(product['id']);
        if (priceQuoteModel && !priceQuoteModel['id']) {
            throw new Error('the price quote of this receipt is still unpreferred');
        }
        this.transactionBuilder.setPriceQuote(priceQuoteModel);
    }
}

module.exports = SetTransactionAsVerified;