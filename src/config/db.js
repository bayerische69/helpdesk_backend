import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        mongoose.connect(process.env.MONGO_URI)
        console.log("Database Connected Successfully")
    } catch (error) {
        console.log("Error Connection to Database: ", error)
        process.exit(1); // Exit process with failure
    }
}