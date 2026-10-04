import { getVolumePrescription } from './volume-rules.js';
import { estimateWorkoutMinutes } from './session-time.js';

const MUSCLES = new Set([
  'back', 'chest', 'shoulders', 'biceps', 'triceps',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'core',
]);
const ROOT_KEYS = new Set(['priority_exercise_ids', 'reasoning', 'coaching_note']);
const GOAL_REPS = {
  muscle_gain: [6, 15],
  strength: [3, 8],
  fat_loss: [8, 15],
  general_fitness: [8, 15],
};
const GOAL_REST = {
  muscle_gain: [45, 180],
  strength: [90, 300],
  fat_loss: [30, 150],
  general_fitness: [30, 180],
};
const EXPERIENCE_SET_LIMIT = { beginner: 3, intermediate: 4, advanced: 5 };

export class AiPlanValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AiPlanValidationError';
  }
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AiPlanValidationError(`${label} must be an object.`);
  }
}

function requireText(value, label, { min = 1, max }) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) {
    throw new AiPlanValidationError(`${label} is missing or outside its allowed length.`);
  }
  const outOfScopeAdvice = /\b(diagnos(?:e|is|ed)?|treat(?:ment)?|cure|rehabilitat(?:e|ion)|medical advice|injur(?:y|ies)|progressive overload|workout history|logging)\b/i;
  if (outOfScopeAdvice.test(value)) {
    throw new AiPlanValidationError(`${label} contains out-of-scope or unsafe advice.`);
  }
  return value.trim();
}

export function parseAiPlanResponse(text) {
  if (typeof text !== 'string') throw new AiPlanValidationError('AI response must be text.');
  let jsonText = text.trim();
  const fenced = jsonText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) jsonText = fenced[1];
  try {
    return JSON.parse(jsonText);
  } catch {
    throw new AiPlanValidationError('AI response is not valid JSON.');
  }
}

