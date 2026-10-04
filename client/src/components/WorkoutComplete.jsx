import { TrainingHeader } from './WorkoutHome.jsx';

export default function WorkoutComplete({ session, plan, progression }) {
  const loggedSets = session.exercises.reduce((total, exercise) => total + exercise.logged_sets.length, 0);
  const completedExercises = session.exercises.filter((exercise) => exercise.logged_sets.length >= exercise.sets).length;
  const plannedMinutes = plan.workout.estimated_minutes;
  const usedLocalModel = plan.source === 'ollama_qwen';

  return (
    <main className="training-page completion-page">
      <TrainingHeader status={usedLocalModel ? 'QWEN3-8B LOCAL' : 'DETERMINISTIC PLAN'} />
      <div className="completion-content">
        <section className="completion-hero" aria-live="polite">
          <div className="completion-mark" aria-hidden="true"><span>✓</span></div>
          <p className="eyebrow">SESSION COMPLETE</p>
          <h1>Strong work, {session.name} is in the books.</h1>
          <p className="workout-subtitle">Session logged <span>·</span> {usedLocalModel ? 'Personalized with Qwen' : 'Deterministic plan'}</p>
          <div className="completion-stats">
            <div><strong>{completedExercises}<small> / {session.exercises.length}</small></strong><span>EXERCISES COMPLETED</span></div>
            <div><strong>{loggedSets}</strong><span>SETS LOGGED</span></div>
            <div><strong>{plannedMinutes}<small> min</small></strong><span>PLANNED DURATION</span></div>
          </div>
        </section>

        {progression.length > 0 && <section className="progression-panel completion-progression">
          <div className="completion-section-title"><div><p className="eyebrow">READY FOR NEXT TIME</p><h2>Your next step</h2></div><span aria-hidden="true">↗</span></div>
          <div className="progression-list">{progression.map((item) => <article className="progression-item" key={item.workout_exercise_id}>
            <span className="progression-item__icon" aria-hidden="true">{item.recommendation === 'increase_weight' ? '↑' : '↗'}</span>
            <div><strong>{item.name}</strong><p>{item.message}</p></div>
            <span className="progression-item__range">{item.recommended_weight_kg ?? '—'} kg<br />{item.rep_min}–{item.rep_max} reps</span>
          </article>)}</div>
        </section>}

        {plan.workout.coaching_note && <aside className="completion-coach"><span aria-hidden="true">✳</span><div><small>{usedLocalModel ? 'LIFT MATE AI · QWEN3-8B' : 'LIFTMATE COACHING NOTE'}</small><p>{plan.workout.coaching_note}</p></div></aside>}
        <p className="completion-signoff">Progress is built one session at a time.</p>
      </div>
    </main>
  );
}
