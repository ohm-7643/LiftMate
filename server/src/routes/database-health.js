import { Router } from 'express';
import { getDatabase } from '../database/index.js';

const router = Router();

router.get('/health/db', (_request, response) => {
  try {
    getDatabase().prepare('SELECT 1 AS healthy').get();
    response.json({ status: 'ok', database: 'ok' });
  } catch (error) {
    console.error('Database health check failed:', error);
    response.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

export default router;
