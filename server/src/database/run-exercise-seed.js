import { closeDatabase, getDatabase } from './index.js';
import { seedExercises } from './exercises.seed.js';

try {
  const result = seedExercises(getDatabase());
  console.log(`Exercise seed complete: ${result.added} added; ${result.total} total.`);
} finally {
  closeDatabase();
}
