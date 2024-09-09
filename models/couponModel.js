import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
  },
  discountType: {
    type: String,
    enum: ["percentage", "fixedAmount"],
    required: true,
  },
  discountAmount: {
    type: Number,
    required: true,
  },
  minPurchaseAmount: {
    type: Number,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  expirationDate: {
    type: Date,
    required: true,
  },
  usageLimit: {
    type: Number,
    required: true,
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

couponSchema.pre("save", function (next) {
  const currentDate = new Date();

  if (this.usedCount >= this.usageLimit) {
    this.isActive = false;
  } else {
    this.isActive = true;
  }

  next();
});

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
