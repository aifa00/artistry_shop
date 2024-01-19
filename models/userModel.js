
import mongoose from 'mongoose';

// Declare the Schema of the user model
const userSchema = new mongoose.Schema({
    name: {
        required: true,
        type: String,
        maxLength:25
    },
    email: {
        required: true,
        type: String,
        unique: true,
        maxLength: 25,
    },
    phone: {
        required: true,
        type: Number,
        unique:true,
        minLength:10,
        maxLength:10,
    },
    password: {
        required: true,
        type: String,
        minLength: 6,
    },
    profile: {
        type: String,
        default: '',
    },
    verified: {
        type: Boolean,
        default: false
    },
    blocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    wishlist: [
        { 
            type: mongoose.Types.ObjectId,
            ref: 'Product'
        }
    ],
    cart: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
            },
            quantity: {
                type: Number,
                default: 1
            },
        },
    ],
    earnedCoupons: [
        {
            coupon: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Coupon'
            },
            isUsed: {
                type: Boolean,
                default: false,
            },
        },
    ],
    wallet: {
        balance: {
            type: Number,
            default: 0,
        },
        transactions: [{
            amount: {
                type: Number,
                required: true,
            },
            description: {
                type: String,
                required: true,
            },
            type: {
                type: String,
                enum:['Debit', 'Credit'],
                required: true,
            },
            timestamp: {
                type: Date,
                default: Date.now(),
            }
        }],
    },
    referralCode: {
        type: String,        
        unique: true,
    },
    referrer: {
        type: String,
    },

});



// Function to generate a referral code
async function generateReferralCode(length) {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let referralCode = "";

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        referralCode += charset.charAt(randomIndex);
    }

    const existingUser = await User.findOne({ referralCode });
    
    // If another user with the same referral code exists, regenerate another code
    if (existingUser) {
        return generateReferralCode(length);
    }

    return referralCode;
}

// Pre-save hook to generate referral code
userSchema.pre('save', async function (next) {

    // Only generate a referral code if it doesn't exist
    if (!this.referralCode) {
        this.referralCode = await generateReferralCode(7);
    }
    next();
});




//Export the model
const User = mongoose.model('User', userSchema);

export default User;