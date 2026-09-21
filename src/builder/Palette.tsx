import { FIELD_TYPES, type FieldType } from '../engine/types';
import { FIELD_TYPE_LABELS } from '../engine/config';

interface PaletteProps {
  onAdd: (type: FieldType) => void;
}

const TYPE_ICONS: Record<FieldType, string> = {
  text: 'Aa',
  number: '#',
  email: '@',
  select: '▾',
  date: '📅',
  textarea: '¶',
  checkbox: '☑',
};

export function Palette({ onAdd }: PaletteProps) {
  return (
    <section className="p-4" aria-labelledby="palette-title">
      <h2 className="text-[0.8rem] font-semibold text-muted uppercase tracking-wider mb-3" id="palette-title">
        Form elements
      </h2>
      <ul className="grid grid-cols-2 gap-2">
        {FIELD_TYPES.map((type) => (
          <li key={type}>
            <button
              type="button"
              className="w-full flex items-center gap-2 justify-start text-left px-3 py-2.5 text-[0.85rem] rounded-lg border border-border bg-white text-ink cursor-pointer hover:border-accent hover:shadow-sm active:scale-[0.98] transition-all duration-150 overflow-hidden group"
              aria-label={`Add ${FIELD_TYPE_LABELS[type]} field`}
              onClick={() => onAdd(type)}
            >
              <span aria-hidden="true" className="w-6 h-6 rounded bg-accent/10 text-accent text-[0.7rem] font-bold flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                {TYPE_ICONS[type]}
              </span>
              <span className="truncate">{FIELD_TYPE_LABELS[type]}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
