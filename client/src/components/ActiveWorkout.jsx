import { useEffect, useMemo, useState } from 'react';
import { TrainingHeader } from './WorkoutHome.jsx';

function elapsedLabel(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const rest = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}

export default function ActiveWorkout({ session, plan, busy, error, startedAt, onLogSet, onComplete }) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');
  const [clock, setClock] = useState(0);
  const [restRemaining, setRestRemaining] = useState(null);
  const [restRunning, setRestRunning] = useState(false);
  const [savedSet, setSavedSet] = useState('');
  const exercises = session.exercises;
  const allSetCount = exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  const loggedSetCount = exercises.reduce((sum, exercise) => sum + exercise.logged_sets.length, 0);
  const setsRemaining = exercises.reduce((sum, exercise) => {
    const loggedSetNumbers = new Set(exercise.logged_sets.map((item) => item.set_number));
    return sum + Array.from({ length: exercise.sets }, (_, index) => index + 1)
      .filter((setNumber) => !loggedSetNumbers.has(setNumber)).length;
  }, 0);
  const allPrescribedSetsLogged = setsRemaining === 0;
  const finishedExerciseCount = exercises.filter((exercise) => exercise.logged_sets.length >= exercise.sets).length;
  const currentIndex = exercises.findIndex((exercise) => exercise.logged_sets.length < exercise.sets);
  const activeExercise = currentIndex >= 0 ? exercises[currentIndex] : null;
  const loggedNumbers = useMemo(() => new Set(activeExercise?.logged_sets.map((item) => item.set_number) ?? []), [activeExercise]);
  const currentSet = activeExercise
    ? Array.from({ length: activeExercise.sets }, (_, index) => index + 1).find((number) => !loggedNumbers.has(number))
    : null;
  const progress = allSetCount ? (loggedSetCount / allSetCount) * 100 : 0;

  useEffect(() => {
    const tick = () => setClock(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  useEffect(() => {
    if (!restRunning) return undefined;
    const interval = window.setInterval(() => {
      setRestRemaining((value) => value == null || value <= 1 ? 0 : value - 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [restRunning]);

  useEffect(() => {
    if (restRemaining === 0) setRestRunning(false);
  }, [restRemaining]);

  useEffect(() => {
    setWeight(''); setReps(''); setRpe('');
  }, [activeExercise?.workout_exercise_id, currentSet]);

  async function submitSet(event) {
    event.preventDefault();
    if (!activeExercise || !currentSet) return;
    const setKey = `${activeExercise.workout_exercise_id}:${currentSet}`;
    const ok = await onLogSet(activeExercise, currentSet, { weight_kg: Number(weight), reps: Number(reps), rpe: rpe === '' ? undefined : Number(rpe) });
    if (ok) {
      setSavedSet(setKey);
      window.setTimeout(() => setSavedSet((value) => value === setKey ? '' : value), 900);
      setRestRemaining(null);
      setRestRunning(false);
    }
  }

  return (
    <main className="training-page active-page">
      <TrainingHeader status={plan.source === 'ollama_qwen' ? 'QWEN3-8B LOCAL' : 'DETERMINISTIC PLAN'} />
      <div className="active-content">
        <div className="active-topline"><div><p className="eyebrow">SESSION IN PROGRESS</p><h1>{session.name}</h1></div><div className="session-clock" aria-label={`Workout time ${elapsedLabel(clock)}`}><span>ELAPSED</span><strong>{elapsedLabel(clock)}</strong></div></div>
        <div className="exercise-progress-meta"><strong>{String(Math.min(finishedExerciseCount + (activeExercise ? 1 : 0), exercises.length)).padStart(2, '0')} <span>/ {String(exercises.length).padStart(2, '0')}</span></strong><span>EXERCISES</span><span className="exercise-progress-meta__sets">{loggedSetCount} / {allSetCount} sets</span></div>
        <div className="exercise-progress" role="progressbar" aria-label="Workout set progress" aria-valuemin="0" aria-valuemax={allSetCount} aria-valuenow={loggedSetCount}><span style={{ width: `${progress}%` }} /></div>

        <div className="active-layout">
          <section className="active-main" aria-label="Current exercise">
            {activeExercise ? <article className="active-exercise-card" key={`${activeExercise.workout_exercise_id}-${currentSet}`}>
              <div className="active-exercise-card__top"><span className="active-exercise-card__tag"><i /> UP NEXT · EXERCISE {String(currentIndex + 1).padStart(2, '0')}</span><span className="active-exercise-card__order">{currentIndex + 1} / {exercises.length}</span></div>
              <h2>{activeExercise.name}</h2>
              <p className="active-exercise-card__focus">{activeExercise.primary_muscle}</p>
              <div className="prescription-row"><span><strong>{activeExercise.rep_min}–{activeExercise.rep_max}</strong> reps</span><i /><span><strong>{activeExercise.rest_seconds}</strong> sec rest</span></div>

              <div className="current-set-heading"><span className="current-set-heading__number">{String(currentSet).padStart(2, '0')}</span><div><small>CURRENT SET</small><strong>Set {currentSet} of {activeExercise.sets}</strong></div><span className="current-set-heading__hint">Enter your result</span></div>
              <form className="set-entry-form" onSubmit={submitSet}>
                <label><span>Weight <small>KG</small></span><div className="set-input-wrap"><input inputMode="decimal" type="number" min="0" step="0.5" placeholder="0" value={weight} onChange={(event) => setWeight(event.target.value)} required /><span>kg</span></div></label>
                <label><span>Reps</span><div className="set-input-wrap"><input inputMode="numeric" type="number" min="1" step="1" placeholder="0" value={reps} onChange={(event) => setReps(event.target.value)} required /><span>reps</span></div></label>
                <label className="rpe-field"><span>Effort <small>OPTIONAL</small></span><div className="set-input-wrap"><input inputMode="decimal" type="number" min="1" max="10" step="0.5" placeholder="—" value={rpe} onChange={(event) => setRpe(event.target.value)} /><span>RPE</span></div></label>
                <button className={`log-set-button${savedSet === `${activeExercise.workout_exercise_id}:${currentSet}` ? ' log-set-button--saved' : ''}`} type="submit" disabled={busy || !weight || !reps}>
                  {busy ? 'Saving…' : savedSet === `${activeExercise.workout_exercise_id}:${currentSet}` ? 'Set logged ✓' : 'Log set'}
                </button>
              </form>
              {error && <p className="workout-error" role="alert">{error}</p>}

              <div className="logged-set-strip" aria-live="polite">
                {activeExercise.logged_sets.map((item) => <div className={`logged-set-chip${savedSet === `${activeExercise.workout_exercise_id}:${item.set_number}` ? ' logged-set-chip--recent' : ''}`} key={item.id}><span>SET {item.set_number}</span><strong>{item.weight_kg} kg × {item.reps}</strong><i aria-label="Completed">✓</i></div>)}
                {savedSet && <span className="set-save-confirmation">Saved. Next set is ready.</span>}
              </div>

              <div className="rest-control">
                <div><span className="rest-control__icon" aria-hidden="true">◷</span><span><strong>{restRemaining == null ? 'Rest timer' : restRemaining === 0 ? 'Rest complete' : `${elapsedLabel(restRemaining)} remaining`}</strong><small>{activeExercise.rest_seconds} seconds suggested</small></span></div>
                {restRemaining == null || restRemaining === 0
                  ? <button type="button" onClick={() => { setRestRemaining(activeExercise.rest_seconds); setRestRunning(true); }}>Start rest</button>
                  : <button type="button" onClick={() => setRestRunning((value) => !value)}>{restRunning ? 'Pause' : 'Resume'}</button>}
                {restRemaining != null && <button className="rest-skip" type="button" onClick={() => { setRestRemaining(null); setRestRunning(false); }}>Skip</button>}
              </div>
            </article> : <article className="all-sets-done"><span aria-hidden="true">✓</span><h2>Every set is logged.</h2><p>Complete your session when you’re ready.</p></article>}

            <div className="ai-workout-note"><span aria-hidden="true">✳</span><div><strong>Training with purpose</strong><p>{plan.workout.coaching_note || plan.workout.reasoning || 'Your workout follows the plan built from your saved goals and equipment.'}</p></div></div>
            {!allPrescribedSetsLogged && <p className="completion-gate-message" role="status">Log all prescribed sets to finish · {setsRemaining} {setsRemaining === 1 ? 'set' : 'sets'} remaining</p>}
            <button className="workout-primary active-complete-button" type="button" disabled={busy || !allPrescribedSetsLogged} onClick={onComplete}>{busy ? 'Saving session…' : 'Complete workout'}<span aria-hidden="true">→</span></button>
          </section>

          <aside className="exercise-rail" aria-label="Exercise list">
            <div className="exercise-rail__heading"><div><p className="eyebrow">YOUR SESSION</p><h2>Exercise list</h2></div><span>{exercises.length}</span></div>
            {exercises.map((exercise, index) => {
              const done = exercise.logged_sets.length >= exercise.sets;
              const active = exercise.workout_exercise_id === activeExercise?.workout_exercise_id;
              return <div className={`rail-exercise${active ? ' rail-exercise--active' : ''}${done ? ' rail-exercise--done' : ''}`} key={exercise.workout_exercise_id}>
                <span className="rail-exercise__number">{done ? '✓' : String(index + 1).padStart(2, '0')}</span>
                <div><strong>{exercise.name}</strong><small>{exercise.logged_sets.length} / {exercise.sets} sets</small></div>
                <span className="rail-exercise__status" aria-label={done ? 'Complete' : active ? 'Current exercise' : 'Upcoming'} />
              </div>;
            })}
            <div className="rail-rest-note"><span aria-hidden="true">⌁</span><p>Take your time between sets. Rest is part of the work.</p></div>
          </aside>
        </div>
      </div>
    </main>
  );
}
