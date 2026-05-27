import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { connectMQTT } from './config/mqtt';
import { errorHandler } from './middlewares/error.middleware';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import deviceRoutes from './routes/device.routes';
import sensorRoutes from './routes/sensor.routes';
import scheduleRoutes from './routes/schedule.routes';
import { startScheduler } from './services/scheduler.service';
import { setupMQTTMessageHandlers } from './services/mqtt.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/schedules', scheduleRoutes);

// Error handling
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    logger.info('MongoDB connected');

    // Connect to MQTT Broker
    await connectMQTT();
    setupMQTTMessageHandlers();
    logger.info('MQTT connected');

    // Start scheduler service
    startScheduler();
    logger.info('Scheduler started');

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
