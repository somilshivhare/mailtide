import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter from './routes/auth.js';
import subscribersRouter from './routes/subscribers.js';
import campaignsRouter from './routes/campaigns.js';
import analyticsRouter from './routes/analytics.js';
import aiRouter from './routes/ai.js';
import webhooksRouter from './routes/webhooks.js';
import errorMiddleware from './middleware/errorMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const requiredEnv = [
  'PORT',
  'MONGODB_URI',
  'REDIS_URL',
  'RESEND_API_KEY',
  'GEMINI_API_KEY',
  'JWT_SECRET',
  'CLIENT_URL',
  'BASE_URL'
];

requiredEnv.forEach(key => {
  if (!process.env[key]) {
    console.error(`Error: Missing env var ${key}`);
    process.exit(1);
  }
});

const app = express();
const { PORT, MONGODB_URI, CLIENT_URL } = process.env;

// Security headers
app.use(helmet());

// Cookie parsing (MUST be registered before routes)
app.use(cookieParser());

console.log('CLIENT_URL:', process.env.CLIENT_URL);
// CORS config
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// IP and Proxy Debug Logging Middleware
app.use((req, res, next) => {
  console.log(`[Debug IP] PID: ${process.pid} | Path: ${req.path}`);
  console.log(`  trust proxy value : ${req.app.get('trust proxy')}`);
  console.log(`  req.ip            : ${req.ip}`);
  console.log(`  req.ips           : ${JSON.stringify(req.ips)}`);
  console.log(`  X-Forwarded-For   : ${req.headers['x-forwarded-for']}`);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { error: 'Too many requests from this IP, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Express parsers - parse JSON with verification helper for rawBody
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.includes('/api/webhooks')) {
      req.rawBody = buf.toString();
    }
  }
}));
app.use(express.urlencoded({ extended: true }));

// Register routes
app.use('/uploads', express.static(uploadsDir));
app.use('/api/auth', authRouter);
app.use('/api/subscribers', subscribersRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/ai', aiRouter);
app.use('/', webhooksRouter);

app.get('/', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Global Error Handler
app.use(errorMiddleware);

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error(`DB connection failed: ${error.message}`);
    process.exit(1);
  }
};

const start = async () => {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  const shutdown = () => {
    server.close(async () => {
      try {
        await mongoose.disconnect();
        process.exit(0);
      } catch (err) {
        console.error(`Shutdown error: ${err.message}`);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err?.message ?? err}`);
});

process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

start();

export default app;
