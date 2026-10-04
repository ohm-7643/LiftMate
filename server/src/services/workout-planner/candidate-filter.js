export function getAvailableCandidates(exercises, equipment) {
  const availableEquipment = new Set([...equipment, 'bodyweight']);
  return exercises.filter((exercise) => availableEquipment.has(exercise.equipment));
}

export function getDayCandidates(exercises, focus) {
  const focusedMuscles = new Set(focus);
  return exercises.filter((exercise) => focusedMuscles.has(exercise.primary_muscle));
}
