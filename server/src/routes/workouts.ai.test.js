import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../app.js';
import { openDatabase } from '../database/index.js';
import { seedExercises } from '../database/exercises.seed.js';
import { createUser, saveUserPreferences } from '../database/users.repository.js';

const allEquipment = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'resistance_band', 'ab_wheel'];

function parsePrompt(messages) {
  const json = messages[1].content.slice(messages[1].content.indexOf('\n') + 1);
  return JSON.parse(json);
}

function makeOutput(context) {
  const baseline = context.deterministic_baseline;
  return {
    priority_exercise_ids: baseline.exercises.slice(0, 2).map(({ exercise_id }) => exercise_id),
    reasoning: 'The priority muscles stay prominent while the selected split and balanced movement mix are retained.',
    coaching_note: 'Use controlled reps and keep each set consistent from start to finish.',
  };
}

async function fixture(context) {
  const directory = mkdtempSync(join(tmpdir(), 'liftmate-ai-plan-'));
  const database = openDatabase(join(directory, 'test.sqlite'));
  seedExercises(database);
  const user = createUser(database, 'AI Plan Test');
  const preferences = {
    goal: 'muscle_gain',
    experience: 'intermediate',
    days_per_week: 3,
    session_duration_minutes: 60,
    equipment: allEquipment,
    muscle_priorities: ['chest', 'back'],
  };
  saveUserPreferences(database, user.id, preferences);
  let responseValue;
  let generateError;
  let lastMessages;
  let lastOptions;
  const aiClient = {
    model: 'qwen3:8b',
    provider: 'ollama',
    generate: async (messages, options) => {
      lastMessages = messages;
      lastOptions = options;
      if (generateError) throw generateError;
      const prompt = parsePrompt(messages);
      const generated = typeof responseValue === 'function'
        ? responseValue(makeOutput(prompt), prompt)
        : responseValue ?? makeOutput(prompt);
      return typeof generated === 'string' ? generated : JSON.stringify(generated);
    },
  };
  const server = createApp({ database, aiClient }).listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  context.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    database.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return {
    database,
    user,
    preferences,
    setResponse(value) { responseValue = value; },
    setGenerateError(error) { generateError = error; },
    getMessages() { return lastMessages; },
    getOptions() { return lastOptions; },
    async request(body) {
      const response = await fetch(`${baseUrl}/api/workouts/ai-plan`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    },
  };
}

test('AI plan endpoint returns validated Qwen personalization and sends compact JSON mode', async (context) => {
  const testContext = await fixture(context);
  const result = await testContext.request({ user_id: testContext.user.id, day_number: 1 });

  assert.equal(result.status, 200);
  assert.equal(result.body.source, 'ollama_qwen');
  assert.deepEqual(result.body.ai, { used: true, model: 'qwen3:8b', provider: 'ollama' });
  assert.equal(result.body.workout.name, 'Full Body A');
  assert.ok(result.body.workout.reasoning);
  assert.ok(result.body.workout.coaching_note);
  assert.equal(testContext.getOptions().format, 'json');
  assert.equal(testContext.getOptions().options.num_predict, 48);
  const promptContext = parsePrompt(testContext.getMessages());
  assert.equal(promptContext.user_profile.goal, testContext.preferences.goal);
  assert.equal(promptContext.training_day.day_number, 1);
  assert.ok(promptContext.deterministic_baseline.exercises.length > 0);
  assert.ok(promptContext.allowed_exercises.every(({ exercise_id, name }) => Number.isInteger(exercise_id) && name));
  const allowedIds = new Set(promptContext.allowed_exercises.map(({ exercise_id }) => exercise_id));
  const selectedIds = result.body.workout.exercises.map(({ exercise_id }) => exercise_id);
  assert.ok(selectedIds.every((id) => allowedIds.has(id)));
  assert.equal(new Set(selectedIds).size, selectedIds.length);
  for (const item of result.body.workout.exercises) {
    const exercise = testContext.database.prepare('SELECT equipment FROM exercises WHERE id = ?').get(item.exercise_id);
    assert.ok(testContext.preferences.equipment.includes(exercise.equipment) || exercise.equipment === 'bodyweight');
  }
});

test('fenced JSON is parsed and an ID outside the allowed set falls back', async (context) => {
  const testContext = await fixture(context);
  testContext.setResponse((output) => `\`\`\`json\n${JSON.stringify(output)}\n\`\`\``);
  const success = await testContext.request({ user_id: testContext.user.id });
  assert.equal(success.body.source, 'ollama_qwen');

  testContext.setResponse((output) => ({
    ...output,
    priority_exercise_ids: [999999, ...output.priority_exercise_ids.slice(1)],
  }));
  const invalid = await testContext.request({ user_id: testContext.user.id });
  assert.equal(invalid.status, 200);
  assert.equal(invalid.body.source, 'deterministic_fallback');
  assert.equal(invalid.body.ai.reason, 'AI response failed validation');
  assert.ok(invalid.body.workout.exercises.length > 0);
  assert.ok(invalid.body.workout.estimated_minutes <= testContext.preferences.session_duration_minutes);
  assert.equal(new Set(invalid.body.workout.exercises.map(({ exercise_id }) => exercise_id)).size, invalid.body.workout.exercises.length);
});

test('Qwen can prioritize a valid allowed alternative and the server composes a full baseline plan', async (context) => {
  const testContext = await fixture(context);
  let alternateId;
  testContext.setResponse((output, prompt) => {
    const baselineIds = new Set(prompt.deterministic_baseline.exercises.map(({ exercise_id }) => exercise_id));
    const targetMuscle = prompt.deterministic_baseline.exercises[0].primary_muscle;
    const alternate = prompt.allowed_exercises.find((exercise) => (
      !baselineIds.has(exercise.exercise_id) && exercise.primary_muscle === targetMuscle
    ));
    assert.ok(alternate, 'fixture should offer an allowed alternative for a baseline muscle');
    alternateId = alternate.exercise_id;
    return { ...output, priority_exercise_ids: [alternate.exercise_id, ...output.priority_exercise_ids.slice(1)] };
  });
  const result = await testContext.request({ user_id: testContext.user.id });
  assert.equal(result.body.source, 'ollama_qwen');
  assert.equal(result.body.workout.exercises[0].exercise_id, alternateId);
  assert.equal(result.body.workout.exercises.length, 5);
  assert.equal(new Set(result.body.workout.exercises.map(({ exercise_id }) => exercise_id)).size, 5);
  assert.ok(result.body.workout.estimated_minutes <= testContext.preferences.session_duration_minutes + 5);
});

test('an exercise requiring unavailable equipment is rejected', async (context) => {
  const testContext = await fixture(context);
  saveUserPreferences(testContext.database, testContext.user.id, {
    ...testContext.preferences,
    equipment: ['bodyweight'],
    muscle_priorities: ['core'],
  });
  const unavailable = testContext.database.prepare(
    "SELECT id FROM exercises WHERE equipment = 'barbell' ORDER BY id LIMIT 1",
  ).get();
  testContext.setResponse((output) => ({
    ...output,
    priority_exercise_ids: [unavailable.id, ...output.priority_exercise_ids.slice(1)],
  }));

  const result = await testContext.request({ user_id: testContext.user.id });
  assert.equal(result.status, 200);
  assert.equal(result.body.source, 'deterministic_fallback');
  assert.equal(result.body.ai.reason, 'AI response failed validation');
});

test('duplicate exercises and model attempts to override set/rep/rest prescriptions fall back', async (context) => {
  const testContext = await fixture(context);
  const invalidVariants = [
    (output) => ({ ...output, priority_exercise_ids: [output.priority_exercise_ids[0], output.priority_exercise_ids[0]] }),
    (output) => ({ ...output, sets: 99 }),
    (output) => ({ ...output, rep_min: 1, rep_max: 99 }),
    (output) => ({ ...output, rest_seconds: 5 }),
  ];
  for (const mutate of invalidVariants) {
    testContext.setResponse((output) => mutate(output));
    const result = await testContext.request({ user_id: testContext.user.id });
    assert.equal(result.body.source, 'deterministic_fallback');
    assert.equal(result.status, 200);
  }
});

test('malformed JSON and Ollama failures return the deterministic baseline', async (context) => {
  const testContext = await fixture(context);
  testContext.setResponse('```json\n{not json}\n```');
  const malformed = await testContext.request({ user_id: testContext.user.id });
  assert.equal(malformed.body.source, 'deterministic_fallback');
  assert.equal(malformed.body.ai.reason, 'AI response was malformed');

  testContext.setGenerateError(Object.assign(new Error('private connection detail'), { code: 'OLLAMA_UNAVAILABLE' }));
  const unavailable = await testContext.request({ user_id: testContext.user.id });
  assert.equal(unavailable.body.source, 'deterministic_fallback');
  assert.equal(unavailable.body.ai.reason, 'Ollama is unavailable');
  assert.ok(unavailable.body.workout.exercises.length > 0);

  testContext.setGenerateError(Object.assign(new Error('private timeout detail'), { code: 'OLLAMA_TIMEOUT' }));
  const timedOut = await testContext.request({ user_id: testContext.user.id });
  assert.equal(timedOut.body.source, 'deterministic_fallback');
  assert.equal(timedOut.body.ai.reason, 'Ollama request timed out');
});

test('AI route validates user IDs, existence, preferences, and day number', async (context) => {
  const testContext = await fixture(context);
  for (const body of [{ user_id: '1' }, { user_id: 0 }, { user_id: 1.5 }]) {
    assert.equal((await testContext.request(body)).status, 400);
  }
  assert.equal((await testContext.request({ user_id: 999999 })).status, 404);
  assert.equal((await testContext.request({ user_id: testContext.user.id, day_number: 4 })).status, 400);

  const incomplete = createUserForIncomplete(testContext.database);
  const result = await testContext.request({ user_id: incomplete.id });
  assert.equal(result.status, 409);
  assert.equal(result.body.error.code, 'INCOMPLETE_PROFILE');
});

function createUserForIncomplete(database) {
  return createUser(database, 'Incomplete AI Profile');
}
