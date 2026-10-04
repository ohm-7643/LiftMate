import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ChoiceGrid from './components/ChoiceGrid.jsx';
import OnboardingProgress from './components/OnboardingProgress.jsx';
import './style.css';

const STEPS = [
  'Your name',
  'Your goal',
  'Experience',
  'Training days',
  'Session length',
  'Equipment',
  'Muscle priorities',
  'Review profile',
];

const GOALS = [
  { value: 'muscle_gain', label: 'Build muscle', description: 'Add strength and muscle over time.', symbol: '↗' },
  { value: 'strength', label: 'Get stronger', description: 'Make strength your main focus.', symbol: '✳' },
  { value: 'fat_loss', label: 'Lose fat', description: 'Support a steady change in body composition.', symbol: '◒' },
  { value: 'general_fitness', label: 'Feel fitter', description: 'Build a consistent all-around routine.', symbol: '⌁' },
];

const EXPERIENCE = [
  { value: 'beginner', label: 'Beginner', description: 'I’m new to training or getting back into it.', symbol: '01' },
  { value: 'intermediate', label: 'Intermediate', description: 'I know my way around the main lifts.', symbol: '02' },
  { value: 'advanced', label: 'Advanced', description: 'I’ve trained consistently for a while.', symbol: '03' },
];

const DAYS = Array.from({ length: 7 }, (_, index) => ({
  value: index + 1,
  label: `${index + 1}`,
  description: index === 0 ? 'day' : 'days',
}));

const DURATIONS = [30, 45, 60, 75, 90].map((value) => ({
  value,
  label: `${value}`,
  description: 'minutes',
}));

const EQUIPMENT = [
  { value: 'barbell', label: 'Barbell', symbol: 'Ⅰ' },
  { value: 'dumbbell', label: 'Dumbbells', symbol: 'Ⅱ' },
  { value: 'cable', label: 'Cable machine', symbol: '⌁' },
  { value: 'machine', label: 'Gym machines', symbol: '▤' },
  { value: 'bodyweight', label: 'Bodyweight', symbol: '◎' },
  { value: 'resistance_band', label: 'Resistance band', symbol: '∿' },
  { value: 'ab_wheel', label: 'Ab wheel', symbol: '◉' },
];

const MUSCLE_GROUPS = [
  ['back', 'Back', '↗'],
  ['chest', 'Chest', '◇'],
  ['shoulders', 'Shoulders', '○'],
  ['biceps', 'Biceps', '⌁'],
  ['triceps', 'Triceps', '⌁'],
  ['quadriceps', 'Quads', '↟'],
  ['hamstrings', 'Hamstrings', '↘'],
  ['glutes', 'Glutes', '◒'],
  ['calves', 'Calves', '↥'],
  ['core', 'Core', '◎'],
].map(([value, label, symbol]) => ({ value, label, symbol }));

const INITIAL_PROFILE = {
  name: '',
  goal: '',
  experience: '',
  days_per_week: null,
  session_duration_minutes: null,
  equipment: [],
  muscle_priorities: [],
};

function validateStep(step, profile) {
  switch (step) {
    case 0:
      return profile.name.trim().length === 0
        || profile.name.trim().length > 80
        || /[\u0000-\u001f\u007f]/.test(profile.name)
        ? 'Enter your name using 1 to 80 printable characters.'
        : '';
    case 1:
      return profile.goal ? '' : 'Choose the goal you want to work toward.';
    case 2:
      return profile.experience ? '' : 'Choose the experience level that feels right.';
    case 3:
      return profile.days_per_week ? '' : 'Choose how many days you can train each week.';
    case 4:
      return profile.session_duration_minutes ? '' : 'Choose the time you usually have for a session.';
    case 5:
      return profile.equipment.length ? '' : 'Select at least one type of equipment you can use.';
    case 6:
      return profile.muscle_priorities.length ? '' : 'Choose at least one muscle group to prioritize.';
    default:
      return '';
  }
}

async function requestJson(path, options) {
  const response = await fetch(path, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error?.message || 'We couldn’t save your profile. Please try again.';
    throw new Error(message);
  }
  return body;
}

function StepHeading({ eyebrow, title, description }) {
  return (
    <div className="step-heading">
      <p className="step-heading__eyebrow">{eyebrow}</p>
      <h2 id="step-title">{title}</h2>
      <p className="step-heading__description">{description}</p>
    </div>
  );
}

function SummaryRow({ label, value, onEdit }) {
  return (
    <div className="summary-row">
      <div>
        <span className="summary-row__label">{label}</span>
        <strong>{value}</strong>
      </div>
      {onEdit && <button className="text-button" type="button" onClick={onEdit}>Edit</button>}
    </div>
  );
}

