import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../app.js';
import { openDatabase } from '../database/index.js';
import { EXERCISES, seedExercises } from '../database/exercises.seed.js';
import { createUser, saveUserPreferences } from '../database/users.repository.js';
import { getWeeklySplit } from '../services/workout-planner/splits.js';

const allEquipment = [
  'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'resistance_band', 'ab_wheel',
];

test('weekly splits cover one through seven days with a recovery day at seven', () => {
  assert.deepEqual(getWeeklySplit(1).map(({ name }) => name), ['Full Body']);
  assert.deepEqual(getWeeklySplit(2).map(({ name }) => name), ['Upper', 'Lower']);
  assert.deepEqual(getWeeklySplit(3).map(({ name }) => name), ['Full Body A', 'Full Body B', 'Full Body C']);
  assert.deepEqual(getWeeklySplit(4).map(({ name }) => name), ['Upper A', 'Lower A', 'Upper B', 'Lower B']);
  assert.deepEqual(getWeeklySplit(5).map(({ name }) => name), ['Push', 'Pull', 'Legs', 'Upper', 'Lower']);
  assert.equal(getWeeklySplit(6).filter(({ is_rest_day }) => is_rest_day === false).length, 6);
  const sevenDaySplit = getWeeklySplit(7);
  assert.equal(sevenDaySplit.filter(({ is_rest_day }) => is_rest_day === false).length, 6);
  assert.equal(sevenDaySplit[6].is_rest_day, true);
});

test('workout API plans deterministic sessions from saved user preferences', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'liftmate-workouts-'));
  const database = openDatabase(join(directory, 'test.sqlite'));
  seedExercises(database);
  const server = createApp({ database }).listen(0, '127.0.0.1');
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

  const createProfile = (name, preferences) => {
    const user = createUser(database, name);
    if (preferences) saveUserPreferences(database, user.id, preferences);
    return user;
  };

  const preferences = {
    goal: 'muscle_gain',
    experience: 'intermediate',
    days_per_week: 3,
    session_duration_minutes: 60,
    equipment: allEquipment,
    muscle_priorities: ['chest', 'back'],
  };
  const user = createProfile('Morgan', preferences);
  const plan = async (body) => {
    const response = await fetch(`${baseUrl}/api/workouts/plan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { response, body: await response.json() };
  };

  const initial = await plan({ user_id: user.id });
  const repeated = await plan({ user_id: user.id });
  assert.equal(initial.response.status, 200);
  assert.deepEqual(repeated.body, initial.body, 'the same profile should produce the same plan');
  assert.ok(initial.body.workout.exercises.length > 0);
  assert.equal(initial.body.workout.name, 'Full Body A');
  assert.ok(initial.body.workout.estimated_minutes <= preferences.session_duration_minutes);

  const exerciseIds = initial.body.workout.exercises.map(({ exercise_id }) => exercise_id);
  assert.equal(new Set(exerciseIds).size, exerciseIds.length, 'a workout must not repeat an exercise');
  for (const exerciseId of exerciseIds) {
    assert.ok(database.prepare('SELECT 1 FROM exercises WHERE id = ?').get(exerciseId));
  }

  const bodyweightOnlyUser = createProfile('Casey', {
    ...preferences,
    experience: 'beginner',
    session_duration_minutes: 30,
    equipment: ['ab_wheel'],
    muscle_priorities: ['core'],
  });
  const restrictedPlan = await plan({ user_id: bodyweightOnlyUser.id });
  const restricted = restrictedPlan.body.workout.exercises;
  const selectedEquipment = new Set(['ab_wheel', 'bodyweight']);
  assert.equal(restrictedPlan.response.status, 200);
  assert.ok(restricted.length > 0);
  for (const item of restricted) {
    const exercise = database.prepare('SELECT equipment FROM exercises WHERE id = ?').get(item.exercise_id);
    assert.ok(selectedEquipment.has(exercise.equipment));
  }

  const unprioritizedUser = createProfile('Jordan', {
    ...preferences,
    session_duration_minutes: 90,
    muscle_priorities: ['core'],
  });
  const prioritizedUser = createProfile('Alex', {
    ...preferences,
    session_duration_minutes: 90,
    muscle_priorities: ['chest'],
  });
  const unprioritizedPlan = await plan({ user_id: unprioritizedUser.id });
  const prioritizedPlan = await plan({ user_id: prioritizedUser.id });
  const countPrimary = (workout, muscle) => workout.exercises
    .filter((item) => item.primary_muscle === muscle).length;
  assert.ok(countPrimary(prioritizedPlan.body.workout, 'chest') > countPrimary(unprioritizedPlan.body.workout, 'chest'));
  assert.equal(prioritizedPlan.body.workout.focus[0], 'chest');

  saveUserPreferences(database, user.id, { ...preferences, session_duration_minutes: 30 });
  const shortPlan = await plan({ user_id: user.id });
  saveUserPreferences(database, user.id, { ...preferences, session_duration_minutes: 90 });
  const longPlan = await plan({ user_id: user.id });
  assert.ok(shortPlan.body.workout.exercises.length < longPlan.body.workout.exercises.length);
  assert.ok(shortPlan.body.workout.estimated_minutes <= 30);
  assert.ok(longPlan.body.workout.estimated_minutes <= 90);

  const strengthUser = createProfile('Sam', {
    ...preferences,
    goal: 'strength',
    session_duration_minutes: 60,
  });
  const strengthPlan = await plan({ user_id: strengthUser.id });
  assert.equal(strengthPlan.response.status, 200);
  assert.ok(strengthPlan.body.workout.exercises.length > 0);
  for (const item of strengthPlan.body.workout.exercises) {
    assert.ok(item.rep_min >= 3);
    assert.ok(item.rep_max <= 8);
    assert.ok(item.rest_seconds >= 120);
  }

  const twoDayUser = createProfile('Taylor', { ...preferences, days_per_week: 2 });
  const lowerDay = await plan({ user_id: twoDayUser.id, day_number: 2 });
  assert.equal(lowerDay.body.workout.name, 'Lower');

  const sevenDayUser = createProfile('Jamie', { ...preferences, days_per_week: 7 });
  const recoveryDay = await plan({ user_id: sevenDayUser.id, day_number: 7 });
  assert.equal(recoveryDay.body.workout.name, 'Recovery / Rest');
  assert.deepEqual(recoveryDay.body.workout.exercises, []);
  assert.equal(recoveryDay.body.workout.estimated_minutes, 0);

  const incompleteUser = createProfile('Incomplete', null);
  const incomplete = await plan({ user_id: incompleteUser.id });
  assert.equal(incomplete.response.status, 409);
  assert.equal(incomplete.body.error.code, 'INCOMPLETE_PROFILE');

  const invalidId = await plan({ user_id: '1' });
  assert.equal(invalidId.response.status, 400);
  const nonIntegerId = await plan({ user_id: 1.5 });
  assert.equal(nonIntegerId.response.status, 400);
  const unknownUser = await plan({ user_id: 999999 });
  assert.equal(unknownUser.response.status, 404);

  const invalidDay = await plan({ user_id: user.id, day_number: 4 });
  assert.equal(invalidDay.response.status, 400);
  assert.equal(EXERCISES.length, 59);
});
