import { Router } from 'express';
const MAX_MESSAGE_LENGTH = 4_000;
const ERROR_MESSAGES = {
  OLLAMA_UNAVAILABLE: 'The local Ollama server is unavailable.',
  OLLAMA_TIMEOUT: 'The local Ollama server did not respond in time.',
  OLLAMA_MALFORMED_RESPONSE: 'The local Ollama server returned an invalid response.',
};

function serviceErrorStatus(error) {
  if (error.code === 'OLLAMA_TIMEOUT') return 504;
  if (error.code === 'OLLAMA_UNAVAILABLE') return 503;
  if (error.code === 'OLLAMA_MALFORMED_RESPONSE') return 502;
  return 500;
}

export function createAiRouter(aiClient) {
  const router = Router();

  router.get('/health/ai', async (_request, response) => {
    try {
      const health = await aiClient.checkHealth();
      const available = health.connection === 'available' && health.model_available;
      return response.status(available ? 200 : 503).json({
        provider: aiClient.provider,
        model: aiClient.model,
        connection: health.connection,
        model_available: health.model_available,
      });
    } catch (error) {
      const status = serviceErrorStatus(error);
      return response.status(status === 500 ? 503 : status).json({
        provider: aiClient.provider,
        model: aiClient.model,
        connection: 'unavailable',
        model_available: false,
        error: {
          code: error.code ?? 'OLLAMA_UNAVAILABLE',
          message: ERROR_MESSAGES[error.code] ?? ERROR_MESSAGES.OLLAMA_UNAVAILABLE,
        },
      });
    }
  });

  router.post('/ai/chat', async (request, response) => {
    const message = request.body?.message;
    if (typeof message !== 'string' || message.trim().length === 0) {
      return response.status(400).json({
        error: { code: 'INVALID_MESSAGE', message: 'message must be a non-empty string.' },
      });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return response.status(400).json({
        error: { code: 'MESSAGE_TOO_LARGE', message: `message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` },
      });
    }

    try {
      const result = await aiClient.generate([{ role: 'user', content: message.trim() }]);
      return response.json({ response: result, model: aiClient.model, provider: aiClient.provider });
    } catch (error) {
      const status = serviceErrorStatus(error);
      return response.status(status).json({
        error: {
          code: error.code ?? 'AI_REQUEST_FAILED',
          message: ERROR_MESSAGES[error.code] ?? 'The AI request could not be completed.',
        },
      });
    }
  });

  return router;
}

export default createAiRouter;
