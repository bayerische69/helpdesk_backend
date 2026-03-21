import express from 'express';
import { createAdmin, loginAdmin, logoutAdmin, getAllAdmins, sendVerifyOtp, verifyEmail, isAuthenticated, sendResetOtp, resetPassword, changePassword } from '../controllers/adminController.js';
import userAuth from '../middleware/adminAuth.js';

const router = express.Router();

router.get('/', getAllAdmins)
router.post('/register', createAdmin);
router.post ('/login', loginAdmin);
router.post('/logout', logoutAdmin);
router.post('/send-verify-otp', userAuth, sendVerifyOtp);
router.post('/verify-otp', userAuth, verifyEmail);
router.post('/is-auth', userAuth, isAuthenticated);
router.post('/send-reset-otp', sendResetOtp)
router.post('/reset-password', resetPassword);
router.put('/password/update', userAuth, changePassword)

export default router;

