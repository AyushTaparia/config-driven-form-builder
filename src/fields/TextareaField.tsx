import type { FieldComponentProps } from './types';
import { FieldShell, describedBy } from './FieldShell';

export function TextareaField({ field, inputId, value, error, disabled, onChange, onBlur }: FieldComponentProps) {
  return (
    <FieldShell field={field} inputId={inputId} error={error}>
      <textarea
        id={inputId}
        name={field.key}
        className="w-full font-[inherit] text-[0.95rem] py-2 px-2.5 border border-input rounded-md bg-white text-ink min-h-[38px] focus:border-accent focus:ring-1 focus:ring-accent outline-none disabled:bg-[#f0f2f5] disabled:text-muted placeholder:text-[#8791a0] resize-y"
        rows={4}
        value={typeof value === 'string' ? value : ''}
        placeholder={field.placeholder || undefined}
        disabled={disabled}
        aria-required={field.validation?.required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, field, error)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </FieldShell>
  );
}
