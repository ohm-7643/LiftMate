import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { openDatabase } from './index.js';

test('initializes the schema, enforces foreign keys, and supports inserts and queries', () => {
  const directory = mkdtempSync(join(tmpdir(), 'liftmate-database-'));
  const database = openDatabase(join(directory, 'test.sqlite'));

  try {
    const tables = database.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    ).all().map(({ name }) => name);

    assert.deepEqual(tables, [
      'exercises',
      'set_logs',
      'user_preferences',
      'users',
      'workout_exercises',
      'workout_sessions',
    ]);
    assert.equal(database.pragma('foreign_keys', { simple: true }), 1);

    const insertUser = database.prepare('INSERT INTO users (name) VALUES (?)');
    const result = insertUser.run('Test User');
    const user = database.prepare('SELECT id, name FROM users WHERE id = ?').get(result.lastInsertRowid);
    assert.deepEqual(user, { id: result.lastInsertRowid, name: 'Test User' });

    assert.throws(
      () => database.prepare('INSERT INTO user_preferences (user_id, goal, experience, days_per_week, session_duration_minutes) VALUES (?, ?, ?, ?, ?)').run(999, 'strength', 'beginner', 3, 45),
      { code: 'SQLITE_CONSTRAINT_FOREIGNKEY' },
    );
  } finally {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
