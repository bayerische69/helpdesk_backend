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
const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

if(process.env.NODE_ENV !== "production") {
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
}


app.use(cookieParser());
app.use(express.json());

app.use(rateLimiter)

// router (endpoints)
app.use("/api/v1", routes)


if(process.env.NODE_ENV === "production") {
app.use(express.static(path.join(__dirname, "../frontend/.next")));

app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname,"../frontend", ".next", "index.html"));
});
}



connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    })
})
