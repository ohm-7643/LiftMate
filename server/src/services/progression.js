export function recommendNextSession(rows) {
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.workout_exercise_id)) {
      grouped.set(row.workout_exercise_id, { ...row, sets: [] });
    }
    if (row.set_number != null) {
      grouped.get(row.workout_exercise_id).sets.push({
        set_number: row.set_number,
        weight_kg: row.weight_kg,
        reps: row.reps,
      });
    }
  }

  return [...grouped.values()].map((exercise) => {
    const sets = exercise.sets.sort((a, b) => a.set_number - b.set_number);
    const currentWeight = sets.length ? sets[0].weight_kg : null;
    const reachedTop = sets.length >= exercise.target_sets
      && sets.every((set) => Number.isFinite(set.reps) && set.reps >= exercise.rep_max);
    if (reachedTop && Number.isFinite(currentWeight)) {
      return {
        workout_exercise_id: exercise.workout_exercise_id,
        exercise_id: exercise.exercise_id,
        name: exercise.name,
        recommendation: 'increase_weight',
        previous_weight_kg: currentWeight,
        recommended_weight_kg: Math.round((currentWeight + 2.5) * 100) / 100,
        rep_min: exercise.rep_min,
        rep_max: exercise.rep_max,
        target_reps: sets.map(() => exercise.rep_min),
        message: `All logged sets reached ${exercise.rep_max} reps. Try a small weight increase next time.`,
      };
    }

    return {
      workout_exercise_id: exercise.workout_exercise_id,
      exercise_id: exercise.exercise_id,
      name: exercise.name,
      recommendation: 'add_reps',
      previous_weight_kg: currentWeight,
      recommended_weight_kg: currentWeight,
      rep_min: exercise.rep_min,
      rep_max: exercise.rep_max,
      target_reps: sets.map((set) => Math.min(exercise.rep_max, (set.reps ?? exercise.rep_min - 1) + 1)),
      message: `Keep the same weight and aim to add reps within the ${exercise.rep_min}–${exercise.rep_max} rep range.`,
    };
  });
}
