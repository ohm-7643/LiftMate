export function createWorkoutSession(database, { userId, workout, workoutDate }) {
  const insertSession = database.prepare(`
    INSERT INTO workout_sessions (user_id, name, workout_date, duration_minutes, status)
    VALUES (?, ?, ?, ?, 'in_progress')
  `);
  const insertExercise = database.prepare(`
    INSERT INTO workout_exercises
      (workout_session_id, exercise_id, order_index, target_sets, rep_min, rep_max, target_weight, rest_seconds)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
  `);
  const create = database.transaction(() => {
    const session = insertSession.run(userId, workout.name, workoutDate, workout.estimated_minutes);
    workout.exercises.forEach((exercise, orderIndex) => {
      insertExercise.run(
        session.lastInsertRowid,
        exercise.exercise_id,
        orderIndex,
        exercise.sets,
        exercise.rep_min,
        exercise.rep_max,
        exercise.rest_seconds,
      );
    });
    return Number(session.lastInsertRowid);
  });
  return create();
}

export function findWorkoutSession(database, sessionId) {
  return database.prepare(`
    SELECT id, user_id, name, workout_date, duration_minutes, status, created_at
    FROM workout_sessions WHERE id = ?
  `).get(sessionId) ?? null;
}

export function listSessionExercises(database, sessionId) {
  return database.prepare(`
    SELECT we.id AS workout_exercise_id, we.exercise_id, e.name, e.primary_muscle,
      we.order_index, we.target_sets AS sets, we.rep_min, we.rep_max,
      we.target_weight AS target_weight_kg, we.rest_seconds
    FROM workout_exercises we
    JOIN exercises e ON e.id = we.exercise_id
    WHERE we.workout_session_id = ?
    ORDER BY we.order_index
  `).all(sessionId);
}

export function listExerciseLogs(database, workoutExerciseId) {
  return database.prepare(`
    SELECT id, set_number, weight AS weight_kg, reps, rpe, completed
    FROM set_logs WHERE workout_exercise_id = ? ORDER BY set_number
  `).all(workoutExerciseId);
}

export function findSessionExercise(database, sessionId, workoutExerciseId) {
  return database.prepare(`
    SELECT id FROM workout_exercises WHERE id = ? AND workout_session_id = ?
  `).get(workoutExerciseId, sessionId) ?? null;
}

export function findSetLog(database, workoutExerciseId, setNumber) {
  return database.prepare(`
    SELECT id FROM set_logs WHERE workout_exercise_id = ? AND set_number = ?
  `).get(workoutExerciseId, setNumber) ?? null;
}

export function insertSetLog(database, { workoutExerciseId, setNumber, weight, reps, rpe }) {
  const result = database.prepare(`
    INSERT INTO set_logs (workout_exercise_id, set_number, weight, reps, rpe, completed)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(workoutExerciseId, setNumber, weight, reps, rpe);
  return Number(result.lastInsertRowid);
}

export function completeWorkoutSession(database, sessionId) {
  database.prepare(`
    UPDATE workout_sessions
    SET status = 'completed',
        duration_minutes = MAX(1, CAST((julianday('now') - julianday(created_at)) * 1440 AS INTEGER))
    WHERE id = ?
  `).run(sessionId);
  return findWorkoutSession(database, sessionId);
}

export function getCompletedSessionProgress(database, sessionId) {
  return database.prepare(`
    SELECT we.id AS workout_exercise_id, we.exercise_id, e.name,
      we.target_sets, we.rep_min, we.rep_max,
      sl.set_number, sl.weight AS weight_kg, sl.reps
    FROM workout_exercises we
    JOIN exercises e ON e.id = we.exercise_id
    LEFT JOIN set_logs sl ON sl.workout_exercise_id = we.id AND sl.completed = 1
    WHERE we.workout_session_id = ?
    ORDER BY we.order_index, sl.set_number
  `).all(sessionId);
}

export function listUserWorkouts(database, userId, limit = 20) {
  return database.prepare(`
    SELECT id, name, workout_date, duration_minutes, status
    FROM workout_sessions WHERE user_id = ?
    ORDER BY workout_date DESC, id DESC LIMIT ?
  `).all(userId, limit);
}
