import type { FieldComponentProps } from './types';

/** Fallback for a field type this renderer does not know. It is skipped in validation and submission. */
export function UnsupportedField({ field }: FieldComponentProps) {
  return (
    <div className="py-3 px-4 rounded-lg bg-warn-soft border border-warn-text/10 text-[0.85rem]" role="note">
      <strong className="text-warn-text">{field.label || field.key}</strong>{' '}
      <span className="text-warn-text/80">uses the unsupported field type &ldquo;{String(field.type)}&rdquo; and is skipped.</span>
    </div>
  );
}
