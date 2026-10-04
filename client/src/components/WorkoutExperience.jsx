import { useCallback, useEffect, useState } from 'react';
import ActiveWorkout from './ActiveWorkout.jsx';
import WorkoutComplete from './WorkoutComplete.jsx';
import WorkoutHome from './WorkoutHome.jsx';

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
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [planLoading, setPlanLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [startedAt, setStartedAt] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      const result = await requestJson(`/api/users/${savedProfile.user.id}/workouts`);
      setHistory(result.workouts);
      setHistoryError(false);
    } catch {
      setHistoryError(true);
    } finally {
      setHistoryLoading(false);
    }
  }, [savedProfile.user.id]);

  const loadPlan = useCallback(async () => {
    setPlanLoading(true);
    setError('');
    try {
      const result = await requestJson('/api/workouts/ai-plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: savedProfile.user.id, day_number: 1 }),
      });
      setPlan(result);
    } catch (reason) {
      setError(reason.message);
      setPlan(null);
    } finally {
      setPlanLoading(false);
    }
  }, [savedProfile.user.id]);

  useEffect(() => {
    loadPlan();
    loadHistory();
  }, [loadPlan, loadHistory]);

  async function startWorkout() {
    if (!plan) return;
    setBusy(true); setError('');
    try {
      const result = await requestJson('/api/workouts/start', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: savedProfile.user.id, day_number: 1, plan_snapshot: plan }),
      });
      setSession(result.session);
      setPlan((current) => ({ ...current, source: result.source, ai: result.ai }));
      setStartedAt(Date.now());
      loadHistory();
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  async function logSet(exercise, setNumber, values) {
    setBusy(true); setError('');
    try {
      await requestJson(`/api/workouts/${session.id}/sets`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workout_exercise_id: exercise.workout_exercise_id, set_number: setNumber, ...values }),
      });
      const refreshed = await requestJson(`/api/workouts/${session.id}`);
      setSession(refreshed.session);
      return true;
    } catch (reason) {
      setError(reason.message);
      return false;
    } finally { setBusy(false); }
  }

  async function completeWorkout() {
    setBusy(true); setError('');
    try {
      const result = await requestJson(`/api/workouts/${session.id}/complete`, { method: 'POST' });
      const refreshed = await requestJson(`/api/workouts/${session.id}`);
      setProgression(result.progression);
      setSession(refreshed.session);
      loadHistory();
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  if (!session) {
    return <WorkoutHome
      savedProfile={savedProfile}
      plan={planLoading ? null : plan}
      history={history}
      historyLoading={historyLoading}
      historyError={historyError}
      busy={busy}
      error={error}
      onStart={startWorkout}
      onRetry={loadPlan}
    />;
  }

  if (session.status === 'completed') {
    return <WorkoutComplete session={session} plan={plan} progression={progression ?? []} />;
  }

  return <ActiveWorkout
    session={session}
    plan={plan}
    busy={busy}
    error={error}
    startedAt={startedAt ?? Date.now()}
    onLogSet={logSet}
    onComplete={completeWorkout}
  />;
}
