function setupMinutes(exercise) {
  if (exercise.equipment === 'barbell') return 3;
  if (exercise.equipment === 'machine' || exercise.equipment === 'cable') return 2.5;
  return 2;
}

export function estimateExerciseMinutes(exercise, prescription) {
  const setExecutionMinutes = prescription.sets * 0.5;
  const restMinutes = ((prescription.sets - 1) * prescription.rest_seconds) / 60;
  const transitionMinutes = 1;
  return setupMinutes(exercise) + setExecutionMinutes + restMinutes + transitionMinutes;
}

export function estimateWorkoutMinutes(exercises) {
  if (exercises.length === 0) return 0;
  const warmupAndWrapUpMinutes = 5;
  const exerciseMinutes = exercises.reduce(
    (total, entry) => total + estimateExerciseMinutes(entry.exercise, entry),
    0,
  );
  return Math.ceil(warmupAndWrapUpMinutes + exerciseMinutes);
}
