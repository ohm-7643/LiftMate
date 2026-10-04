import express from 'express';
import databaseHealthRouter from './routes/database-health.js';
import { createExerciseRouter } from './routes/exercises.js';

export function createApp({ database } = {}) {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/api', databaseHealthRouter);
  app.use('/api', createExerciseRouter(database));

  return app;
}

export default createApp();
