const FULL_BODY_A = [
  'quadriceps', 'chest', 'back', 'hamstrings', 'glutes',
  'shoulders', 'biceps', 'triceps', 'calves', 'core',
];
const FULL_BODY_B = [
  'back', 'glutes', 'shoulders', 'quadriceps', 'chest',
  'hamstrings', 'calves', 'biceps', 'triceps', 'core',
];
const FULL_BODY_C = [
  'hamstrings', 'chest', 'back', 'glutes', 'quadriceps',
  'shoulders', 'triceps', 'biceps', 'core', 'calves',
];
const UPPER = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'core'];
const LOWER = ['quadriceps', 'hamstrings', 'glutes', 'calves', 'core'];
const PUSH = ['chest', 'shoulders', 'triceps'];
const PULL = ['back', 'biceps', 'shoulders'];
const LEGS = ['quadriceps', 'hamstrings', 'glutes', 'calves', 'core'];

const day = (name, focus, is_rest_day = false) => ({ name, focus, is_rest_day });

const SCHEDULES = {
  1: [day('Full Body', FULL_BODY_A)],
  2: [day('Upper', UPPER), day('Lower', LOWER)],
  3: [
    day('Full Body A', FULL_BODY_A),
    day('Full Body B', FULL_BODY_B),
    day('Full Body C', FULL_BODY_C),
  ],
  4: [
    day('Upper A', UPPER),
    day('Lower A', LOWER),
    day('Upper B', [...UPPER].reverse()),
    day('Lower B', [...LOWER].reverse()),
  ],
  5: [day('Push', PUSH), day('Pull', PULL), day('Legs', LEGS), day('Upper', UPPER), day('Lower', LOWER)],
  6: [
    day('Push A', PUSH), day('Pull A', PULL), day('Legs A', LEGS),
    day('Push B', PUSH), day('Pull B', PULL), day('Legs B', LEGS),
  ],
  7: [
    day('Push A', PUSH), day('Pull A', PULL), day('Legs A', LEGS),
    day('Push B', PUSH), day('Pull B', PULL), day('Legs B', LEGS),
    day('Recovery / Rest', [], true),
  ],
};

export function getWeeklySplit(daysPerWeek) {
  const schedule = SCHEDULES[daysPerWeek];
  if (!schedule) throw new RangeError('days_per_week must be from 1 to 7.');
  return schedule.map((entry, index) => ({
    day_number: index + 1,
    name: entry.name,
    focus: [...entry.focus],
    is_rest_day: Boolean(entry.is_rest_day),
  }));
}

export function selectSplitDay(daysPerWeek, dayNumber = 1) {
  const schedule = getWeeklySplit(daysPerWeek);
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > schedule.length) {
    throw new RangeError(`day_number must be from 1 to ${schedule.length}.`);
  }
  return schedule[dayNumber - 1];
}
