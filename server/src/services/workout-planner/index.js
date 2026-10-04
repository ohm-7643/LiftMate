import { getAvailableCandidates, getDayCandidates } from './candidate-filter.js';
import { estimateExerciseMinutes, estimateWorkoutMinutes } from './session-time.js';
import { selectSplitDay } from './splits.js';
import { getTargetExerciseCount, getVolumePrescription, isCompoundExercise } from './volume-rules.js';

const GOALS = new Set(['muscle_gain', 'strength', 'fat_loss', 'general_fitness']);
const EXPERIENCES = new Set(['beginner', 'intermediate', 'advanced']);
const DURATIONS = new Set([30, 45, 60, 75, 90]);
const EQUIPMENT = new Set([
  'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'resistance_band', 'ab_wheel',
]);
const MUSCLE_GROUPS = new Set([
  'back', 'chest', 'shoulders', 'biceps', 'triceps',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'core',
]);

export class IncompleteProfileError extends Error {
  constructor(fields) {
    super('The user profile is incomplete or invalid for workout planning.');
    this.name = 'IncompleteProfileError';
    this.fields = fields;
  }
}

function validateProfile(profile) {
  const fields = {};
  if (!profile || typeof profile !== 'object') {
    throw new IncompleteProfileError({ profile: 'Profile preferences are required.' });
  }
  if (!GOALS.has(profile.goal)) fields.goal = 'A supported goal is required.';
  if (!EXPERIENCES.has(profile.experience)) fields.experience = 'A supported experience level is required.';
  if (!Number.isInteger(profile.days_per_week) || profile.days_per_week < 1 || profile.days_per_week > 7) {
    fields.days_per_week = 'Training days must be from 1 to 7.';
  }
  if (!DURATIONS.has(profile.session_duration_minutes)) {
    fields.session_duration_minutes = 'A supported session duration is required.';
  }
  if (
    !Array.isArray(profile.equipment)
    || profile.equipment.length === 0
    || profile.equipment.some((item) => !EQUIPMENT.has(item))
    || new Set(profile.equipment).size !== profile.equipment.length
  ) {
    fields.equipment = 'At least one supported equipment type is required.';
  }
  if (
    !Array.isArray(profile.muscle_priorities)
    || profile.muscle_priorities.length === 0
    || profile.muscle_priorities.some((item) => !MUSCLE_GROUPS.has(item))
    || new Set(profile.muscle_priorities).size !== profile.muscle_priorities.length
  ) {
    fields.muscle_priorities = 'At least one supported muscle priority is required.';
  }
  if (Object.keys(fields).length) throw new IncompleteProfileError(fields);
}

function difficultyScore(exercise, experience) {
  const scores = {
    beginner: { beginner: 6, intermediate: 0, advanced: -8 },
    intermediate: { beginner: 1, intermediate: 5, advanced: -1 },
    advanced: { beginner: -1, intermediate: 1, advanced: 5 },
  };
  return scores[experience][exercise.difficulty] ?? -3;
}

function stableMovementScore(exercise, experience) {
  const stableEquipment = ['machine', 'cable', 'bodyweight'];
  if (stableEquipment.includes(exercise.equipment)) return experience === 'beginner' ? 3 : 1;
  return 0;
}

function scoreCandidate(exercise, profile, selected, muscleCounts, splitFocus, targetCount) {
  const selectedPatterns = new Set(selected.map(({ exercise: item }) => item.movement_pattern));
  const selectedGroups = new Set(selected.map(({ exercise: item }) => item.substitution_group));
  const primaryCount = muscleCounts.get(exercise.primary_muscle) ?? 0;
  const isPriority = profile.muscle_priorities.includes(exercise.primary_muscle);
  let score = 0;

  if (splitFocus.includes(exercise.primary_muscle)) score += 2;
  if (isPriority) score += primaryCount === 0 ? 11 : primaryCount === 1 ? 7 : -2;
  else score += primaryCount === 0 ? 6 : primaryCount === 1 ? -2 : -8;
  if (!selectedPatterns.has(exercise.movement_pattern)) score += 3;
  if (!selectedGroups.has(exercise.substitution_group)) score += 4;
  if (isCompoundExercise(exercise) && selected.length < Math.ceil(targetCount / 2)) score += 3;
  score += stableMovementScore(exercise, profile.experience);
  score += difficultyScore(exercise, profile.experience);
  return score;
}

