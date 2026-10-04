import AiCoachCard from './AiCoachCard.jsx';

function formatDate(dateValue) {
  if (!dateValue) return '';
  const date = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? dateValue
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function weekStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function LoadingHome({ error, onRetry }) {
  return (
    <main className="training-page" aria-busy={!error} aria-live="polite">
      <TrainingHeader status={error ? 'RETRY NEEDED' : 'QWEN WORKING'} />
      <section className="training-loading">
        <div className="loading-orbit" aria-hidden="true"><span /></div>
        <p className="eyebrow">YOUR TRAINING PLAN</p>
        <h1>{error ? 'Your session needs another try' : 'Building your session'}</h1>
        <p>{error || 'Checking your goals, equipment and training priorities…'}</p>
        {error ? <button className="workout-primary home-start" type="button" onClick={onRetry}>Try again <span aria-hidden="true">↗</span></button>
          : <div className="skeleton-row" aria-hidden="true"><i /><i /><i /></div>}
      </section>
    </main>
  );
}

export function TrainingHeader({ status = 'LOCAL MODEL' }) {
  return (
    <header className="training-header">
      <a className="brand" href="#training-home" aria-label="LiftMate home">
        <span className="brand__mark" aria-hidden="true"><span /></span><span>liftmate</span>
      </a>
      <span className="training-header__label">YOUR TRAINING SPACE</span>
      <span className="training-header__local"><i /> {status}
      </span>
    </header>
  );
}

export default function WorkoutHome({ savedProfile, plan, history, historyLoading, historyError, busy, error, onStart, onRetry }) {
  if (!plan) return <LoadingHome error={error} onRetry={onRetry} />;
  const workout = plan.workout;
  const week = weekStart();
  const completedThisWeek = history.filter((item) => (
    item.status === 'completed' && new Date(`${item.workout_date}T00:00:00`) >= week
  )).length;
  const goalDays = savedProfile.preferences.days_per_week;
  const weeklyFill = Math.min(100, (completedThisWeek / goalDays) * 100);
  const recent = history.find((item) => item.status === 'completed') ?? history[0];
  const now = new Date();
  const todayKey = localDateKey(now);
  const thisWeekSessions = history.filter((item) => {
    const date = new Date(`${item.workout_date}T00:00:00`);
    const weekEnd = new Date(week);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return date >= week && date < weekEnd;
  });
  const sessionsByDay = new Map();
  thisWeekSessions.forEach((item) => {
    sessionsByDay.set(item.workout_date, [...(sessionsByDay.get(item.workout_date) ?? []), item]);
  });
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(week);
    date.setDate(week.getDate() + index);
    const dateKey = localDateKey(date);
    const daySessions = sessionsByDay.get(dateKey) ?? [];
    const isComplete = daySessions.some((item) => item.status === 'completed');
    const isPlanned = daySessions.some((item) => item.status === 'planned');
    const state = isComplete ? 'completed' : dateKey === todayKey ? 'current' : isPlanned ? 'upcoming' : 'unrecorded';
    return { dateKey, day: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date), state };
  });

  return (
    <main className="training-page" id="training-home">
      <TrainingHeader status={plan.source === 'ollama_qwen' ? 'QWEN3-8B LOCAL' : 'DETERMINISTIC PLAN'} />
      <div className="training-content">
        <section className="greeting-row">
          <div>
            <p className="eyebrow">YOUR TRAINING, YOUR PACE</p>
            <h1>Good to see you, <em>{savedProfile.user.name}</em>.</h1>
            <p className="greeting-copy">A clear plan for the work you want to put in.</p>
          </div>
          <div className="greeting-date"><span className="greeting-date__dot" /> READY WHEN YOU ARE</div>
        </section>

        <section className="home-grid" aria-label="Training overview">
          <article className="today-card">
            <div className="today-card__topline"><span className="today-card__badge"><i /> TODAY’S SESSION</span><span className="today-card__day">DAY 01</span></div>
            <h2>{workout.name}</h2>
            <p className="today-card__focus">{workout.focus.length ? workout.focus.join(' · ') : 'Recovery day'}</p>
            <div className="today-stats">
              <div><strong>{workout.estimated_minutes}</strong><span>MINUTES</span></div>
              <div><strong>{workout.exercises.length}</strong><span>EXERCISES</span></div>
              <div><strong>{savedProfile.preferences.days_per_week}</strong><span>DAYS / WEEK</span></div>
            </div>
            <button className="workout-primary home-start" type="button" disabled={busy || workout.exercises.length === 0} onClick={onStart}>
              <span>{busy ? 'Starting session…' : 'Start workout'}</span><span aria-hidden="true">↗</span>
            </button>
          </article>

          <div className="home-side-stack">
            <section className="week-card" aria-label="Weekly training progress">
              <div className="section-title-row"><div><p className="eyebrow">WEEKLY RHYTHM</p><h2>Your consistency</h2></div><span className="week-card__mark" aria-hidden="true">◷</span></div>
              {historyError ? <p className="empty-copy">Workout history is temporarily unavailable.</p> : historyLoading ? <p className="empty-copy">Loading your recent training…</p> : <>
                <div className="week-count"><strong>{completedThisWeek}</strong><span>of {goalDays} training days completed</span></div>
                <div className="week-progress" role="progressbar" aria-label="Weekly training progress" aria-valuemin="0" aria-valuemax={goalDays} aria-valuenow={Math.min(completedThisWeek, goalDays)}>
                  <span style={{ width: `${weeklyFill}%` }} />
                </div>
                {thisWeekSessions.length > 0 && <div className="week-day-strip" aria-label="Workout sessions this week">
                  {weekDays.map(({ dateKey, day, state }) => <span className={`week-day week-day--${state}`} key={dateKey} aria-label={`${day}: ${state === 'completed' ? 'workout completed' : state === 'current' ? 'today' : state === 'upcoming' ? 'planned workout' : 'no completed workout recorded'}`}>
                    <i aria-hidden="true">{state === 'completed' ? '✓' : state === 'current' ? '•' : ''}</i><small>{day}</small>
                  </span>)}
                </div>}
                <p className="week-footnote">{completedThisWeek === 0 ? 'Your week starts whenever you do.' : `${Math.max(0, goalDays - completedThisWeek)} sessions to reach your weekly plan.`}</p>
              </>}
            </section>

            <section className="recent-card">
              <div className="section-title-row"><div><p className="eyebrow">RECENT TRAINING</p><h2>Last session</h2></div><span className="recent-card__mark" aria-hidden="true">↗</span></div>
              {historyError ? <p className="empty-copy">History could not be loaded.</p> : historyLoading ? <p className="empty-copy">Checking recent sessions…</p> : recent ? (
                <div className="recent-session">
                  <strong>{recent.name}</strong>
                  <span>{formatDate(recent.workout_date)} · {recent.status === 'completed' ? `${recent.duration_minutes ?? '—'} min` : 'In progress'}</span>
                </div>
              ) : <p className="empty-copy">No previous sessions yet. Today can be your first.</p>}
            </section>
          </div>
        </section>

        <AiCoachCard plan={plan} />
        {error && <p className="workout-error" role="alert">{error}</p>}
      </div>
    </main>
  );
}
