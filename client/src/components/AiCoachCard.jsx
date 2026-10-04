export default function AiCoachCard({ plan }) {
  const usedLocalModel = plan.source === 'ollama_qwen';
  const workout = plan.workout;

  return (
    <>
    <details className={`ai-coach-card${usedLocalModel ? '' : ' ai-coach-card--fallback'}`} open>
      <summary>
        <span className="ai-coach-card__icon" aria-hidden="true">✳</span>
        <span className="ai-coach-card__heading">
          <strong>LiftMate AI</strong>
          <small>{usedLocalModel ? 'PERSONALIZED BY YOUR LOCAL MODEL' : 'DETERMINISTIC PLAN'}</small>
        </span>
        <span className="ai-coach-card__toggle" aria-hidden="true">⌄</span>
      </summary>
      <div className="ai-coach-card__body">
        {usedLocalModel ? (
          <>
            <p className="ai-coach-card__lead">Your plan was personalized around your training priorities.</p>
            {workout.reasoning && <p>{workout.reasoning}</p>}
            {workout.coaching_note && <blockquote>{workout.coaching_note}</blockquote>}
            <span className="ai-coach-card__model">Powered locally by Qwen3-8B</span>
          </>
        ) : (
          <>
            <p className="ai-coach-card__lead">Your workout is ready using LiftMate’s deterministic planner.</p>
            {plan.ai?.reason && <p>Local AI note: {plan.ai.reason}.</p>}
          </>
        )}
      </div>
    </details>
    <details className="ai-architecture">
      <summary><span>How this session was built</span><i aria-hidden="true">⌄</i></summary>
      <div className="ai-architecture__content">
        <div className="ai-architecture__labels"><span>Local model · Qwen3-8B</span><span>Deterministic rules + AI personalization</span></div>
        <ol>
          <li><span>01</span><p>Your profile provides your goals, experience, equipment, training days and muscle priorities.</p></li>
          <li><span>02</span><p>LiftMate’s deterministic planner builds a safe baseline workout within those constraints.</p></li>
          <li><span>03</span><p>Local Qwen3-8B personalizes a small part: it selects from allowed priority exercises and writes the coaching note. It does not set sets, reps or rest.</p></li>
          <li><span>04</span><p>LiftMate validates the model’s choices against the exercise library, your equipment and the baseline before showing the plan.</p></li>
          <li><span>05</span><p>If local AI is unavailable or its response fails validation, the deterministic workout remains available.</p></li>
        </ol>
      </div>
    </details>
    </>
  );
}
