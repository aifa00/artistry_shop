import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    minLength: 3,
    maxLength: 20,
    validate: {
      validator: function (value) {
        return /^[a-zA-Z0-9\s]+$/.test(value);
      },
      message: "Category name must not contain special characters",
    },
    unique: true,
    required: true,
  },
  image: String,
  productsCount: {
    type: Number,
    default: 0,
  },
  offerPercentage: {
    type: Number,
  },
  offerValidUpto: {
    type: Date,
  },
  isOfferActive: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});
categorySchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", caseLevel: true } }
);

const Category = mongoose.model("Category", categorySchema);

export default Category;
