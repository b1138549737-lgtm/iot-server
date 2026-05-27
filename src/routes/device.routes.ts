import { Router } from 'express';
import {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  controlDevice,
  getDeviceStatus,
} from '../controllers/device.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', getDevices);
router.get('/:id', getDevice);
router.post('/', createDevice);
router.put('/:id', updateDevice);
router.delete('/:id', deleteDevice);
router.post('/:id/control', controlDevice);
router.get('/:id/status', getDeviceStatus);

export default router;
