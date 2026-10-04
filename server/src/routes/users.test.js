import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../app.js';
import { openDatabase } from '../database/index.js';

test('user onboarding validates inputs and persists/retrieves a profile', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'liftmate-users-'));
  const database = openDatabase(join(directory, 'test.sqlite'));
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

  const postJson = (path, body) => fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const emptyNameResponse = await postJson('/api/users', { name: '   ' });
  const emptyNameBody = await emptyNameResponse.json();
  assert.equal(emptyNameResponse.status, 400);
  assert.equal(emptyNameBody.error.code, 'VALIDATION_ERROR');
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM users').get().count, 0);

  const longNameResponse = await postJson('/api/users', { name: 'a'.repeat(81) });
  assert.equal(longNameResponse.status, 400);
  const controlCharacterNameResponse = await postJson('/api/users', { name: 'Riley\n' });
  assert.equal(controlCharacterNameResponse.status, 400);

  const createResponse = await postJson('/api/users', { name: '  Riley  ' });
  const createBody = await createResponse.json();
  assert.equal(createResponse.status, 201);
  assert.equal(createBody.user.name, 'Riley');
  const userId = createBody.user.id;

  const validPreferences = {
    goal: 'muscle_gain',
    experience: 'beginner',
    days_per_week: 3,
    session_duration_minutes: 45,
    equipment: ['barbell', 'dumbbell', 'bodyweight'],
    muscle_priorities: ['back', 'chest', 'glutes'],
  };
  const preferenceResponse = await postJson(`/api/users/${userId}/preferences`, validPreferences);
  const preferenceBody = await preferenceResponse.json();
  assert.equal(preferenceResponse.status, 201);
  assert.deepEqual(preferenceBody.preferences.equipment, validPreferences.equipment);
  assert.deepEqual(preferenceBody.preferences.muscle_priorities, validPreferences.muscle_priorities);
  assert.equal(typeof database.prepare('SELECT equipment FROM user_preferences WHERE user_id = ?').get(userId).equipment, 'string');

  const rejectsPreference = async (patch, field) => {
    const response = await postJson(`/api/users/${userId}/preferences`, {
      ...validPreferences,
      ...patch,
    });
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.fields[field]);
  };

  await rejectsPreference({ goal: 'body_recomposition' }, 'goal');
  await rejectsPreference({ experience: 'expert' }, 'experience');
  await rejectsPreference({ days_per_week: 0 }, 'days_per_week');
  await rejectsPreference({ days_per_week: 8 }, 'days_per_week');
  await rejectsPreference({ session_duration_minutes: 40 }, 'session_duration_minutes');
  await rejectsPreference({ equipment: ['spaceship'] }, 'equipment');
  await rejectsPreference({ equipment: [] }, 'equipment');
  await rejectsPreference({ equipment: ['barbell', 'barbell'] }, 'equipment');
  await rejectsPreference({ muscle_priorities: 'back' }, 'muscle_priorities');

  const getUserResponse = await fetch(`${baseUrl}/api/users/${userId}`);
  const getUserBody = await getUserResponse.json();
  assert.equal(getUserResponse.status, 200);
  assert.equal(getUserBody.user.id, userId);
  assert.equal(getUserBody.user.name, 'Riley');

  const getPreferencesResponse = await fetch(`${baseUrl}/api/users/${userId}/preferences`);
  const getPreferencesBody = await getPreferencesResponse.json();
  assert.equal(getPreferencesResponse.status, 200);
  assert.deepEqual(getPreferencesBody.preferences, preferenceBody.preferences);

  const updateResponse = await postJson(`/api/users/${userId}/preferences`, {
    ...validPreferences,
    goal: 'strength',
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM user_preferences WHERE user_id = ?').get(userId).count, 1);

  for (const path of ['/api/users/nope', '/api/users/1.5', '/api/users/0', '/api/users/nope/preferences']) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 400, `${path} should reject an invalid user ID`);
  }
  for (const path of ['/api/users/999999', '/api/users/999999/preferences']) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 404, `${path} should report an unknown user`);
  }

  const missingPreferenceResponse = await fetch(`${baseUrl}/api/users/${userId + 1}/preferences`);
  assert.equal(missingPreferenceResponse.status, 404);

  const invalidPreferenceIdResponse = await postJson('/api/users/not-a-number/preferences', validPreferences);
  assert.equal(invalidPreferenceIdResponse.status, 400);
  const missingPreferenceIdResponse = await postJson('/api/users/999999/preferences', validPreferences);
  assert.equal(missingPreferenceIdResponse.status, 404);
});
