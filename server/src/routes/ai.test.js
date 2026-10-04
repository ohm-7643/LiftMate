import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../app.js';

async function withServer(aiClient, callback) {
  const server = createApp({ aiClient }).listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  try {
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function responseFor(output = 'LiftMate AI is working.') {
  return {
    provider: 'ollama',
    model: 'qwen3:8b',
    checkHealth: async () => ({ connection: 'available', model_available: true }),
    generate: async () => output,
  };
}

test('AI health and chat routes return clean Ollama response structures', async () => {
  await withServer(responseFor(), async (baseUrl) => {
    const health = await fetch(`${baseUrl}/api/health/ai`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), {
      provider: 'ollama', model: 'qwen3:8b', connection: 'available', model_available: true,
    });

    const chat = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Reply briefly.' }),
    });
    assert.equal(chat.status, 200);
    assert.deepEqual(await chat.json(), {
      response: 'LiftMate AI is working.', model: 'qwen3:8b', provider: 'ollama',
    });
  });
});

test('AI chat rejects empty and oversized messages without calling the model', async () => {
  let calls = 0;
  const client = responseFor();
  client.generate = async () => { calls += 1; return 'unexpected'; };
  await withServer(client, async (baseUrl) => {
    for (const [message, code] of [['  ', 'INVALID_MESSAGE'], ['x'.repeat(4001), 'MESSAGE_TOO_LARGE']]) {
      const response = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.code, code);
    }
  });
  assert.equal(calls, 0);
});

test('AI health reports when Qwen is not available locally', async () => {
  const client = responseFor();
  client.checkHealth = async () => ({ connection: 'available', model_available: false });
  await withServer(client, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health/ai`);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).model_available, false);
  });
});

test('AI API reports Ollama failures without exposing internal details', async () => {
  const client = responseFor();
  client.generate = async () => { throw Object.assign(new Error('private socket data'), { code: 'OLLAMA_UNAVAILABLE' }); };
  await withServer(client, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Hello.' }),
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.message, 'The local Ollama server is unavailable.');
  });
});