function selectExercises(profile, splitDay, exercises) {
  const available = getAvailableCandidates(exercises, profile.equipment);
  const dayCandidates = getDayCandidates(available, splitDay.focus);
  const targetCount = getTargetExerciseCount(profile.session_duration_minutes, profile.goal);
  const maxExerciseMinutes = profile.session_duration_minutes - 5;
  const selected = [];
  const selectedIds = new Set();
  const muscleCounts = new Map();
  let usedMinutes = 0;

  while (selected.length < targetCount) {
    const remainingForDay = dayCandidates.filter((item) => !selectedIds.has(item.id));
    if (remainingForDay.length === 0) break;

    const unusedSubstitutionGroups = remainingForDay.filter(
      (item) => !selected.some((entry) => entry.exercise.substitution_group === item.substitution_group),
    );
    const candidates = unusedSubstitutionGroups.length ? unusedSubstitutionGroups : remainingForDay;
    const ranked = candidates
      .map((exercise) => {
        const prescription = getVolumePrescription(profile, exercise);
        return {
          exercise,
          ...prescription,
          score: scoreCandidate(exercise, profile, selected, muscleCounts, splitDay.focus, targetCount),
        };
      })
      .sort((left, right) => right.score - left.score || left.exercise.name.localeCompare(right.exercise.name));

    const choice = ranked.find((candidate) => (
      usedMinutes + estimateExerciseMinutes(candidate.exercise, candidate) <= maxExerciseMinutes
    ));
    if (!choice) break;

    selected.push(choice);
    selectedIds.add(choice.exercise.id);
    muscleCounts.set(
      choice.exercise.primary_muscle,
      (muscleCounts.get(choice.exercise.primary_muscle) ?? 0) + 1,
    );
    usedMinutes += estimateExerciseMinutes(choice.exercise, choice);
  }

  return selected;
}

export function generateWorkout(profile, exercises, { dayNumber = 1 } = {}) {
  validateProfile(profile);
  const splitDay = selectSplitDay(profile.days_per_week, dayNumber);

  if (splitDay.is_rest_day) {
    return {
      name: splitDay.name,
      day_number: splitDay.day_number,
      estimated_minutes: 0,
      focus: [],
      exercises: [],
    };
  }

  const selected = selectExercises(profile, splitDay, exercises);
  const priorityOrder = new Map(profile.muscle_priorities.map((muscle, index) => [muscle, index]));
  const focus = [...new Set(selected.map(({ exercise }) => exercise.primary_muscle))]
    .sort((left, right) => (
      (priorityOrder.get(left) ?? Number.MAX_SAFE_INTEGER)
      - (priorityOrder.get(right) ?? Number.MAX_SAFE_INTEGER)
      || splitDay.focus.indexOf(left) - splitDay.focus.indexOf(right)
      || left.localeCompare(right)
    ));

  const plannedExercises = selected.map(({ exercise, sets, rep_min, rep_max, rest_seconds }) => ({
    exercise_id: exercise.id,
    name: exercise.name,
    primary_muscle: exercise.primary_muscle,
    sets,
    rep_min,
    rep_max,
    rest_seconds,
  }));

  const estimatedExerciseEntries = selected.map(({ exercise, ...prescription }) => ({
    exercise,
    ...prescription,
  }));

  return {
    name: splitDay.name,
    day_number: splitDay.day_number,
    estimated_minutes: estimateWorkoutMinutes(estimatedExerciseEntries),
    focus,
    exercises: plannedExercises,
  };
}

export { selectSplitDay } from './splits.js';
