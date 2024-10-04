import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    unique: true,
    required: true,
  },
  description: {
    type: String,
    required: true,
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
    ref: "Category",
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
    default: false,
  },
});

const Product = mongoose.model("Product", productSchema);

export default Product;
