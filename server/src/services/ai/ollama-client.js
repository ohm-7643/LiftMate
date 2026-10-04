const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen3:8b';
// Local model startup and first-token latency can be much higher than hosted APIs.
const DEFAULT_TIMEOUT_MS = 120_000;

export class OllamaError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'OllamaError';
    this.code = code;
  }
}

async function requestJson(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      throw new OllamaError('OLLAMA_UNAVAILABLE', 'The Ollama server returned an unsuccessful response.');
    }
    try {
      return await response.json();
    } catch {
      throw new OllamaError('OLLAMA_MALFORMED_RESPONSE', 'The Ollama server returned invalid JSON.');
    }
  } catch (error) {
    if (error instanceof OllamaError) throw error;
    if (controller.signal.aborted) {
      throw new OllamaError('OLLAMA_TIMEOUT', 'The Ollama request timed out.');
    }
    throw new OllamaError('OLLAMA_UNAVAILABLE', 'The Ollama server could not be reached.');
  } finally {
    clearTimeout(timeout);
  }
}

export function createOllamaClient({
  baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL,
  model = process.env.OLLAMA_MODEL || DEFAULT_MODEL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

  return {
    provider: 'ollama',
    model,

    async checkHealth() {
      const payload = await requestJson(
        fetchImpl,
        `${normalizedBaseUrl}/api/tags`,
        { method: 'GET' },
        timeoutMs,
      );
      if (!payload || !Array.isArray(payload.models)) {
        throw new OllamaError('OLLAMA_MALFORMED_RESPONSE', 'The Ollama model list was malformed.');
      }
      return {
        connection: 'available',
        model_available: payload.models.some((entry) => entry?.name === model),
      };
    },

    async generate(messages) {
      if (!Array.isArray(messages) || messages.length === 0) {
        throw new TypeError('At least one chat message is required.');
      }
      const payload = await requestJson(
        fetchImpl,
        `${normalizedBaseUrl}/api/chat`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ model, messages, stream: false, think: false }),
        },
        timeoutMs,
      );
      const response = payload?.message?.content;
      if (typeof response !== 'string' || response.trim().length === 0) {
        throw new OllamaError('OLLAMA_MALFORMED_RESPONSE', 'The Ollama chat response was malformed.');
      }
      return response.trim();
    },
  };
}

export { DEFAULT_BASE_URL, DEFAULT_MODEL };
