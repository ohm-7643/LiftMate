import { getAvailableCandidates, getDayCandidates } from './candidate-filter.js';
import { buildAiWorkoutMessages } from './ai-prompt.js';
import { selectSplitDay } from './splits.js';
import { AiPlanValidationError, parseAiPlanResponse, validateAiWorkoutPlan } from './ai-validation.js';
import { generateWorkout } from './index.js';

function fallbackReason(error) {
  if (error instanceof AiPlanValidationError) {
    return error.message.includes('JSON') ? 'AI response was malformed' : 'AI response failed validation';
  }
  if (error?.code === 'OLLAMA_TIMEOUT') return 'Ollama request timed out';
  if (error?.code === 'OLLAMA_UNAVAILABLE') return 'Ollama is unavailable';
  if (error?.code === 'OLLAMA_MALFORMED_RESPONSE') return 'Ollama response was malformed';
  return 'AI personalization failed';
}

export async function generateAiWorkoutPlan(profile, exercises, aiClient, { dayNumber = 1 } = {}) {
  const baseline = generateWorkout(profile, exercises, { dayNumber });
  const splitDay = selectSplitDay(profile.days_per_week, dayNumber);
  if (baseline.exercises.length === 0) {
    return {
      source: 'deterministic_fallback',
      workout: baseline,
      ai: { used: false, reason: 'AI personalization is not applicable to a rest day' },
    };
  }

  try {
    const available = getAvailableCandidates(exercises, profile.equipment);
    const allowedExercises = getDayCandidates(available, splitDay.focus);
    const messages = buildAiWorkoutMessages({ profile, splitDay, baseline, allowedExercises });
    const response = await aiClient.generate(messages, {
      format: 'json',
      options: { temperature: 0.2, num_predict: 48 },
      // Local Qwen inference is slower than hosted generation; give it a bounded three minutes.
      timeoutMs: 180_000,
    });
    const parsed = parseAiPlanResponse(response);
    const workout = validateAiWorkoutPlan(parsed, { profile, baseline, splitDay, allowedExercises });
    return {
      source: 'ollama_qwen',
      workout,
      ai: { used: true, model: aiClient.model, provider: aiClient.provider },
    };
  } catch (error) {
    return {
      source: 'deterministic_fallback',
      workout: baseline,
      ai: { used: false, reason: fallbackReason(error) },
    };
  }
}
