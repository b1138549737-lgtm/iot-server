import { Router } from 'express';
import {
  getSensorData,
  getLatestSensorData,
  getSensorStats,
} from '../controllers/sensor.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/:deviceId', getSensorData);
router.get('/:deviceId/latest', getLatestSensorData);
router.get('/:deviceId/stats', getSensorStats);

export default router;
