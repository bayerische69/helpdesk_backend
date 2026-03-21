import rateLimit from "../config/upstash.js";
import User from "../models/userSchema.js";

const rateLimiter = async (req, res, next) => {

    try {
        const { success } = await rateLimit.limit();
        if (!success) {
            return res.status(429).json({
                message: "Too many requests, please try again later."
            })
        }
        next();
    } catch (error) {
        console.error("Rate Limiter Error:", error);

        next(error);
    }
}

export default rateLimiter;