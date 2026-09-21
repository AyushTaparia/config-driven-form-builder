import type { FieldComponentProps } from './types';

/** Fallback for a field type this renderer does not know. It is skipped in validation and submission. */
export function UnsupportedField({ field }: FieldComponentProps) {
  return (
    <div className="bg-warn-soft py-2 px-2.5 rounded-md text-[0.85rem]" role="note">
      <strong>{field.label || field.key}</strong> uses the unsupported field type &ldquo;{String(field.type)}&rdquo; and is skipped.
    </div>
  );
}
