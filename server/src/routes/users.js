import { Router } from 'express';
import { getDatabase } from '../database/index.js';
import {
  createUser,
  findUserById,
  findUserPreferences,
  saveUserPreferences,
} from '../database/users.repository.js';

const GOALS = new Set(['muscle_gain', 'strength', 'fat_loss', 'general_fitness']);
const EXPERIENCES = new Set(['beginner', 'intermediate', 'advanced']);
const SESSION_DURATIONS = new Set([30, 45, 60, 75, 90]);
const EQUIPMENT = new Set([
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'bodyweight',
  'resistance_band',
  'ab_wheel',
]);
const MUSCLE_GROUPS = new Set([
  'back',
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'core',
]);

function validationError(fields) {
  return { error: { code: 'VALIDATION_ERROR', message: 'Please check the submitted fields.', fields } };
}

function parseUserId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function validateName(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: validationError({ name: 'Name is required.' }) };
  }
  if (typeof body.name !== 'string') {
    return { error: validationError({ name: 'Name must be text.' }) };
  }
  const name = body.name.trim();
  if (
    name.length === 0
    || name.length > 80
    || /[\u0000-\u001f\u007f]/.test(body.name)
  ) {
    return { error: validationError({ name: 'Name must be between 1 and 80 printable characters.' }) };
  }
  return { value: name };
}

function validateArray(value, allowed, field) {
  if (!Array.isArray(value) || value.length === 0) {
    return `${field} must contain at least one selection.`;
  }
  if (value.some((item) => typeof item !== 'string' || !allowed.has(item))) {
    return `${field} contains an unsupported value.`;
  }
  if (new Set(value).size !== value.length) {
    return `${field} must not contain duplicate values.`;
  }
  return null;
}

function validatePreferences(body) {
  const fields = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: validationError({ preferences: 'Preferences must be an object.' }) };
  }

  if (!GOALS.has(body.goal)) fields.goal = 'Choose a supported training goal.';
  if (!EXPERIENCES.has(body.experience)) fields.experience = 'Choose a supported experience level.';
  if (!Number.isInteger(body.days_per_week) || body.days_per_week < 1 || body.days_per_week > 7) {
    fields.days_per_week = 'Training days must be a whole number from 1 to 7.';
  }
  if (!SESSION_DURATIONS.has(body.session_duration_minutes)) {
    fields.session_duration_minutes = 'Choose a session duration of 30, 45, 60, 75, or 90 minutes.';
  }

  const equipmentError = validateArray(body.equipment, EQUIPMENT, 'equipment');
  if (equipmentError) fields.equipment = equipmentError;

  const prioritiesError = validateArray(body.muscle_priorities, MUSCLE_GROUPS, 'muscle_priorities');
  if (prioritiesError) fields.muscle_priorities = prioritiesError;

  if (Object.keys(fields).length > 0) return { error: validationError(fields) };
  return {
    value: {
      goal: body.goal,
      experience: body.experience,
      days_per_week: body.days_per_week,
      session_duration_minutes: body.session_duration_minutes,
      equipment: body.equipment,
      muscle_priorities: body.muscle_priorities,
    },
  };
}

export function createUsersRouter(database) {
  const router = Router();
  const getDb = () => database ?? getDatabase();

  router.post('/users', (request, response) => {
    const parsed = validateName(request.body);
    if (parsed.error) return response.status(400).json(parsed.error);

    try {
      const user = createUser(getDb(), parsed.value);
      return response.status(201).json({ user });
    } catch (error) {
      console.error('User creation failed:', error);
      return response.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Unable to create the user.' },
      });
    }
  });

  router.post('/users/:id/preferences', (request, response) => {
    const userId = parseUserId(request.params.id);
    if (!userId) {
      return response.status(400).json({
        error: { code: 'INVALID_USER_ID', message: 'User ID must be a positive integer.' },
      });
    }
    const parsed = validatePreferences(request.body);
    if (parsed.error) return response.status(400).json(parsed.error);

    try {
      const db = getDb();
      if (!findUserById(db, userId)) {
        return response.status(404).json({
          error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
        });
      }
      const existed = Boolean(findUserPreferences(db, userId));
      const preferences = saveUserPreferences(db, userId, parsed.value);
      return response.status(existed ? 200 : 201).json({ preferences });
    } catch (error) {
      console.error('Preference save failed:', error);
      return response.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Unable to save preferences.' },
      });
    }
  });

  router.get('/users/:id', (request, response) => {
    const userId = parseUserId(request.params.id);
    if (!userId) {
      return response.status(400).json({
        error: { code: 'INVALID_USER_ID', message: 'User ID must be a positive integer.' },
      });
    }

    try {
      const user = findUserById(getDb(), userId);
      if (!user) {
        return response.status(404).json({
          error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
        });
      }
      return response.json({ user });
    } catch (error) {
      console.error('User retrieval failed:', error);
      return response.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Unable to retrieve the user.' },
      });
    }
  });

  router.get('/users/:id/preferences', (request, response) => {
    const userId = parseUserId(request.params.id);
    if (!userId) {
      return response.status(400).json({
        error: { code: 'INVALID_USER_ID', message: 'User ID must be a positive integer.' },
      });
    }

    try {
      const db = getDb();
      if (!findUserById(db, userId)) {
        return response.status(404).json({
          error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
        });
      }
      const preferences = findUserPreferences(db, userId);
      if (!preferences) {
        return response.status(404).json({
          error: { code: 'PREFERENCES_NOT_FOUND', message: 'User preferences not found.' },
        });
      }
      return response.json({ preferences });
    } catch (error) {
      console.error('Preference retrieval failed:', error);
      return response.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Unable to retrieve preferences.' },
      });
    }
  });

  return router;
}

export default createUsersRouter;
