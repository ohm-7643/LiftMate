import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../app.js';
import { openDatabase } from '../database/index.js';
import { EXERCISES, seedExercises } from '../database/exercises.seed.js';

test('exercise seed is repeatable and exercise endpoints return/filter catalog entries', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'liftmate-exercises-'));
  const database = openDatabase(join(directory, 'test.sqlite'));
  const app = createApp({ database });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  context.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    database.close();
    rmSync(directory, { recursive: true, force: true });
  });

  const firstSeed = seedExercises(database);
  const secondSeed = seedExercises(database);
  assert.equal(firstSeed.added, EXERCISES.length);
  assert.equal(firstSeed.total, EXERCISES.length);
  assert.deepEqual(secondSeed, { added: 0, total: EXERCISES.length });
  assert.equal(
    new Set(EXERCISES.map(({ name }) => name.toLowerCase())).size,
    EXERCISES.length,
  );
  for (const entry of EXERCISES) {
    assert.ok(entry.name && entry.primary_muscle && entry.equipment);
    assert.ok(entry.movement_pattern && entry.difficulty);
    assert.ok(entry.instructions && entry.substitution_group);
    assert.ok(['beginner', 'intermediate', 'advanced'].includes(entry.difficulty));
  }
  assert.equal(
    database.prepare('SELECT COUNT(DISTINCT name) AS count FROM exercises').get().count,
    EXERCISES.length,
  );
  const exerciseColumns = database.pragma('table_info(exercises)').map(({ name }) => name);
  assert.ok(exerciseColumns.includes('instructions'));
  assert.ok(exerciseColumns.includes('substitution_group'));
  assert.throws(
    () => database.prepare(`
      INSERT INTO exercises (name, primary_muscle, equipment, movement_pattern, difficulty)
      VALUES ('lat pulldown', 'back', 'cable', 'vertical_pull', 'beginner')
    `).run(),
    { code: 'SQLITE_CONSTRAINT_UNIQUE' },
  );

  const listResponse = await fetch(`${baseUrl}/api/exercises`);
  const listBody = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(listBody.count, EXERCISES.length);
  assert.equal(listBody.exercises.length, EXERCISES.length);

  const muscleResponse = await fetch(`${baseUrl}/api/exercises?muscle=chest`);
  const muscleBody = await muscleResponse.json();
  assert.equal(muscleResponse.status, 200);
  assert.ok(muscleBody.count > 0);
  assert.ok(muscleBody.exercises.every((item) => (
    item.primary_muscle === 'chest' || item.secondary_muscles.includes('chest')
  )));
  assert.ok(muscleBody.exercises.some((item) => item.primary_muscle === 'chest'));

  const equipmentResponse = await fetch(`${baseUrl}/api/exercises?equipment=dumbbell`);
  const equipmentBody = await equipmentResponse.json();
  assert.equal(equipmentResponse.status, 200);
  assert.ok(equipmentBody.count > 0);
  assert.ok(equipmentBody.exercises.every((item) => item.equipment === 'dumbbell'));

  const combinedResponse = await fetch(
    `${baseUrl}/api/exercises?muscle=back&movement_pattern=vertical_pull&difficulty=beginner`,
  );
  const combinedBody = await combinedResponse.json();
  assert.equal(combinedResponse.status, 200);
  assert.ok(combinedBody.count > 0);
  assert.ok(combinedBody.exercises.every((item) => (
    item.movement_pattern === 'vertical_pull' && item.difficulty === 'beginner'
  )));

  const exerciseId = listBody.exercises[0].id;
  const detailResponse = await fetch(`${baseUrl}/api/exercises/${exerciseId}`);
  const detailBody = await detailResponse.json();
  assert.equal(detailResponse.status, 200);
  assert.equal(detailBody.exercise.id, exerciseId);
  assert.ok(Array.isArray(detailBody.exercise.secondary_muscles));

  const missingResponse = await fetch(`${baseUrl}/api/exercises/999999`);
  const missingBody = await missingResponse.json();
  assert.equal(missingResponse.status, 404);
  assert.equal(missingBody.error.code, 'EXERCISE_NOT_FOUND');

  const invalidFilterResponse = await fetch(
    `${baseUrl}/api/exercises?muscle=chest%27%20OR%201%3D1--`,
  );
  const invalidFilterBody = await invalidFilterResponse.json();
  assert.equal(invalidFilterResponse.status, 200);
  assert.equal(invalidFilterBody.count, 0);
});
