import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        minLength: 3,
        maxLength: 60,
        validate: {
            validator: function(value) {
                return /^[A-Za-z0-9\s]+$/.test(value);     
            },
            message: 'Product name must not contain special characters'
        },
        unique: true,
        required: true,
    },
    description: {
        type: String,
        minLength: 5,
        maxLength: 200,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 1,
    },
    stock: {
        type: Number,
        required: true,
    },
    images: [String],
    artist: {
        type: String,
        required: true,
    },
    color: {
        type: String,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
    },
    offerPercentage: {
        type: Number,
        default: 0,
    },
    offerValidUpto: {
        type: Date,
    },
    isOfferActive: {
        type: Boolean,
        default: false,
    },
    softDeleted: {
        type: Boolean,
        default: false
    },
    
});

const Product = mongoose.model('Product', productSchema);

export default Product;