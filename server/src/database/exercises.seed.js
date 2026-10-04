const exercise = (
  name,
  primary_muscle,
  secondary_muscles,
  equipment,
  movement_pattern,
  difficulty,
  instructions,
  substitution_group,
) => ({
  name,
  primary_muscle,
  secondary_muscles: secondary_muscles.join(','),
  equipment,
  movement_pattern,
  difficulty,
  instructions,
  substitution_group,
});

export const EXERCISES = [
  // Back
  exercise('Lat Pulldown', 'back', ['biceps', 'shoulders'], 'cable', 'vertical_pull', 'beginner', 'Sit tall, secure your thighs, and pull the bar toward your upper chest without leaning far back.', 'vertical_pull'),
  exercise('Pull-Up', 'back', ['biceps', 'shoulders'], 'bodyweight', 'vertical_pull', 'advanced', 'Hang with a controlled grip, pull until your chin clears the bar, then lower to a full hang.', 'vertical_pull'),
  exercise('Assisted Pull-Up', 'back', ['biceps', 'shoulders'], 'machine', 'vertical_pull', 'beginner', 'Set assistance, grip the handles, pull your chest toward the bar, and lower under control.', 'vertical_pull'),
  exercise('Barbell Bent-Over Row', 'back', ['biceps', 'shoulders'], 'barbell', 'horizontal_pull', 'intermediate', 'Hinge at the hips with a steady back, row the bar toward your lower ribs, and lower smoothly.', 'horizontal_row'),
  exercise('Single-Arm Dumbbell Row', 'back', ['biceps', 'shoulders'], 'dumbbell', 'horizontal_pull', 'beginner', 'Brace one hand on a bench, row the dumbbell toward your hip, and avoid rotating your torso.', 'horizontal_row'),
  exercise('Seated Cable Row', 'back', ['biceps', 'shoulders'], 'cable', 'horizontal_pull', 'beginner', 'Sit tall, draw the handle toward your abdomen, and return with your arms extended without rounding.', 'horizontal_row'),
  exercise('Chest-Supported Machine Row', 'back', ['biceps', 'shoulders'], 'machine', 'horizontal_pull', 'beginner', 'Keep your chest against the pad, row the handles toward your sides, and return slowly.', 'horizontal_row'),
  exercise('Straight-Arm Cable Pulldown', 'back', ['shoulders'], 'cable', 'shoulder_extension', 'beginner', 'With a soft elbow bend, press the bar from shoulder height toward your thighs while keeping your torso steady.', 'lat_isolation'),

  // Chest
  exercise('Barbell Bench Press', 'chest', ['triceps', 'shoulders'], 'barbell', 'horizontal_push', 'intermediate', 'Keep feet planted, lower the bar to mid-chest with control, then press upward without bouncing.', 'horizontal_press'),
  exercise('Incline Dumbbell Press', 'chest', ['triceps', 'shoulders'], 'dumbbell', 'incline_push', 'intermediate', 'Set a modest bench incline, lower dumbbells beside the upper chest, and press without clanking them together.', 'incline_press'),
  exercise('Machine Chest Press', 'chest', ['triceps', 'shoulders'], 'machine', 'horizontal_push', 'beginner', 'Adjust the seat so handles align with mid-chest, press forward, and return until elbows are comfortably back.', 'horizontal_press'),
  exercise('Cable Chest Fly', 'chest', ['shoulders'], 'cable', 'horizontal_adduction', 'beginner', 'Stand between pulleys, bring softly bent arms together in front of your chest, and return with control.', 'chest_fly'),
  exercise('Push-Up', 'chest', ['triceps', 'shoulders', 'core'], 'bodyweight', 'horizontal_push', 'beginner', 'Keep a straight line from head to heels, lower your chest between your hands, then press the floor away.', 'horizontal_press'),
  exercise('Dumbbell Floor Press', 'chest', ['triceps', 'shoulders'], 'dumbbell', 'horizontal_push', 'beginner', 'Lie on the floor, lower dumbbells until your upper arms touch down gently, and press to straight arms.', 'horizontal_press'),

  // Shoulders
  exercise('Standing Barbell Overhead Press', 'shoulders', ['triceps', 'core'], 'barbell', 'vertical_push', 'intermediate', 'Brace your torso, press the bar overhead while moving your head clear, and lower to the upper chest.', 'vertical_press'),
  exercise('Seated Dumbbell Shoulder Press', 'shoulders', ['triceps'], 'dumbbell', 'vertical_push', 'beginner', 'Sit upright, start dumbbells near shoulder height, press overhead, and lower without arching your back.', 'vertical_press'),
  exercise('Machine Shoulder Press', 'shoulders', ['triceps'], 'machine', 'vertical_push', 'beginner', 'Set the seat so handles start near shoulder level, press upward, and lower smoothly to a comfortable depth.', 'vertical_press'),
  exercise('Dumbbell Lateral Raise', 'shoulders', [], 'dumbbell', 'shoulder_abduction', 'beginner', 'Raise light dumbbells out to your sides with soft elbows, stopping around shoulder height without swinging.', 'lateral_raise'),
  exercise('Cable Lateral Raise', 'shoulders', [], 'cable', 'shoulder_abduction', 'intermediate', 'Stand beside a low cable, raise your arm out to the side to shoulder height, then lower slowly.', 'lateral_raise'),
  exercise('Reverse Pec Deck', 'shoulders', ['back'], 'machine', 'horizontal_abduction', 'beginner', 'Face the machine pad, sweep the handles outward with soft elbows, and avoid shrugging.', 'rear_delt_fly'),
  exercise('Cable Face Pull', 'shoulders', ['back'], 'cable', 'horizontal_pull', 'beginner', 'Set the rope around face height, pull toward your forehead with elbows high, and return under control.', 'rear_delt_fly'),

  // Biceps
  exercise('Barbell Curl', 'biceps', ['forearms'], 'barbell', 'elbow_flexion', 'beginner', 'Stand tall with elbows by your sides, curl the bar without swinging, and lower fully under control.', 'supinated_curl'),
  exercise('Alternating Dumbbell Curl', 'biceps', ['forearms'], 'dumbbell', 'elbow_flexion', 'beginner', 'Curl one dumbbell at a time, keep your upper arm still, and lower before switching sides.', 'supinated_curl'),
  exercise('Incline Dumbbell Curl', 'biceps', ['forearms'], 'dumbbell', 'elbow_flexion', 'intermediate', 'Sit back on an incline bench, let arms hang comfortably, curl without moving your shoulders, then lower slowly.', 'supinated_curl'),
  exercise('Cable Curl', 'biceps', ['forearms'], 'cable', 'elbow_flexion', 'beginner', 'Stand facing a low cable, keep elbows close to your sides, curl the handle, and return with control.', 'supinated_curl'),
  exercise('Dumbbell Hammer Curl', 'biceps', ['forearms'], 'dumbbell', 'elbow_flexion', 'beginner', 'Keep palms facing each other, curl the dumbbells without swinging, and lower to straight arms.', 'neutral_grip_curl'),

  // Triceps
  exercise('Cable Triceps Pushdown', 'triceps', [], 'cable', 'elbow_extension', 'beginner', 'Keep elbows tucked, press the handle down until arms straighten, and return without letting elbows drift.', 'triceps_extension'),
  exercise('Overhead Cable Triceps Extension', 'triceps', ['shoulders'], 'cable', 'overhead_elbow_extension', 'beginner', 'Face away from a low cable, keep upper arms near your head, extend your elbows, and bend them slowly.', 'overhead_triceps_extension'),
  exercise('Dumbbell Skull Crusher', 'triceps', ['shoulders'], 'dumbbell', 'elbow_extension', 'intermediate', 'Lie on a bench, lower dumbbells beside your forehead by bending elbows, then extend without flaring upper arms.', 'lying_triceps_extension'),
  exercise('Close-Grip Bench Press', 'triceps', ['chest', 'shoulders'], 'barbell', 'horizontal_push', 'intermediate', 'Use a comfortable narrow grip, lower the bar to the lower chest, and press while keeping wrists stacked.', 'triceps_press'),
  exercise('Bench Dip', 'triceps', ['shoulders', 'chest'], 'bodyweight', 'elbow_extension', 'intermediate', 'Place hands on a stable bench, bend elbows only as far as comfortable, then press back up.', 'triceps_press'),

  // Quadriceps
  exercise('Barbell Back Squat', 'quadriceps', ['glutes', 'hamstrings', 'core'], 'barbell', 'squat', 'advanced', 'Brace before descending, keep knees tracking over toes, reach a controlled depth, then stand through the whole foot.', 'bilateral_squat'),
  exercise('Dumbbell Goblet Squat', 'quadriceps', ['glutes', 'core'], 'dumbbell', 'squat', 'beginner', 'Hold one dumbbell at your chest, sit between your hips with knees tracking over toes, and stand tall.', 'bilateral_squat'),
  exercise('Leg Press', 'quadriceps', ['glutes', 'hamstrings'], 'machine', 'squat', 'beginner', 'Set feet about shoulder-width, lower the platform until hips stay against the pad, then press without locking knees.', 'bilateral_squat'),
  exercise('Leg Extension', 'quadriceps', [], 'machine', 'knee_extension', 'beginner', 'Align the machine pivot with your knee, straighten your legs smoothly, then lower without dropping the weight.', 'knee_extension'),
  exercise('Dumbbell Bulgarian Split Squat', 'quadriceps', ['glutes'], 'dumbbell', 'unilateral_squat', 'intermediate', 'Place your rear foot on a bench, lower under control with the front knee tracking over toes, then stand.', 'unilateral_squat'),
  exercise('Dumbbell Step-Up', 'quadriceps', ['glutes'], 'dumbbell', 'step_up', 'beginner', 'Step onto a stable box with one foot, drive through that foot to stand, and step down under control.', 'unilateral_squat'),

  // Hamstrings
  exercise('Barbell Romanian Deadlift', 'hamstrings', ['glutes', 'back'], 'barbell', 'hip_hinge', 'intermediate', 'Keep the bar close, push hips back with a slight knee bend, stop when hamstrings limit the hinge, then stand.', 'hip_hinge'),
  exercise('Dumbbell Romanian Deadlift', 'hamstrings', ['glutes', 'back'], 'dumbbell', 'hip_hinge', 'beginner', 'Hold dumbbells near your legs, hinge hips back with soft knees, then drive hips forward to stand.', 'hip_hinge'),
  exercise('Lying Leg Curl', 'hamstrings', [], 'machine', 'knee_flexion', 'beginner', 'Align knees with the machine pivot, curl the pad toward your hips, and lower slowly.', 'knee_flexion'),
  exercise('Seated Leg Curl', 'hamstrings', [], 'machine', 'knee_flexion', 'beginner', 'Adjust the pads securely, curl your heels beneath the seat, and return until legs are comfortably extended.', 'knee_flexion'),
  exercise('Barbell Good Morning', 'hamstrings', ['glutes', 'back'], 'barbell', 'hip_hinge', 'advanced', 'With a light load and soft knees, hinge at the hips while keeping your back steady, then return upright.', 'hip_hinge'),

  // Glutes
  exercise('Barbell Hip Thrust', 'glutes', ['hamstrings'], 'barbell', 'hip_extension', 'intermediate', 'Rest your upper back on a bench, brace, drive hips up until torso and thighs align, and lower smoothly.', 'hip_extension'),
  exercise('Glute Bridge', 'glutes', ['hamstrings', 'core'], 'bodyweight', 'hip_extension', 'beginner', 'Lie with knees bent, brace gently, lift hips until your body forms a straight line, and lower under control.', 'hip_extension'),
  exercise('Cable Glute Kickback', 'glutes', ['hamstrings'], 'cable', 'hip_extension', 'beginner', 'With an ankle strap and steady torso, extend one leg behind you without arching your back, then return slowly.', 'hip_extension'),
  exercise('Resistance Band Lateral Walk', 'glutes', [], 'resistance_band', 'hip_abduction', 'beginner', 'Place a band above your knees or ankles, keep knees softly bent, and take controlled side steps.', 'hip_abduction'),
  exercise('Single-Leg Dumbbell Romanian Deadlift', 'glutes', ['hamstrings', 'back'], 'dumbbell', 'single_leg_hip_hinge', 'intermediate', 'Balance on one leg, hinge while the free leg reaches back, keep hips level, and return upright steadily.', 'single_leg_hip_hinge'),
  exercise('Barbell Sumo Deadlift', 'glutes', ['quadriceps', 'hamstrings', 'back'], 'barbell', 'sumo_deadlift', 'advanced', 'Use a wide stance, brace before lifting, push the floor away, and lower the bar close to your legs.', 'sumo_deadlift'),

  // Calves
  exercise('Standing Machine Calf Raise', 'calves', [], 'machine', 'ankle_plantar_flexion', 'beginner', 'Lower your heels into a comfortable stretch, rise onto the balls of your feet, and pause briefly.', 'straight_knee_calf_raise'),
  exercise('Seated Machine Calf Raise', 'calves', [], 'machine', 'ankle_plantar_flexion', 'beginner', 'Keep knees under the pad, lower heels under control, then raise them as high as comfortable.', 'bent_knee_calf_raise'),
  exercise('Single-Leg Bodyweight Calf Raise', 'calves', [], 'bodyweight', 'ankle_plantar_flexion', 'beginner', 'Stand near support, rise onto the toes of one foot, pause, then lower your heel slowly.', 'straight_knee_calf_raise'),
  exercise('Leg Press Calf Raise', 'calves', [], 'machine', 'ankle_plantar_flexion', 'beginner', 'With knees softly bent and forefeet on the platform, lower heels carefully and press through the toes.', 'straight_knee_calf_raise'),

  // Core
  exercise('Front Plank', 'core', ['shoulders', 'glutes'], 'bodyweight', 'anti_extension', 'beginner', 'Support yourself on forearms and toes, keep ribs and hips aligned, and breathe while holding steady.', 'anti_extension'),
  exercise('Side Plank', 'core', ['shoulders', 'glutes'], 'bodyweight', 'anti_lateral_flexion', 'beginner', 'Stack or stagger your feet, lift hips into a straight line, and keep your top shoulder relaxed.', 'anti_lateral_flexion'),
  exercise('Dead Bug', 'core', [], 'bodyweight', 'anti_extension', 'beginner', 'Lie on your back, brace gently, lower opposite arm and leg without your lower back lifting, then switch.', 'anti_extension'),
  exercise('Cable Crunch', 'core', [], 'cable', 'trunk_flexion', 'beginner', 'Kneel at a high cable, curl your ribs toward your pelvis, and return without pulling with your arms.', 'trunk_flexion'),
  exercise('Pallof Press', 'core', ['shoulders'], 'cable', 'anti_rotation', 'beginner', 'Stand side-on to a cable, press the handle away from your chest, resist turning, and bring it back.', 'anti_rotation'),
  exercise('Hanging Knee Raise', 'core', ['shoulders'], 'bodyweight', 'hip_flexion', 'intermediate', 'Hang from a stable bar, bring knees toward your torso without swinging, and lower with control.', 'hanging_core_raise'),
  exercise('Ab Wheel Rollout', 'core', ['shoulders', 'back'], 'ab_wheel', 'anti_extension', 'advanced', 'Kneel with a braced torso, roll forward only as far as you can keep your back steady, then return.', 'anti_extension'),
];

