import { listExercises } from './exercises.repository.js';
import { findUserById, findUserPreferences } from './users.repository.js';

export function loadWorkoutContext(database, userId) {
  const user = findUserById(database, userId);
  if (!user) return { user: null, preferences: null, exercises: [] };

  return {
    user,
    preferences: findUserPreferences(database, userId),
    exercises: listExercises(database),
  };
}
