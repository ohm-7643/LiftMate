export function buildAiWorkoutMessages({ profile, splitDay, baseline, allowedExercises }) {
  const preferredExerciseCount = Math.min(2, baseline.exercises.length);
  const context = {
    user_profile: {
      goal: profile.goal,
      experience: profile.experience,
      days_per_week: profile.days_per_week,
      session_duration_minutes: profile.session_duration_minutes,
      equipment: profile.equipment,
      muscle_priorities: profile.muscle_priorities,
    },
    training_day: splitDay,
    deterministic_baseline: baseline,
    allowed_exercises: allowedExercises.map((exercise) => ({
      exercise_id: exercise.id,
      name: exercise.name,
      primary_muscle: exercise.primary_muscle,
      equipment: exercise.equipment,
    })),
    output_schema: {
      priority_exercise_ids: ['one or two allowed exercise_id integers'],
      reasoning: 'short string',
      coaching_note: 'short string',
    },
  };

  return [
    {
      role: 'system',
      content: [
        'You are LiftMate, a fitness planning assistant. Personalize the provided deterministic workout for the user profile.',
        'The deterministic baseline and allowed exercise list are hard constraints. Select only listed exercise IDs, preserve the selected training day, respect equipment and session duration, and do not invent exercises or arbitrary fields.',
        'Choose and order a reasonable subset of allowed exercises to emphasize the user priorities. Keep the count close to the baseline. The application applies deterministic sets, reps, rest, and session-time constraints after your selection.',
        'Do not diagnose medical conditions, give medical advice, or prescribe injury treatment.',
        'Do not discuss progressive overload, workout history, logging, or features outside this planning request.',
        `Choose exactly ${preferredExerciseCount} priority exercise IDs. Return compact JSON with priority_exercise_ids, reasoning, and coaching_note only. priority_exercise_ids must contain only allowed exercise_id integers with no duplicates. Keep reasoning/coaching_note to six words each. Do not use markdown or add fields or text outside JSON.`,
        'Include concise reasoning and a short practical coaching note.',
      ].join(' '),
    },
    {
      role: 'user',
      content: `Personalize this workout using the supplied profile and constraints:\n${JSON.stringify(context)}`,
    },
  ];
}
