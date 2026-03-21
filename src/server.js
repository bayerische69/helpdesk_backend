import express from 'express';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { connectDB } from './config/db.js';
import { connect } from 'mongoose';
import cookieParser from 'cookie-parser';
import rateLimiter from './middleware/rateLimiter.js';
import cors from "cors";
import path from 'path';

dotenv.config();

const app = express();


app.use(cors({
    origin: [process.env.CORS_ORIGIN, process.env.CORS_ORIGIN_DEV],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],    
    credentials: true
}));


const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

app.use(cookieParser());
app.use(express.json());

app.use(rateLimiter)

// router (endpoints)
app.use("/api/v1", routes)


connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    })
})
