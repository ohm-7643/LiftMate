import { useEffect, useState } from 'react';

async function requestJson(path, options) {
  const response = await fetch(path, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message || 'The workout request failed. Please try again.');
  return body;
}

export default function WorkoutExperience({ savedProfile }) {
  const [plan, setPlan] = useState(null);
  const [session, setSession] = useState(null);
  const [progression, setProgression] = useState(null);
  const [entries, setEntries] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    requestJson('/api/workouts/ai-plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: savedProfile.user.id, day_number: 1 }),
    }).then((result) => { if (active) setPlan(result); })
      .catch((reason) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [savedProfile.user.id]);

  function setEntry(exerciseId, setNumber, field, value) {
    const key = `${exerciseId}:${setNumber}`;
    setEntries((current) => ({
      ...current,
      [key]: { ...current[key], [field]: value },
    }));
  }

  async function startWorkout() {
    setBusy(true); setError('');
    try {
      const result = await requestJson('/api/workouts/start', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          user_id: savedProfile.user.id,
          day_number: 1,
          plan_snapshot: plan,
        }),
      });
      setSession(result.session);
      setPlan((current) => ({ ...current, source: result.source, ai: result.ai }));
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  async function logSet(exercise, setNumber) {
    const entry = entries[`${exercise.workout_exercise_id}:${setNumber}`] ?? {};
    setBusy(true); setError('');
    try {
      await requestJson(`/api/workouts/${session.id}/sets`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workout_exercise_id: exercise.workout_exercise_id,
          set_number: setNumber,
          weight_kg: Number(entry.weight_kg),
          reps: Number(entry.reps),
          ...(entry.rpe !== '' && entry.rpe !== undefined ? { rpe: Number(entry.rpe) } : {}),
        }),
      });
      const refreshed = await requestJson(`/api/workouts/${session.id}`);
      setSession(refreshed.session);
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  async function completeWorkout() {
    setBusy(true); setError('');
    try {
      const result = await requestJson(`/api/workouts/${session.id}/complete`, { method: 'POST' });
      setProgression(result.progression);
      const refreshed = await requestJson(`/api/workouts/${session.id}`);
      setSession(refreshed.session);
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  if (!plan) return (
    <main className="workout-page"><section className="workout-card">
      <p className="success-kicker">TODAY’S WORKOUT</p>
      <h1>{error ? 'Workout unavailable' : 'Preparing your plan…'}</h1>
      {error && <p className="workout-error" role="alert">{error}</p>}
    </section></main>
  );

  const workout = plan.workout;
  const completed = session?.status === 'completed';
  const loggedSetCount = completed
    ? session.exercises.reduce((total, exercise) => total + exercise.logged_sets.length, 0)
    : 0;
  return (
    <main className="workout-page">
      <header className="workout-topbar"><a className="brand" href="#top"><span className="brand__mark"><span /></span><span>liftmate</span></a><span>YOUR TRAINING SPACE</span></header>
      <section className="workout-card" id="top">
        <p className="success-kicker">{completed ? 'SESSION COMPLETE' : session ? 'WORKOUT IN PROGRESS' : 'TODAY’S WORKOUT'}</p>
        <h1>{session?.name ?? workout.name}</h1>
        <p className="workout-subtitle">
          {completed
            ? <>Session logged <span>·</span> {plan.source === 'ollama_qwen' ? 'Personalized with Qwen' : 'Deterministic plan'}</>
            : <>{session?.duration_minutes ?? workout.estimated_minutes} min <span>·</span> {plan.source === 'ollama_qwen' ? 'Personalized with Qwen' : 'Deterministic plan'}</>}
        </p>
        {completed && <p className="completed-sets">{session.exercises.length} exercises · {loggedSetCount} sets logged</p>}
        {!session && <p className="workout-copy">A focused session based on your goals, schedule, equipment, and muscle priorities.</p>}
        {error && <p className="workout-error" role="alert">{error}</p>}

        <div className="workout-exercises">
          {(session?.exercises ?? workout.exercises).map((exercise, index) => (
            <article className="execution-exercise" key={exercise.workout_exercise_id ?? exercise.exercise_id}>
              <div className="execution-exercise__heading">
                <span className="execution-exercise__index">{String(index + 1).padStart(2, '0')}</span>
                <div><h2>{exercise.name}</h2><p>{exercise.primary_muscle} · {exercise.sets} sets × {exercise.rep_min}–{exercise.rep_max} reps · {exercise.rest_seconds}s rest</p></div>
              </div>
              {session && !completed && <div className="set-list">
                {Array.from({ length: exercise.sets }, (_, i) => i + 1).map((setNumber) => {
                  const logged = exercise.logged_sets.find((item) => item.set_number === setNumber);
                  const entry = entries[`${exercise.workout_exercise_id}:${setNumber}`] ?? {};
                  return <div className="set-row" key={setNumber}>
                    <strong>Set {setNumber}</strong>
                    {logged ? <span className="set-logged">{logged.weight_kg} kg × {logged.reps}{logged.rpe ? ` · RPE ${logged.rpe}` : ''} ✓</span> : <>
                      <label><span className="sr-only">Weight in kilograms</span><input inputMode="decimal" type="number" min="0" step="0.5" placeholder="kg" value={entry.weight_kg ?? ''} onChange={(event) => setEntry(exercise.workout_exercise_id, setNumber, 'weight_kg', event.target.value)} /></label>
                      <label><span className="sr-only">Reps</span><input inputMode="numeric" type="number" min="1" step="1" placeholder="reps" value={entry.reps ?? ''} onChange={(event) => setEntry(exercise.workout_exercise_id, setNumber, 'reps', event.target.value)} /></label>
                      <label><span className="sr-only">RPE optional</span><input inputMode="decimal" type="number" min="1" max="10" step="0.5" placeholder="RPE" value={entry.rpe ?? ''} onChange={(event) => setEntry(exercise.workout_exercise_id, setNumber, 'rpe', event.target.value)} /></label>
                      <button className="small-action" type="button" disabled={busy || !entry.weight_kg || !entry.reps} onClick={() => logSet(exercise, setNumber)}>Log</button>
                    </>}
                  </div>;
                })}
              </div>}
              {completed && <p className="completed-sets">{exercise.logged_sets.length} sets logged</p>}
            </article>
          ))}
        </div>

        {plan.workout.reasoning && !session && <div className="plan-note"><strong>Why this plan</strong><p>{plan.workout.reasoning}</p>{plan.workout.coaching_note && <p>{plan.workout.coaching_note}</p>}</div>}
        {!session && <button className="workout-primary" type="button" disabled={busy} onClick={startWorkout}>{busy ? 'Starting…' : 'Start workout'}</button>}
        {session && !completed && <button className="workout-primary" type="button" disabled={busy} onClick={completeWorkout}>{busy ? 'Saving…' : 'Complete workout'}</button>}
        {completed && progression && <section className="progression-panel"><p className="success-kicker">NEXT SESSION</p><h2>Build from today</h2>{progression.map((item) => <article key={item.workout_exercise_id}><strong>{item.name}</strong><span>{item.recommended_weight_kg ?? 'Log a weight'} kg · {item.rep_min}–{item.rep_max} reps</span><p>{item.message}</p></article>)}</section>}
      </section>
    </main>
  );
}
