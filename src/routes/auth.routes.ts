import { Router } from 'express';
import { wxLogin, getUserInfo, updateUserInfo } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/wxlogin', wxLogin);

// Protected routes
router.get('/user', authMiddleware, getUserInfo);
router.put('/user', authMiddleware, updateUserInfo);

export default router;
