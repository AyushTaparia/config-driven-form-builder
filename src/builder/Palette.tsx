import { FIELD_TYPES, type FieldType } from '../engine/types';
import { FIELD_TYPE_LABELS } from '../engine/config';

interface PaletteProps {
  onAdd: (type: FieldType) => void;
}

export function Palette({ onAdd }: PaletteProps) {
  return (
    <section className="p-3.5" aria-labelledby="palette-title">
      <h2 className="text-[0.95rem] font-bold mb-3" id="palette-title">
        Form elements
      </h2>
      <ul className="grid grid-cols-2 gap-2">
        {FIELD_TYPES.map((type) => (
          <li key={type}>
            <button
              type="button"
              className="w-full flex items-center gap-1.5 justify-start text-left px-2.5 py-2 text-[0.85rem] rounded-md border border-border bg-surface text-ink cursor-pointer hover:border-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              aria-label={`Add ${FIELD_TYPE_LABELS[type]} field`}
              onClick={() => onAdd(type)}
            >
              <span aria-hidden="true" className="text-accent font-bold shrink-0">
                +
              </span>
              <span className="truncate">{FIELD_TYPE_LABELS[type]}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
