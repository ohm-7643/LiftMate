import app from './app.js';
import { getDatabase } from './database/index.js';
import { seedExercises } from './database/exercises.seed.js';

const port = Number(process.env.PORT) || 3000;

seedExercises(getDatabase());

app.listen(port, () => {
  console.log(`LiftMate API listening on http://localhost:${port}`);
});
