import mongoose from "mongoose";

const userOTPVerificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    otp: {
        type: String, 
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
    },
});

// pre-save hook to calculate the expiry time
userOTPVerificationSchema.pre('save', function (next) {
    const createdAt = this.createdAt;
    const expiresAt = new Date(createdAt);
    expiresAt.setMinutes(expiresAt.getMinutes() + 2);
    this.expiresAt = expiresAt;

    next();
});

const UserOTPVerification = mongoose.model("UserOTPVerification", userOTPVerificationSchema);

export default UserOTPVerification;