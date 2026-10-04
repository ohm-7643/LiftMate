import { Router } from 'express';
import { getDatabase } from '../database/index.js';
import { loadWorkoutContext } from '../database/workouts.repository.js';
import { generateWorkout, IncompleteProfileError } from '../services/workout-planner/index.js';
import { generateAiWorkoutPlan } from '../services/workout-planner/ai-plan.js';
import {
  completeWorkoutSession,
  createWorkoutSession,
  findSessionExercise,
  findSetLog,
  findWorkoutSession,
  getCompletedSessionProgress,
  insertSetLog,
  listExerciseLogs,
  listSessionExercises,
  listUserWorkouts,
} from '../database/workout-execution.repository.js';
import { findUserById } from '../database/users.repository.js';
import { getAvailableCandidates, getDayCandidates } from '../services/workout-planner/candidate-filter.js';
import { selectSplitDay } from '../services/workout-planner/splits.js';
import { recommendNextSession } from '../services/progression.js';

const parsePositiveId = (value) => (/^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value))
  ? Number(value)
  : null);

function apiError(response, status, code, message, fields) {
  return response.status(status).json({ error: { code, message, ...(fields ? { fields } : {}) } });
}

function validatePlanSnapshot(snapshot, profile, exercises, dayNumber) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)
      || !['ollama_qwen', 'deterministic_fallback'].includes(snapshot.source)
      || !snapshot.workout || typeof snapshot.workout !== 'object') return null;
  const workout = snapshot.workout;
  const split = selectSplitDay(profile.days_per_week, dayNumber);
  const allowed = new Map(getDayCandidates(getAvailableCandidates(exercises, profile.equipment), split.focus)
    .map((exercise) => [exercise.id, exercise]));
  if (typeof workout.name !== 'string' || !workout.name.trim() || workout.name.length > 100
      || !Array.isArray(workout.exercises) || workout.exercises.length > 12
      || !Number.isInteger(workout.estimated_minutes) || workout.estimated_minutes < 1
      || workout.estimated_minutes > profile.session_duration_minutes + 5) return null;
  const ids = new Set();
  for (const item of workout.exercises) {
    if (!item || !Number.isSafeInteger(item.exercise_id) || !allowed.has(item.exercise_id)
        || ids.has(item.exercise_id) || !Number.isInteger(item.sets) || item.sets < 1 || item.sets > 6
        || !Number.isInteger(item.rep_min) || !Number.isInteger(item.rep_max)
        || item.rep_min < 1 || item.rep_max < item.rep_min || item.rep_max > 30
        || !Number.isInteger(item.rest_seconds) || item.rest_seconds < 0 || item.rest_seconds > 600) return null;
    ids.add(item.exercise_id);
  }
  const focus = new Set(['back', 'chest', 'shoulders', 'biceps', 'triceps', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'core']);
  if (!Array.isArray(workout.focus) || workout.focus.some((muscle) => !focus.has(muscle))) return null;
  return snapshot;
}

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

  router.post('/workouts/start', async (request, response) => {
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return apiError(response, 400, 'INVALID_REQUEST', 'Request body must be a JSON object.');
    }
    if (!Number.isSafeInteger(body.user_id) || body.user_id < 1) {
      return apiError(response, 400, 'INVALID_USER_ID', 'user_id must be a positive integer.');
    }
    if (body.day_number !== undefined && (!Number.isInteger(body.day_number) || body.day_number < 1)) {
      return apiError(response, 400, 'INVALID_DAY_NUMBER', 'day_number must be a positive integer.');
    }

    try {
      const database = getDb();
      const context = loadWorkoutContext(database, body.user_id);
      if (!context.user) return apiError(response, 404, 'USER_NOT_FOUND', 'User not found.');
      if (!context.preferences) return apiError(response, 409, 'INCOMPLETE_PROFILE', 'Complete user preferences before starting a workout.');
      const profile = { ...context.user, ...context.preferences };
      const dayNumber = body.day_number ?? 1;
      const planned = body.plan_snapshot
        ? validatePlanSnapshot(body.plan_snapshot, profile, context.exercises, dayNumber)
        : await generateAiWorkoutPlan(profile, context.exercises, aiClient, { dayNumber });
      if (!planned) return apiError(response, 400, 'INVALID_WORKOUT_PLAN', 'The reviewed workout plan is invalid or no longer fits your profile.');
      const sessionId = createWorkoutSession(database, {
        userId: body.user_id,
        workout: planned.workout,
        workoutDate: new Date().toISOString().slice(0, 10),
      });
      const session = findWorkoutSession(database, sessionId);
      const exercisesInSession = listSessionExercises(database, sessionId).map((exercise) => ({
        ...exercise,
        sets: exercise.sets,
        logged_sets: [],
      }));
      return response.status(201).json({
        source: planned.source,
        ai: planned.ai,
        session: { ...session, exercises: exercisesInSession },
      });
    } catch (error) {
      if (error instanceof RangeError) return apiError(response, 400, 'INVALID_DAY_NUMBER', error.message);
      if (error?.name === 'IncompleteProfileError') return apiError(response, 409, 'INCOMPLETE_PROFILE', error.message, error.fields);
      console.error('Workout start failed:', error);
      return apiError(response, 500, 'INTERNAL_ERROR', 'Unable to start the workout.');
    }
  });

  router.post('/workouts/:sessionId/sets', (request, response) => {
    const sessionId = parsePositiveId(request.params.sessionId);
    if (!sessionId) return apiError(response, 400, 'INVALID_SESSION_ID', 'Session ID must be a positive integer.');
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return apiError(response, 400, 'INVALID_REQUEST', 'Request body must be a JSON object.');
    if (!Number.isSafeInteger(body.workout_exercise_id) || body.workout_exercise_id < 1
        || !Number.isInteger(body.set_number) || body.set_number < 1
        || typeof body.weight_kg !== 'number' || !Number.isFinite(body.weight_kg) || body.weight_kg < 0
        || !Number.isInteger(body.reps) || body.reps < 1
        || (body.rpe !== undefined && body.rpe !== null && (typeof body.rpe !== 'number' || !Number.isFinite(body.rpe) || body.rpe < 1 || body.rpe > 10))) {
      return apiError(response, 400, 'VALIDATION_ERROR', 'Provide a valid exercise, set number, weight, reps, and optional RPE from 1 to 10.');
    }
    const database = getDb();
    const session = findWorkoutSession(database, sessionId);
    if (!session) return apiError(response, 404, 'WORKOUT_NOT_FOUND', 'Workout session not found.');
    if (session.status === 'completed') return apiError(response, 409, 'WORKOUT_COMPLETED', 'Completed workouts cannot accept more sets.');
    if (!findSessionExercise(database, sessionId, body.workout_exercise_id)) return apiError(response, 400, 'EXERCISE_NOT_IN_SESSION', 'The exercise does not belong to this workout session.');
    if (findSetLog(database, body.workout_exercise_id, body.set_number)) return apiError(response, 409, 'SET_ALREADY_LOGGED', 'This set has already been logged.');
    const id = insertSetLog(database, {
      workoutExerciseId: body.workout_exercise_id,
      setNumber: body.set_number,
      weight: body.weight_kg,
      reps: body.reps,
      rpe: body.rpe ?? null,
    });
    return response.status(201).json({ set: { id, ...body, completed: true } });
  });

  router.post('/workouts/:sessionId/complete', (request, response) => {
    const sessionId = parsePositiveId(request.params.sessionId);
    if (!sessionId) return apiError(response, 400, 'INVALID_SESSION_ID', 'Session ID must be a positive integer.');
    const database = getDb();
    if (!findWorkoutSession(database, sessionId)) return apiError(response, 404, 'WORKOUT_NOT_FOUND', 'Workout session not found.');
    const session = completeWorkoutSession(database, sessionId);
    return response.json({
      session,
      progression: recommendNextSession(getCompletedSessionProgress(database, sessionId)),
    });
  });

  router.get('/workouts/:sessionId', (request, response) => {
    const sessionId = parsePositiveId(request.params.sessionId);
    if (!sessionId) return apiError(response, 400, 'INVALID_SESSION_ID', 'Session ID must be a positive integer.');
    const database = getDb();
    const session = findWorkoutSession(database, sessionId);
    if (!session) return apiError(response, 404, 'WORKOUT_NOT_FOUND', 'Workout session not found.');
    const exercisesInSession = listSessionExercises(database, sessionId).map((exercise) => ({
      ...exercise,
      logged_sets: listExerciseLogs(database, exercise.workout_exercise_id),
    }));
    return response.json({ session: { ...session, exercises: exercisesInSession } });
  });

  router.get('/users/:userId/workouts', (request, response) => {
    const userId = parsePositiveId(request.params.userId);
    if (!userId) return apiError(response, 400, 'INVALID_USER_ID', 'User ID must be a positive integer.');
    const database = getDb();
    if (!findUserById(database, userId)) return apiError(response, 404, 'USER_NOT_FOUND', 'User not found.');
    return response.json({ workouts: listUserWorkouts(database, userId) });
  });

  return router;
}

export default createWorkoutsRouter;