function App() {
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState('');
  const [apiError, setApiError] = useState('');
  const [createdUser, setCreatedUser] = useState(null);
  const [savedProfile, setSavedProfile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateProfile(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
    setStepError('');
  }

  function toggleSelection(field, value) {
    setProfile((current) => {
      const selected = current[field].includes(value);
      return {
        ...current,
        [field]: selected
          ? current[field].filter((item) => item !== value)
          : [...current[field], value],
      };
    });
    setStepError('');
  }

  function goNext() {
    const error = validateStep(step, profile);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError('');
    setApiError('');
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepError('');
    setApiError('');
    setStep((current) => Math.max(current - 1, 0));
  }

  async function saveProfile() {
    for (let currentStep = 0; currentStep < 7; currentStep += 1) {
      const error = validateStep(currentStep, profile);
      if (error) {
        setStep(currentStep);
        setStepError(error);
        return;
      }
    }

    setIsSubmitting(true);
    setApiError('');
    try {
      let user = createdUser;
      if (!user) {
        const userResult = await requestJson('/api/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: profile.name.trim() }),
        });
        user = userResult.user;
        setCreatedUser(user);
      }

      const preferenceResult = await requestJson(`/api/users/${user.id}/preferences`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          goal: profile.goal,
          experience: profile.experience,
          days_per_week: profile.days_per_week,
          session_duration_minutes: profile.session_duration_minutes,
          equipment: profile.equipment,
          muscle_priorities: profile.muscle_priorities,
        }),
      });

      setSavedProfile({ user, preferences: preferenceResult.preferences });
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (savedProfile) {
    return (
      <main className="success-page">
        <section className="success-card" aria-live="polite">
          <div className="success-check" aria-hidden="true">✓</div>
          <p className="success-kicker">PROFILE CREATED</p>
          <h1>You’re all set, {savedProfile.user.name}.</h1>
          <p className="success-copy">
            Your training preferences have been saved. LiftMate can use them when workout planning arrives.
          </p>
          <div className="saved-badge">
            <span className="saved-badge__dot" />
            Saved to your LiftMate profile
          </div>
          <p className="profile-reference">Profile #{savedProfile.user.id}</p>
        </section>
      </main>
    );
  }

  const goalLabel = GOALS.find((item) => item.value === profile.goal)?.label;
  const experienceLabel = EXPERIENCE.find((item) => item.value === profile.experience)?.label;
  const selectedEquipment = EQUIPMENT
    .filter((item) => profile.equipment.includes(item.value))
    .map((item) => item.label)
    .join(', ');
  const selectedMuscles = MUSCLE_GROUPS
    .filter((item) => profile.muscle_priorities.includes(item.value))
    .map((item) => item.label)
    .join(', ');

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="LiftMate home">
          <span className="brand__mark" aria-hidden="true"><span /></span>
          <span>liftmate</span>
        </a>
        <span className="topbar__note">A PERSONAL TRAINING PROFILE</span>
        <span className="topbar__time">ABOUT 2 MINUTES</span>
      </header>

      <main className="onboarding-layout" id="top">
        <aside className="intro-panel">
          <div className="intro-panel__content">
            <div className="intro-label"><span /> MADE FOR YOUR ROUTINE</div>
            <h1>Training that fits <em>your life.</em></h1>
            <p className="intro-copy">
              Tell us what you’re working toward, what you have available, and how much time you can make.
            </p>
            <ul className="intro-points">
              <li><span>01</span>Built around your goals</li>
              <li><span>02</span>Grounded in your equipment</li>
              <li><span>03</span>Shaped to your schedule</li>
            </ul>
          </div>
          <div className="intro-orbit intro-orbit--one" aria-hidden="true" />
          <div className="intro-orbit intro-orbit--two" aria-hidden="true" />
          <div className="intro-caption"><span>01 — YOUR BASELINE</span><span>STRONG STARTS HERE</span></div>
        </aside>

        <section className="form-panel" aria-labelledby="step-title">
          <OnboardingProgress steps={STEPS} currentStep={step} />

          {step === 0 && (
            <>
              <StepHeading
                eyebrow="First things first"
                title="What should we call you?"
                description="We’ll use your name to make your training space feel like yours."
              />
              <div className="name-field">
                <label htmlFor="profile-name">Your name</label>
                <input
                  id="profile-name"
                  type="text"
                  autoComplete="given-name"
                  maxLength={80}
                  placeholder="e.g. Riley"
                  value={profile.name}
                  aria-invalid={Boolean(stepError)}
                  aria-describedby={stepError ? 'step-error' : 'name-help'}
                  onChange={(event) => updateProfile('name', event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      goNext();
                    }
                  }}
                />
                <span className="field-hint" id="name-help">Just your first name is fine.</span>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <StepHeading
                eyebrow="Your direction"
                title="What are you working toward?"
                description="Pick the goal that matters most to you right now. You can always adjust it later."
              />
              <ChoiceGrid options={GOALS} value={profile.goal} onChange={(value) => updateProfile('goal', value)} />
            </>
          )}

          {step === 2 && (
            <>
              <StepHeading
                eyebrow="Your experience"
                title="Where are you starting from?"
                description="This helps us set a sensible starting point for your training."
              />
              <ChoiceGrid options={EXPERIENCE} value={profile.experience} onChange={(value) => updateProfile('experience', value)} />
            </>
          )}

          {step === 3 && (
            <>
              <StepHeading
                eyebrow="Your week"
                title="How often can you train?"
                description="Choose the number of days you can realistically make time for."
              />
              <ChoiceGrid
                options={DAYS}
                value={profile.days_per_week}
                columns={4}
                onChange={(value) => updateProfile('days_per_week', value)}
              />
              <p className="selection-note">Consistency beats an ambitious schedule that doesn’t fit.</p>
            </>
          )}

          {step === 4 && (
            <>
              <StepHeading
                eyebrow="Your time"
                title="How long do you have?"
                description="Pick your usual session window, including a little time to get set up."
              />
              <ChoiceGrid
                options={DURATIONS}
                value={profile.session_duration_minutes}
                columns={3}
                onChange={(value) => updateProfile('session_duration_minutes', value)}
              />
            </>
          )}

          {step === 5 && (
            <>
              <StepHeading
                eyebrow="What you can use"
                title="What equipment do you have?"
                description="Select every type you can access. Bodyweight counts too."
              />
              <ChoiceGrid
                options={EQUIPMENT}
                value={profile.equipment}
                multiple
                onChange={(value) => updateProfile('equipment', value)}
              />
            </>
          )}

          {step === 6 && (
            <>
              <StepHeading
                eyebrow="Where to focus"
                title="Any muscle groups to prioritize?"
                description="Choose one or more areas you’d like your future training to emphasize."
              />
              <ChoiceGrid
                options={MUSCLE_GROUPS}
                value={profile.muscle_priorities}
                multiple
                onChange={(value) => updateProfile('muscle_priorities', value)}
              />
            </>
          )}

          {step === 7 && (
            <>
              <StepHeading
                eyebrow="Take a look"
                title="Does this feel like you?"
                description="Your profile will be stored in LiftMate’s local database."
              />
              <div className="summary-card">
                <SummaryRow label="Name" value={profile.name.trim()} onEdit={!createdUser ? () => setStep(0) : undefined} />
                <SummaryRow label="Goal" value={goalLabel} onEdit={!createdUser ? () => setStep(1) : undefined} />
                <SummaryRow label="Experience" value={experienceLabel} onEdit={!createdUser ? () => setStep(2) : undefined} />
                <SummaryRow label="Training rhythm" value={`${profile.days_per_week} days · ${profile.session_duration_minutes} min`} onEdit={!createdUser ? () => setStep(3) : undefined} />
                <SummaryRow label="Equipment" value={selectedEquipment} onEdit={!createdUser ? () => setStep(5) : undefined} />
                <SummaryRow label="Focus areas" value={selectedMuscles} onEdit={!createdUser ? () => setStep(6) : undefined} />
              </div>
            </>
          )}

          {stepError && <p className="form-error" id="step-error" role="alert">{stepError}</p>}
          {apiError && <p className="form-error form-error--api" role="alert">{apiError}</p>}

          <div className="form-footer">
            <button
              className="back-button"
              type="button"
              onClick={goBack}
              disabled={step === 0 || isSubmitting || Boolean(createdUser)}
            >
              <span aria-hidden="true">←</span> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button className="primary-button" type="button" onClick={goNext}>
                Continue <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button className="primary-button" type="button" onClick={saveProfile} disabled={isSubmitting}>
                {isSubmitting ? 'Saving your profile…' : 'Create my profile'}
                {!isSubmitting && <span aria-hidden="true">→</span>}
              </button>
            )}
          </div>
          <p className="privacy-note"><span aria-hidden="true">⌑</span> Your profile stays on your LiftMate server.</p>
        </section>
      </main>
      <footer className="page-footer"><span>LiftMate</span><span>Small steps. Strong foundations.</span></footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <App />,
);