export function validateAiWorkoutPlan(output, { profile, baseline, splitDay, allowedExercises }) {
  requireObject(output, 'AI workout');
  if (Object.keys(output).some((key) => !ROOT_KEYS.has(key))) {
    throw new AiPlanValidationError('AI workout contains unsupported fields.');
  }
  const reasoning = requireText(output.reasoning, 'reasoning', { min: 8, max: 400 });
  const coachingNote = requireText(output.coaching_note, 'coaching_note', { min: 4, max: 240 });
  if (
    !Array.isArray(output.priority_exercise_ids)
    || output.priority_exercise_ids.length === 0
    || output.priority_exercise_ids.length > Math.min(2, baseline.exercises.length)
  ) {
    throw new AiPlanValidationError('AI workout must include one or two allowed priority exercises.');
  }

  const allowedById = new Map(allowedExercises.map((exercise) => [exercise.id, exercise]));
  const baselineById = new Map(baseline.exercises.map((entry) => [entry.exercise_id, entry]));
  const seenIds = new Set();
  const priorityIds = output.priority_exercise_ids.map((id) => {
    if (!Number.isSafeInteger(id) || !allowedById.has(id)) {
      throw new AiPlanValidationError('AI selected an exercise outside the allowed exercise set.');
    }
    if (seenIds.has(id)) throw new AiPlanValidationError('AI selected a duplicate exercise.');
    seenIds.add(id);

    const exercise = allowedById.get(id);
    if (!profile.equipment.includes(exercise.equipment) && exercise.equipment !== 'bodyweight') {
      throw new AiPlanValidationError('AI selected unavailable equipment.');
    }
    if (!splitDay.focus.includes(exercise.primary_muscle)) {
      throw new AiPlanValidationError('AI selected an exercise outside the training day focus.');
    }
    return id;
  });

  const finalIds = baseline.exercises.map((entry) => entry.exercise_id);
  for (const id of priorityIds) {
    if (baselineById.has(id)) continue;
    const exercise = allowedById.get(id);
    let replaceIndex = finalIds.findIndex((baselineId) => (
      !priorityIds.includes(baselineId)
      && baselineById.get(baselineId).primary_muscle === exercise.primary_muscle
    ));
    if (replaceIndex === -1) {
      replaceIndex = finalIds.findIndex((baselineId) => (
        !priorityIds.includes(baselineId)
        && !profile.muscle_priorities.includes(baselineById.get(baselineId).primary_muscle)
      ));
    }
    if (replaceIndex === -1) replaceIndex = finalIds.findIndex((baselineId) => !priorityIds.includes(baselineId));
    if (replaceIndex === -1) throw new AiPlanValidationError('AI selections cannot be composed with the baseline.');
    finalIds[replaceIndex] = id;
  }

  const orderedIds = [...priorityIds, ...finalIds.filter((id) => !priorityIds.includes(id))];
  const baselineByMuscle = new Map();
  for (const entry of baseline.exercises) {
    if (!baselineByMuscle.has(entry.primary_muscle)) baselineByMuscle.set(entry.primary_muscle, entry);
  }
  const exercises = orderedIds.map((id) => {
    const exercise = allowedById.get(id);
    const baselineExercise = baselineByMuscle.get(exercise.primary_muscle);

    // Retain baseline prescriptions for matching muscles; derive a deterministic
    // goal/experience prescription when Qwen selects a valid alternative.
    const prescription = baselineExercise
      ? {
        sets: baselineExercise.sets,
        rep_min: baselineExercise.rep_min,
        rep_max: baselineExercise.rep_max,
        rest_seconds: baselineExercise.rest_seconds,
      }
      : getVolumePrescription(profile, exercise);
    return {
      exercise_id: exercise.id,
      name: exercise.name,
      primary_muscle: exercise.primary_muscle,
      ...prescription,
    };
  });

  const [repLow, repHigh] = GOAL_REPS[profile.goal];
  const [restLow, restHigh] = GOAL_REST[profile.goal];
  for (const exercise of exercises) {
    if (!Number.isInteger(exercise.sets) || exercise.sets < 1 || exercise.sets > EXPERIENCE_SET_LIMIT[profile.experience]) {
      throw new AiPlanValidationError('Composed workout set count is outside experience bounds.');
    }
    if (
      !Number.isInteger(exercise.rep_min)
      || !Number.isInteger(exercise.rep_max)
      || exercise.rep_min < repLow
      || exercise.rep_max > repHigh
      || exercise.rep_min > exercise.rep_max
    ) {
      throw new AiPlanValidationError('Composed workout reps are outside goal bounds.');
    }
    if (!Number.isInteger(exercise.rest_seconds) || exercise.rest_seconds < restLow || exercise.rest_seconds > restHigh) {
      throw new AiPlanValidationError('Composed workout rest is outside goal bounds.');
    }
  }

  const validSelectedMuscles = new Set(exercises.map((exercise) => exercise.primary_muscle));
  if ([...validSelectedMuscles].some((muscle) => !MUSCLES.has(muscle))) {
    throw new AiPlanValidationError('AI selected an unsupported muscle group.');
  }
  const priorityOrder = new Map(profile.muscle_priorities.map((muscle, index) => [muscle, index]));
  const focus = [...validSelectedMuscles].sort((left, right) => (
    (priorityOrder.get(left) ?? Number.MAX_SAFE_INTEGER)
    - (priorityOrder.get(right) ?? Number.MAX_SAFE_INTEGER)
    || splitDay.focus.indexOf(left) - splitDay.focus.indexOf(right)
    || left.localeCompare(right)
  ));

  const allowedBySelectedId = new Map(allowedExercises.map((exercise) => [exercise.id, exercise]));
  const estimatedMinutes = estimateWorkoutMinutes(exercises.map((entry) => ({
    exercise: allowedBySelectedId.get(entry.exercise_id),
    sets: entry.sets,
    rest_seconds: entry.rest_seconds,
  })));
  if (estimatedMinutes > profile.session_duration_minutes + 5) {
    throw new AiPlanValidationError('AI-selected exercises exceed the session duration.');
  }

  return {
    name: baseline.name,
    day_number: splitDay.day_number,
    estimated_minutes: estimatedMinutes,
    focus,
    exercises,
    reasoning,
    coaching_note: coachingNote,
  };
}
