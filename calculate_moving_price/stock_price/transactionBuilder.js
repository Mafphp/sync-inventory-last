const TransactionAggregate = require('./transactionAggregate');
class TransactionBuilder {
    constructor(payload) {
        this.id = payload['id'] || null;
        if (payload) {
            ['id','entity_ext_id',
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

    setTransactionId(id) {
        this.id = id;
        return this;
    }

    setAmount(amount) {
        this.amount = amount;
        return this;
    }

    setOriginWarehouse(origin) {
        this.origin = origin;
        return this;
    }

    setDestinationWarehouse(dest) {
        this.dest = dest;
        return this;
    }

    setProduct(product) {
        this.product = product;
        return this;
    }
    
    setPriceQuote(priceQuote) {
        this.priceQuote = priceQuote;
        return this;
    }

    setImport(_import) {
        this._import = _import;
        return this;
    }

    build() {
        return new TransactionAggregate(this);
    }
}


module.exports = TransactionBuilder;