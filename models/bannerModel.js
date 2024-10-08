import mongoose from "mongoose";

const bannerSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["hero-banner", "featured-banner"],
    required: true,
  },
  image: {
    type: String,
  },
  url: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
});

const Banner = mongoose.model("Banner", bannerSchema);

export default Banner;
