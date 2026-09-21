import type { SelectOption } from '../engine/types';

interface OptionsEditorProps {
  options: SelectOption[] | undefined;
  onChange: (options: SelectOption[]) => void;
}

export function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const list = Array.isArray(options) ? options : [];

  const update = (index: number, patch: Partial<SelectOption>) =>
    onChange(list.map((o, i) => (i === index ? { ...o, ...patch } : o)));

  const add = () => {
    let n = list.length + 1;
    while (list.some((o) => o.value === `option_${n}`)) n += 1;
    onChange([...list, { label: `Option ${n}`, value: `option_${n}` }]);
  };

  return (
    <fieldset className="border border-border rounded-md p-2.5 grid gap-2.5 min-w-0">
      <legend className="text-[0.85rem] font-bold px-1">Options</legend>
      {list.length === 0 && (
        <p className="text-[0.78rem] text-muted">No options yet. A select field needs at least one option to be answered.</p>
      )}
      <ul className="grid gap-1.5">
        {list.map((option, i) => (
          <li key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
            <input
              className="w-full font-[inherit] text-[0.95rem] py-1.5 px-2 border border-input rounded-md bg-white text-ink min-h-[34px] focus:border-accent focus:ring-1 focus:ring-accent outline-none"
              aria-label={`Option ${i + 1} label`}
              placeholder="Label"
              value={option.label}
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <input
              className="w-full font-[inherit] text-[0.95rem] py-1.5 px-2 border border-input rounded-md bg-white text-ink min-h-[34px] focus:border-accent focus:ring-1 focus:ring-accent outline-none"
              aria-label={`Option ${i + 1} value`}
              placeholder="value"
              value={option.value}
              onChange={(e) => update(i, { value: e.target.value })}
            />
            <button
              type="button"
              className="px-2 py-1 text-[0.8rem] rounded border border-border bg-surface text-ink cursor-pointer hover:border-muted transition-colors"
              aria-label={`Remove option ${i + 1}`}
              onClick={() => onChange(list.filter((_, idx) => idx !== i))}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="px-2.5 py-1.5 text-[0.8rem] rounded-md cursor-pointer border border-border bg-surface text-ink hover:border-muted transition-colors w-fit"
        onClick={add}
      >
        Add option
      </button>
    </fieldset>
  );
}
