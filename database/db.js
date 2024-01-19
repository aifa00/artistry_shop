import mongoose from "mongoose";

const Connection = async () => {
    try {
        const dbConnect = await mongoose.connect(process.env.MONGODB_URL);
        console.log('db connected successfully');
    } catch (error) {
        console.error('db connection error', error);
    }
};

export default Connection;