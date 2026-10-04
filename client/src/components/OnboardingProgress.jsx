export default function OnboardingProgress({ steps, currentStep }) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="progress" aria-label={`Step ${currentStep + 1} of ${steps.length}`}>
      <div className="progress__meta">
        <span>YOUR STARTING POINT</span>
        <span>STEP {currentStep + 1} <i>/</i> {steps.length}</span>
      </div>
      <div
        className="progress__track"
        role="progressbar"
        aria-valuemin="1"
        aria-valuemax={steps.length}
        aria-valuenow={currentStep + 1}
        aria-valuetext={`Step ${currentStep + 1}: ${steps[currentStep]}`}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <span className="progress__current">{steps[currentStep]}</span>
    </div>
  );
}
