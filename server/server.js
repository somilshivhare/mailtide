import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const requiredEnv = [
  'PORT',
  'MONGODB_URI',
  'REDIS_URL',
  'RESEND_API_KEY',
  'ANTHROPIC_API_KEY',
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

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

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
