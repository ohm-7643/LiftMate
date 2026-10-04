const COMPOUND_PATTERNS = new Set([
  'squat',
  'horizontal_push',
  'incline_push',
  'vertical_push',
  'horizontal_pull',
  'vertical_pull',
  'hip_hinge',
  'unilateral_squat',
  'step_up',
  'hip_extension',
  'single_leg_hip_hinge',
  'sumo_deadlift',
]);

export function isCompoundExercise(exercise) {
  return COMPOUND_PATTERNS.has(exercise.movement_pattern);
}

export function getVolumePrescription(profile, exercise) {
  const compound = isCompoundExercise(exercise);
  const priority = profile.muscle_priorities.includes(exercise.primary_muscle);
  const { goal, experience } = profile;

  let sets = experience === 'beginner' ? 2 : 3;
  if (goal === 'strength' && experience === 'advanced') sets = 3;
  if (goal !== 'strength' && experience === 'advanced' && priority) sets = 4;

  let repRange;
  let restSeconds;
  if (goal === 'muscle_gain') {
    repRange = compound ? [6, 10] : [8, 12];
    restSeconds = compound ? 105 : 75;
  } else if (goal === 'strength') {
    repRange = compound ? [4, 6] : [6, 8];
    restSeconds = compound ? 180 : 120;
  } else if (goal === 'fat_loss') {
    repRange = compound ? [8, 12] : [10, 15];
    restSeconds = compound ? 75 : 60;
  } else {
    repRange = compound ? [8, 12] : [10, 15];
    restSeconds = compound ? 90 : 75;
  }

  return {
    sets,
    rep_min: repRange[0],
    rep_max: repRange[1],
    rest_seconds: restSeconds,
  };
}

export function getTargetExerciseCount(durationMinutes, goal) {
  const base = durationMinutes <= 30 ? 3
    : durationMinutes <= 45 ? 4
      : durationMinutes <= 60 ? 5
        : durationMinutes <= 75 ? 6
          : 7;
  return goal === 'strength' ? Math.max(2, base - 1) : base;
}
