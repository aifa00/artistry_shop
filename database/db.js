import mongoose from "mongoose";
import logger from "../utils/logger.js";

const Connection = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
  } catch (error) {
    logger.log({
      level: "error",
      message: `db connection error ${error}`,
    });
  }
};

export default Connection;
