import express from 'express';
import userRoutes from './userRoutes.js';
import adminRoutes from './adminRoutes.js';
import ticketRoutes from './ticketRoutes.js';

const router = express.Router();

router.use('/tickets', ticketRoutes)
router.use('/users', userRoutes)
router.use('/admin', adminRoutes)

export default router;