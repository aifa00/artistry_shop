import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    products: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true,
            },
            status: {
                type: String,
                enum: ['Processing', 'Shipped', 'Delivered', 'Pending', 'Cancelled'],
                default: 'Processing',
            },
            returnRequested: {
                type: String,
                enum: ['Nil', 'Initiated',  'Pending', 'Approved', 'Rejected', 'Completed'],
                default: 'Nil',
            },
        },
    ],
    totalAmount: {
        type: Number,
        required: true,
    },  
    walletAmtUsed: {
        type: Number,
        default: 0,
    },    
    deliveryAddress: {
        type: {
            _id: mongoose.Schema.Types.ObjectId,
            user: mongoose.Schema.Types.ObjectId,
            name:String,
            phone:Number,
            pincode: Number,
            area: String,
            building: String,
            state: String,
            city: String,
            default: Boolean,
            softDeleted: Boolean,
            __v: Number
        },
        ref: 'Address',
    },
    orderDate: {
        type: Date,
        default: Date.now,
    },
    deliveryDate: {
        type: Date,
    },
    paymentMethod: {
        type: String,
        required: true
    },
    razorpayOrderId: {
        type: String,
    },
    transactionId: {
        type: String,//razorpay payment id
    },
    couponApplied: {
        couponId: {
            type: mongoose.Types.ObjectId,
            ref: 'Coupon'
        },
        discount: {
            type: Number,
        }
    },
    offerDiscount: {
        type: Number,
    },
    
   
});

//pre-save hook to calculate the delivery date
orderSchema.pre('save', function (next) {

    const orderDate = this.orderDate;

    const deliveryDate = new Date(orderDate);

    deliveryDate.setDate(deliveryDate.getDate() + 7);
    
    this.deliveryDate = deliveryDate;

    next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;