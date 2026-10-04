import assert from 'node:assert/strict';
import test from 'node:test';
import { createOllamaClient, OllamaError } from './ollama-client.js';

function jsonResponse(payload, ok = true) {
  return { ok, json: async () => payload };
}

test('Ollama client sends Qwen chat and parses its response', async () => {
  let request;
  const client = createOllamaClient({
    baseUrl: 'http://ollama.test/',
    model: 'qwen3:8b',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return jsonResponse({ message: { content: 'LiftMate AI is working.' } });
    },
  });

  const result = await client.generate([{ role: 'user', content: 'Say hello.' }]);
  assert.equal(result, 'LiftMate AI is working.');
  assert.equal(request.url, 'http://ollama.test/api/chat');
  assert.deepEqual(JSON.parse(request.options.body), {
    model: 'qwen3:8b',
    messages: [{ role: 'user', content: 'Say hello.' }],
    stream: false,
    think: false,
  });
});

test('Ollama client identifies connection failure', async () => {
  const client = createOllamaClient({
    fetchImpl: async () => { throw new Error('socket details must not reach clients'); },
  });
  await assert.rejects(client.generate([{ role: 'user', content: 'Hello' }]), (error) => (
    error instanceof OllamaError && error.code === 'OLLAMA_UNAVAILABLE'
  ));
});

test('Ollama client rejects malformed chat response payloads', async () => {
  const client = createOllamaClient({ fetchImpl: async () => jsonResponse({ message: { content: 42 } }) });
  await assert.rejects(client.generate([{ role: 'user', content: 'Hello' }]), (error) => (
    error instanceof OllamaError && error.code === 'OLLAMA_MALFORMED_RESPONSE'
  ));
});

test('Ollama health checks tags without generating a model response', async () => {
  let requestedUrl;
  const client = createOllamaClient({
    fetchImpl: async (url) => {
      requestedUrl = url;
      return jsonResponse({ models: [{ name: 'qwen3:8b' }] });
    },
  });
  assert.deepEqual(await client.checkHealth(), { connection: 'available', model_available: true });
  assert.equal(requestedUrl, 'http://localhost:11434/api/tags');
});
