const selectColumns = `
  id,
  name,
  primary_muscle,
  secondary_muscles,
  equipment,
  movement_pattern,
  difficulty,
  instructions,
  substitution_group
`;

function toExercise(row) {
  if (!row) return null;
  return {
    ...row,
    secondary_muscles: row.secondary_muscles
      ? row.secondary_muscles.split(',')
      : [],
  };
}

export function listExercises(database, filters = {}) {
  const rows = database.prepare(`
    SELECT ${selectColumns}
    FROM exercises
    WHERE (
      @muscle IS NULL
      OR primary_muscle = @muscle
      OR instr(',' || secondary_muscles || ',', ',' || @muscle || ',') > 0
    )
      AND (@equipment IS NULL OR equipment = @equipment)
      AND (@movement_pattern IS NULL OR movement_pattern = @movement_pattern)
      AND (@difficulty IS NULL OR difficulty = @difficulty)
    ORDER BY name COLLATE NOCASE
  `).all({
    muscle: filters.muscle ?? null,
    equipment: filters.equipment ?? null,
    movement_pattern: filters.movement_pattern ?? null,
    difficulty: filters.difficulty ?? null,
  });

  return rows.map(toExercise);
}

export function findExerciseById(database, id) {
  const row = database.prepare(`
    SELECT ${selectColumns}
    FROM exercises
    WHERE id = ?
  `).get(id);

  return toExercise(row);
}
