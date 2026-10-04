import { Router } from 'express';
import { getDatabase } from '../database/index.js';
import { findExerciseById, listExercises } from '../database/exercises.repository.js';

const FILTER_NAMES = ['muscle', 'equipment', 'movement_pattern', 'difficulty'];

function parseFilters(query) {
  const filters = {};

  for (const name of FILTER_NAMES) {
    const value = query[name];
    if (value === undefined) continue;
    if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 64) {
      return { error: `${name} must be a non-empty value of at most 64 characters.` };
    }
    filters[name] = value.trim().toLowerCase();
  }

  return { filters };
}

export function createExerciseRouter(database) {
  const router = Router();
  const getDb = () => database ?? getDatabase();

  router.get('/exercises', (request, response) => {
    const parsed = parseFilters(request.query);
    if (parsed.error) {
      return response.status(400).json({
        error: { code: 'INVALID_FILTER', message: parsed.error },
      });
    }

    try {
      const exercises = listExercises(getDb(), parsed.filters);
      return response.json({ exercises, count: exercises.length });
    } catch (error) {
      console.error('Exercise list request failed:', error);
      return response.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Unable to retrieve exercises.' },
      });
    }
  });

  router.get('/exercises/:id', (request, response) => {
    const id = Number(request.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return response.status(404).json({
        error: { code: 'EXERCISE_NOT_FOUND', message: 'Exercise not found.' },
      });
    }

    try {
      const exercise = findExerciseById(getDb(), id);
      if (!exercise) {
        return response.status(404).json({
          error: { code: 'EXERCISE_NOT_FOUND', message: 'Exercise not found.' },
        });
      }
      return response.json({ exercise });
    } catch (error) {
      console.error('Exercise detail request failed:', error);
      return response.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Unable to retrieve the exercise.' },
      });
    }
  });

  return router;
}

export default createExerciseRouter;
