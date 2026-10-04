import express from 'express';
import databaseHealthRouter from './routes/database-health.js';
import { createExerciseRouter } from './routes/exercises.js';
import { createUsersRouter } from './routes/users.js';
import { createWorkoutsRouter } from './routes/workouts.js';
import { createAiRouter } from './routes/ai.js';
import { createOllamaClient } from './services/ai/ollama-client.js';

export function createApp({ database, aiClient = createOllamaClient() } = {}) {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/api', databaseHealthRouter);
  app.use('/api', createExerciseRouter(database));
  app.use('/api', createUsersRouter(database));
  app.use('/api', createWorkoutsRouter(database, aiClient));
  app.use('/api', createAiRouter(aiClient));

  app.use((error, _request, response, _next) => {
    if (error instanceof SyntaxError && 'body' in error) {
      return response.status(400).json({
        error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON.' },
      });
    }
    console.error('Request failed:', error);
    return response.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    });
  });

  return app;
}

export default createApp();
