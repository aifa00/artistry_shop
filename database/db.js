import mongoose from "mongoose";
import logger from "../utils/logger.js";


const Connection = async () => {
    try {
        const dbConnect = await mongoose.connect(process.env.MONGODB_URL);        
        logger.info("db connected successfully");
    } catch (error) {
        logger.log({
            level: 'error',
            message: `db connection error ${error}`
        });
    }
};

export default Connection;