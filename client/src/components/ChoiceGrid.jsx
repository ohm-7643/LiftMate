export default function ChoiceGrid({
  options,
  value,
  multiple = false,
  columns = 2,
  onChange,
}) {
  function select(optionValue) {
    if (!multiple) {
      onChange(optionValue);
      return;
    }

    const selected = value.includes(optionValue);
    onChange(selected
      ? value.filter((item) => item !== optionValue)
      : [...value, optionValue]);
  }

  return (
    <div className={`choice-grid choice-grid--${columns}`} role="group" aria-labelledby="step-title">
      {options.map((option) => {
        const selected = multiple
          ? value.includes(option.value)
          : value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            className={`choice-card${selected ? ' is-selected' : ''}`}
            aria-pressed={selected}
            onClick={() => select(option.value)}
          >
            <span className="choice-card__top">
              {option.symbol && <span className="choice-card__symbol" aria-hidden="true">{option.symbol}</span>}
              <span className="choice-card__check" aria-hidden="true">{selected ? '✓' : '+'}</span>
            </span>
            <span className="choice-card__title">{option.label}</span>
            {option.description && <span className="choice-card__description">{option.description}</span>}
          </button>
        );
      })}
    </div>
  );
}
