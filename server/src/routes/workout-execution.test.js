import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../app.js';
import { openDatabase } from '../database/index.js';
import { seedExercises } from '../database/exercises.seed.js';
import { createUser, saveUserPreferences } from '../database/users.repository.js';

const equipment = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'resistance_band', 'ab_wheel'];

async function fixture(context) {
  const directory = mkdtempSync(join(tmpdir(), 'liftmate-execution-'));
  const database = openDatabase(join(directory, 'test.sqlite'));
  seedExercises(database);
  const user = createUser(database, 'Workout Test');
  saveUserPreferences(database, user.id, {
    goal: 'muscle_gain', experience: 'intermediate', days_per_week: 3,
    session_duration_minutes: 60, equipment, muscle_priorities: ['chest', 'back'],
  });
  let aiCalls = 0;
  const aiClient = {
    model: 'qwen3:8b', provider: 'ollama',
    async generate(messages) {
      aiCalls += 1;
      const prompt = JSON.parse(messages[1].content.slice(messages[1].content.indexOf('\n') + 1));
      return JSON.stringify({
        priority_exercise_ids: prompt.deterministic_baseline.exercises.slice(0, 2).map((item) => item.exercise_id),
        reasoning: 'Balances priority muscles.', coaching_note: 'Keep each rep controlled.',
      });
    },
  };
  const server = createApp({ database, aiClient }).listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  context.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    database.close(); rmSync(directory, { recursive: true, force: true });
  });
  return {
    database, user, get aiCalls() { return aiCalls; },
    async request(path, { method = 'GET', body } = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        method, ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await response.json() };
    },
  };
}

async function getPreview(testCase, userId) {
  return testCase.request('/workouts/ai-plan', { method: 'POST', body: { user_id: userId, day_number: 1 } });
}

async function start(testCase, userId, planSnapshot) {
  return testCase.request('/workouts/start', { method: 'POST', body: { user_id: userId, day_number: 1, ...(planSnapshot ? { plan_snapshot: planSnapshot } : {}) } });
}

test('starting creates one session and preserves the generated workout exercises', async (t) => {
  const f = await fixture(t);
  const result = await start(f, f.user.id);
  assert.equal(result.status, 201);
  assert.equal(result.body.source, 'ollama_qwen');
  assert.equal(f.aiCalls, 1);
  const count = f.database.prepare('SELECT COUNT(*) AS count FROM workout_sessions').get().count;
  assert.equal(count, 1);
  const rows = f.database.prepare('SELECT exercise_id, target_sets, rep_min, rep_max, rest_seconds FROM workout_exercises WHERE workout_session_id = ? ORDER BY order_index').all(result.body.session.id);
  assert.deepEqual(rows.map((row) => [row.exercise_id, row.target_sets, row.rep_min, row.rep_max, row.rest_seconds]), result.body.session.exercises.map((item) => [item.exercise_id, item.sets, item.rep_min, item.rep_max, item.rest_seconds]));
});

test('starting a reviewed snapshot does not generate a second workout', async (t) => {
  const f = await fixture(t);
  const preview = await getPreview(f, f.user.id);
  assert.equal(preview.status, 200);
  const callsAfterPreview = f.aiCalls;
  const result = await start(f, f.user.id, preview.body);
  assert.equal(result.status, 201);
  assert.equal(result.body.session.name, preview.body.workout.name);
  assert.equal(result.body.session.exercises.length, preview.body.workout.exercises.length);
  assert.equal(f.aiCalls, callsAfterPreview);
});

test('valid set logging works and workout retrieval includes logged sets', async (t) => {
  const f = await fixture(t);
  const created = await start(f, f.user.id);
  const exercise = created.body.session.exercises[0];
  const logged = await f.request(`/workouts/${created.body.session.id}/sets`, { method: 'POST', body: { workout_exercise_id: exercise.workout_exercise_id, set_number: 1, weight_kg: 40, reps: 9, rpe: 8 } });
  assert.equal(logged.status, 201);
  const detail = await f.request(`/workouts/${created.body.session.id}`);
  assert.equal(detail.status, 200);
  assert.deepEqual(detail.body.session.exercises[0].logged_sets[0], { id: logged.body.set.id, set_number: 1, weight_kg: 40, reps: 9, rpe: 8, completed: 1 });
});

test('invalid sets and exercises from another session are rejected', async (t) => {
  const f = await fixture(t);
  const one = await start(f, f.user.id);
  const two = await start(f, f.user.id);
  const exercise = one.body.session.exercises[0];
  const invalid = await f.request(`/workouts/${one.body.session.id}/sets`, { method: 'POST', body: { workout_exercise_id: exercise.workout_exercise_id, set_number: 0, weight_kg: -1, reps: 0, rpe: 11 } });
  assert.equal(invalid.status, 400);
  const cross = await f.request(`/workouts/${one.body.session.id}/sets`, { method: 'POST', body: { workout_exercise_id: two.body.session.exercises[0].workout_exercise_id, set_number: 1, weight_kg: 20, reps: 8 } });
  assert.equal(cross.status, 400);
});

test('completion returns deterministic weight and rep progression recommendations', async (t) => {
  const f = await fixture(t);
  const created = await start(f, f.user.id);
  const [increaseExercise, repsExercise] = created.body.session.exercises;
  for (let setNumber = 1; setNumber <= increaseExercise.sets; setNumber += 1) {
    await f.request(`/workouts/${created.body.session.id}/sets`, { method: 'POST', body: { workout_exercise_id: increaseExercise.workout_exercise_id, set_number: setNumber, weight_kg: 40, reps: increaseExercise.rep_max } });
  }
  const targetReps = [repsExercise.rep_max, repsExercise.rep_max - 1, repsExercise.rep_max - 2];
  for (let index = 0; index < Math.min(repsExercise.sets, targetReps.length); index += 1) {
    await f.request(`/workouts/${created.body.session.id}/sets`, { method: 'POST', body: { workout_exercise_id: repsExercise.workout_exercise_id, set_number: index + 1, weight_kg: 30, reps: targetReps[index] } });
  }
  const completed = await f.request(`/workouts/${created.body.session.id}/complete`, { method: 'POST' });
  assert.equal(completed.status, 200);
  assert.equal(completed.body.session.status, 'completed');
  const recommendations = completed.body.progression;
  const increase = recommendations.find((item) => item.workout_exercise_id === increaseExercise.workout_exercise_id);
  assert.equal(increase.recommendation, 'increase_weight');
  assert.equal(increase.recommended_weight_kg, 42.5);
  const reps = recommendations.find((item) => item.workout_exercise_id === repsExercise.workout_exercise_id);
  assert.equal(reps.recommendation, 'add_reps');
  assert.equal(reps.recommended_weight_kg, 30);
  assert.ok(reps.target_reps[1] > targetReps[1]);
});

test('unknown workout sessions return 404 and history lists recent sessions', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.request('/workouts/9999')).status, 404);
  assert.equal((await f.request('/workouts/9999/complete', { method: 'POST' })).status, 404);
  const created = await start(f, f.user.id);
  const history = await f.request(`/users/${f.user.id}/workouts`);
  assert.equal(history.status, 200);
  assert.equal(history.body.workouts.length, 1);
  assert.equal(history.body.workouts[0].id, created.body.session.id);
  assert.equal(history.body.workouts[0].status, 'in_progress');
});
