import app from './app.js';
import { getDatabase } from './database/index.js';

const port = Number(process.env.PORT) || 3000;

getDatabase();

app.listen(port, () => {
  console.log(`LiftMate API listening on http://localhost:${port}`);
});
