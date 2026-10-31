import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import v1Routes from './routes/v1';
import { errorHandler } from './middlewares/error.middleware';
import { generalApiLimiter } from './middlewares/rateLimiter';

export const app = express();

// Security middleware with adjustments for Swagger UI and PDF streaming
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin like mobile apps, curl, or server-to-server
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in development
      }
    },
    credentials: true,
  })
);

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(env.COOKIE_SECRET));

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// General Rate Limiter
app.use('/api/', generalApiLimiter);

// API Documentation (OpenAPI / Swagger)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/api/v1/docs', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'IndoorArena API',
    timezone: env.TIMEZONE,
  });
});

// V1 Routes
app.use('/api/v1', v1Routes);

// Centralized error handling
app.use(errorHandler);

