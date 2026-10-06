interface Props<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  dark?: boolean;
}

/** A row of mutually exclusive buttons with a sliding highlight. */
export function Segmented<T extends string>({ label, value, options, onChange, dark }: Props<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className={`segmented${dark ? " is-dark" : ""}`} role="radiogroup" aria-label={label} style={{ ["--count" as string]: options.length, ["--index" as string]: index }}>
      <span className="segmented-thumb" aria-hidden="true" />
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
