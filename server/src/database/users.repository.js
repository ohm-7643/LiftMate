const preferenceColumns = `
  id,
  user_id,
  goal,
  experience,
  days_per_week,
  session_duration_minutes,
  equipment,
  muscle_priorities,
  created_at,
  updated_at
`;

function toPreferences(row) {
  if (!row) return null;
  return {
    ...row,
    equipment: JSON.parse(row.equipment),
    muscle_priorities: JSON.parse(row.muscle_priorities),
  };
}

export function createUser(database, name) {
  const result = database.prepare('INSERT INTO users (name) VALUES (?)').run(name);
  return database.prepare('SELECT id, name, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid);
}

export function findUserById(database, id) {
  return database.prepare('SELECT id, name, created_at FROM users WHERE id = ?').get(id) ?? null;
}

export function findUserPreferences(database, userId) {
  const row = database.prepare(`
    SELECT ${preferenceColumns}
    FROM user_preferences
    WHERE user_id = ?
  `).get(userId);
  return toPreferences(row);
}

export function saveUserPreferences(database, userId, preferences) {
  database.prepare(`
    INSERT INTO user_preferences (
      user_id,
      goal,
      experience,
      days_per_week,
      session_duration_minutes,
      equipment,
      muscle_priorities
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      goal = excluded.goal,
      experience = excluded.experience,
      days_per_week = excluded.days_per_week,
      session_duration_minutes = excluded.session_duration_minutes,
      equipment = excluded.equipment,
      muscle_priorities = excluded.muscle_priorities,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    userId,
    preferences.goal,
    preferences.experience,
    preferences.days_per_week,
    preferences.session_duration_minutes,
    JSON.stringify(preferences.equipment),
    JSON.stringify(preferences.muscle_priorities),
  );

  return findUserPreferences(database, userId);
}
