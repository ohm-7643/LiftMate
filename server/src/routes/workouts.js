import { Router } from 'express';
import { getDatabase } from '../database/index.js';
import { loadWorkoutContext } from '../database/workouts.repository.js';
import { generateWorkout, IncompleteProfileError } from '../services/workout-planner/index.js';
import { generateAiWorkoutPlan } from '../services/workout-planner/ai-plan.js';

export function createWorkoutsRouter(database, aiClient) {
  const router = Router();
  const getDb = () => database ?? getDatabase();

  router.post('/workouts/plan', (request, response) => {
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return response.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Request body must be a JSON object with a user_id.' },
      });
    }
    if (!Number.isSafeInteger(body.user_id) || body.user_id < 1) {
      return response.status(400).json({
        error: { code: 'INVALID_USER_ID', message: 'user_id must be a positive integer.' },
      });
    }
    if (body.day_number !== undefined && (!Number.isInteger(body.day_number) || body.day_number < 1)) {
      return response.status(400).json({
        error: { code: 'INVALID_DAY_NUMBER', message: 'day_number must be a positive integer.' },
      });
    }

    try {
      const context = loadWorkoutContext(getDb(), body.user_id);
      if (!context.user) {
        return response.status(404).json({
          error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
        });
      }
      if (!context.preferences) {
        return response.status(409).json({
          error: {
            code: 'INCOMPLETE_PROFILE',
            message: 'Complete user preferences before requesting a workout plan.',
          },
        });
      }
      if (context.exercises.length === 0) {
        return response.status(503).json({
          error: { code: 'EXERCISE_LIBRARY_UNAVAILABLE', message: 'The exercise library is empty.' },
        });
      }

      const workout = generateWorkout(
        { ...context.user, ...context.preferences },
        context.exercises,
        { dayNumber: body.day_number ?? 1 },
      );
      return response.json({ workout });
    } catch (error) {
      if (error instanceof IncompleteProfileError) {
        return response.status(409).json({
          error: {
            code: 'INCOMPLETE_PROFILE',
            message: error.message,
            fields: error.fields,
          },
        });
      }
      if (error instanceof RangeError) {
        return response.status(400).json({
          error: { code: 'INVALID_DAY_NUMBER', message: error.message },
        });
      }
      console.error('Workout plan generation failed:', error);
      return response.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Unable to generate a workout plan.' },
      });
    }
  });

  router.post('/workouts/ai-plan', async (request, response) => {
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return response.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Request body must be a JSON object with a user_id.' },
      });
    }
    if (!Number.isSafeInteger(body.user_id) || body.user_id < 1) {
      return response.status(400).json({
        error: { code: 'INVALID_USER_ID', message: 'user_id must be a positive integer.' },
      });
    }
    if (body.day_number !== undefined && (!Number.isInteger(body.day_number) || body.day_number < 1)) {
      return response.status(400).json({
        error: { code: 'INVALID_DAY_NUMBER', message: 'day_number must be a positive integer.' },
      });
    }

    try {
      const context = loadWorkoutContext(getDb(), body.user_id);
      if (!context.user) {
        return response.status(404).json({
          error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
        });
      }
      if (!context.preferences) {
        return response.status(409).json({
          error: {
            code: 'INCOMPLETE_PROFILE',
            message: 'Complete user preferences before requesting a workout plan.',
          },
        });
      }
      if (context.exercises.length === 0) {
        return response.status(503).json({
          error: { code: 'EXERCISE_LIBRARY_UNAVAILABLE', message: 'The exercise library is empty.' },
        });
      }

      const result = await generateAiWorkoutPlan(
        { ...context.user, ...context.preferences },
        context.exercises,
        aiClient,
        { dayNumber: body.day_number ?? 1 },
      );
      return response.json(result);
    } catch (error) {
      if (error instanceof IncompleteProfileError) {
        return response.status(409).json({
          error: {
            code: 'INCOMPLETE_PROFILE',
            message: error.message,
            fields: error.fields,
          },
        });
      }
      if (error instanceof RangeError) {
        return response.status(400).json({
          error: { code: 'INVALID_DAY_NUMBER', message: error.message },
        });
      }
      console.error('AI workout plan generation failed:', error);
      return response.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Unable to generate a workout plan.' },
      });
    }
  });

  return router;
}

export default createWorkoutsRouter;
