import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DATABASE_PATH = fileURLToPath(
  new URL('../../data/liftmate.sqlite', import.meta.url),
);

const migrations = [
  (database) => {
    database.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        goal TEXT NOT NULL,
        experience TEXT NOT NULL,
        days_per_week INTEGER NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
        session_duration_minutes INTEGER NOT NULL CHECK (session_duration_minutes > 0),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        primary_muscle TEXT NOT NULL,
        secondary_muscles TEXT NOT NULL DEFAULT '',
        equipment TEXT NOT NULL,
        movement_pattern TEXT NOT NULL,
        difficulty TEXT NOT NULL
      );

      CREATE TABLE workout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        workout_date TEXT NOT NULL,
        duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
        status TEXT NOT NULL DEFAULT 'planned',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE workout_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_session_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        order_index INTEGER NOT NULL CHECK (order_index >= 0),
        target_sets INTEGER NOT NULL CHECK (target_sets > 0),
        rep_min INTEGER NOT NULL CHECK (rep_min > 0),
        rep_max INTEGER NOT NULL CHECK (rep_max >= rep_min),
        target_weight REAL CHECK (target_weight IS NULL OR target_weight >= 0),
        rest_seconds INTEGER CHECK (rest_seconds IS NULL OR rest_seconds >= 0),
        FOREIGN KEY (workout_session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
      );

      CREATE TABLE set_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_exercise_id INTEGER NOT NULL,
        set_number INTEGER NOT NULL CHECK (set_number > 0),
        weight REAL CHECK (weight IS NULL OR weight >= 0),
        reps INTEGER CHECK (reps IS NULL OR reps >= 0),
        rpe REAL CHECK (rpe IS NULL OR rpe BETWEEN 0 AND 10),
        completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
        FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
      );
    `);
  },
];

export function initializeDatabase(database) {
  database.pragma('foreign_keys = ON');

  const currentVersion = database.pragma('user_version', { simple: true });
  for (let index = currentVersion; index < migrations.length; index += 1) {
    const migrate = database.transaction(() => {
      migrations[index](database);
      database.pragma(`user_version = ${index + 1}`);
    });
    migrate();
  }

  return database;
}

export function openDatabase(filename = DATABASE_PATH) {
  mkdirSync(dirname(filename), { recursive: true });
  const database = new Database(filename);
  return initializeDatabase(database);
}

let database;

export function getDatabase() {
  if (!database) {
    database = openDatabase();
  }
  return database;
}

export function closeDatabase() {
  database?.close();
  database = undefined;
}
