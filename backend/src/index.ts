import { app } from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 IndoorArena API Server running on port ${env.PORT}`);
  console.log(`📍 REST API v1:    http://localhost:${env.PORT}/api/v1`);
  console.log(`📖 Swagger Docs:   http://localhost:${env.PORT}/api-docs`);
  console.log(`🏥 Health Check:   http://localhost:${env.PORT}/health`);
  console.log(`🌍 Timezone:       ${env.TIMEZONE}`);
  console.log(`======================================================\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated.');
  });
});

