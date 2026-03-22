import Admin from '../models/adminSchema.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import transporter from '../config/nodemailer.js';
import { generateVerificationCode } from '../utils/generateToken.js';
import { generateExpirationCode } from '../utils/otpGenerateExpiration.js';

export async function getAllAdmins(req, res) {
    try {

        const admins = await Admin.find();

        res.status(200).json(admins);
    } catch (error) {
        console.log("Error fetching admins: ", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function createAdmin(req, res) {
    const { name, email, username, password, confirmPassword } = req.body;

    if (!name || !email || !username || !password || !confirmPassword) {
        return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
    }
    
    try {

        const existingAdmin = await Admin.findOne({ $or: [ { email }, { username } ] });

        if (existingAdmin) {
            return res.status(400).json({ message: "Admin with given email or username already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = new Admin({
            name,
            email,
            username,
            password: hashedPassword
        });

        await newAdmin.save();


        const token = jwt.sign({id: newAdmin._id}, process.env.JWT_SECRET, { expiresIn: '7d' });

       res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
       })


       const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Welcome to HelpDesk Admin Portal',
            text: `Hello ${name},\n\nYour admin account has been successfully created.\n\nRegards,\nHelpDesk Team`
        };  
       

        await transporter.sendMail(mailOptions);

        res.status(201).json({ message: "Admin created successfully" });


    } catch (error) {
        console.log("Error creating admin: ", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function loginAdmin(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.json({ success: false, message: "Invalid Email" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.json({ success: false, message: "Invalid Password" });
        }

        // Generate JWT token
        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // 1️⃣ Secure HTTP-only cookie for backend API authentication
        res.cookie('token', token, {
            httpOnly: true,  // 🔒 cannot be read by JS, secure
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // 2️⃣ Non-HTTP-only cookie for Next.js middleware routing
        res.cookie('tokenForMiddleware', "true", {
            httpOnly: false, // 🔓 readable by middleware
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.json({ success: true, message: "Logged in successfully" });

    } catch (error) {
        console.log("Error logging in admin: ", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function logoutAdmin(req, res) {
    try {
        // Clear the secure HTTP-only JWT cookie
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Strict',
        });

        // Clear the middleware cookie (readable by Next.js)
        res.clearCookie('tokenForMiddleware', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        });

        return res.json({ success: true, message: "Logged out" });
    } catch (error) {
        console.log("Error logging out admin: ", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
export const sendVerifyOtp = async (req, res) => {
    try {

        const { userId } = req.body;

        const user = await Admin.findById(userId);

        if (user.isAccountVerified) {
            return res.json({ success: false, message: "Account already verified"})
        }
        
        const otp = generateVerificationCode();

        user.verifyOtp = otp;
        user.verifyOtpExpireAt = generateExpirationCode();
    
        await user.save();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Account Verification OTP',
            text: `Hello ${user.name},\n\nYour OTP for account verification is: ${otp}\nThis OTP is valid for 24 hours.\n\nRegards,\nHelpDesk Team`
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "OTP Sent Successfully"});
    } catch (error) {
        res.json({ success: false, message: "Error Sending OTP"})
    }
}

export const verifyEmail = async (req, res) => {
    const { userId, otp } = req.body;

    if(!userId || !otp) {
        return res.json({
            success: false,
            message: "All fields are required"
        })
    }

    try {
        const user = await Admin.findById(userId);

        if (!user) {
            return res.json({
                success: false,
                message: "Admin not found"
            })
        }

        if (user.verifyOtp === '' || user.verifyOtp !== otp) {
            return res.json({
                success: false,
                message: "Invalid OTP"
            })
        }

        if (user.verifyOtpExpireAt < Date.now()) {
            return res.json({
                success: false,
                message: "OTP Expired"
            })
        }

        user.isAccountVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExpireAt = 0;

        await user.save();

        return res.json({
            success: true,
            message: "Account verified successfully"
        })


    } catch (error) {
        return res.json({
            success: false,
            message: "Error verifying account"
        })
    }


}

export const isAuthenticated = async (req, res) => {
    try {
        return res.json({success: true, message: "User is authenticated"});
    } catch (error) {
        return res.json({success: false, message: "User is not authenticated"});
    }
}

export const sendResetOtp = async (req, res) => {
    const { email } = req.body;

    if(!email) {
        return res.json({
            success: false,
            message: "Email is required"
        })
    }

    try {

        const admin = await Admin.findOne({email});

        if (!admin) {
            return res.json({
                success: false,
                message: "Admin with this email does not exist"
            })
        }

        const otp = generateVerificationCode();

        admin.resetOtp = otp;
        admin.resetOtpExpireAt = Date.now() + 15 * 60 * 1000; // 15 minutes
    
        await admin.save();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: admin.email,
            subject: 'Password Reset OTP',
            text: `Your OTP for resetting your password is ${otp}. Use this OTP to proceed with resetting your password.`
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "OTP Sent Successfully"});



 
    } catch (error) {
        console.error("Error sending reset OTP: ", error);
        return res.json({
            success: false,
            message: "Error sending reset OTP"
        })
    }
}

export const resetPassword = async (req, res) => {
    const { email, otp, newPassword, confirmPassword} = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
        return res.json({
            success: false,
            message: "All fields are required"
        })
    }

    if (newPassword !== confirmPassword) {
        return res.json({
            success: false,
            message: "Passwords do not match"
        })
    }

    try {

        const user = await Admin.findOne({email});

        if (!user) {
            return res.json({
                success: false,
                message: "Admin with this email does not exist"
            })
        }

        if (user.resetOtp === '' || user.resetOtp !== otp) {
            return res.json({
                success: false,
                message: "Invalid OTP"
            })
        }

        if (user.resetOtpExpireAt < Date.now()) {
            return res.json({
                success: false,
                message: "OTP Expired"
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        user.resetOtp = '';
        user.resetOtpExpireAt = 0;

        await user.save();

    } catch (error) {
        return res.json({
            success: false,
            message: "Error resetting password"
        })
    }
}

export const changePassword = async (req, res) => {
    const { currentPassword, newPassword, confirmPassword, userId } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
            success: false,
            message: "All fields are required"
        });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({
            success: false,
            message: "Passwords do not match"
        });
    }

    try {
        // ✅ use userId from middleware
        const user = await Admin.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password);

        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: "New password must be different from current password"
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password updated successfully"
        });

    } catch (error) {
        console.error("Change password error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};