const upsertExercise = `
  INSERT INTO exercises (
    name,
    primary_muscle,
    secondary_muscles,
    equipment,
    movement_pattern,
    difficulty,
    instructions,
    substitution_group
  ) VALUES (
    @name,
    @primary_muscle,
    @secondary_muscles,
    @equipment,
    @movement_pattern,
    @difficulty,
    @instructions,
    @substitution_group
  )
  ON CONFLICT(name COLLATE NOCASE) DO UPDATE SET
    primary_muscle = excluded.primary_muscle,
    secondary_muscles = excluded.secondary_muscles,
    equipment = excluded.equipment,
    movement_pattern = excluded.movement_pattern,
    difficulty = excluded.difficulty,
    instructions = excluded.instructions,
    substitution_group = excluded.substitution_group
  WHERE exercises.primary_muscle IS NOT excluded.primary_muscle
     OR exercises.secondary_muscles IS NOT excluded.secondary_muscles
     OR exercises.equipment IS NOT excluded.equipment
     OR exercises.movement_pattern IS NOT excluded.movement_pattern
     OR exercises.difficulty IS NOT excluded.difficulty
     OR exercises.instructions IS NOT excluded.instructions
     OR exercises.substitution_group IS NOT excluded.substitution_group
`;

export function seedExercises(database) {
  const before = database.prepare('SELECT COUNT(*) AS count FROM exercises').get().count;
  const seed = database.transaction(() => {
    const statement = database.prepare(upsertExercise);
    for (const entry of EXERCISES) statement.run(entry);
  });
  seed();

  const total = database.prepare('SELECT COUNT(*) AS count FROM exercises').get().count;
  return { added: total - before, total };
}
