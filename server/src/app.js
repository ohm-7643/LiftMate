import express from 'express';
import databaseHealthRouter from './routes/database-health.js';

const app = express();

app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api', databaseHealthRouter);

export default app;
