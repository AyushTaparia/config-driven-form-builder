import type { FieldComponentProps } from './types';
import { FieldShell, describedBy } from './FieldShell';

export function TextareaField({ field, inputId, value, error, disabled, onChange, onBlur }: FieldComponentProps) {
  return (
    <FieldShell field={field} inputId={inputId} error={error}>
      <textarea
        id={inputId}
        name={field.key}
        className={`w-full font-[inherit] text-[0.9rem] py-2.5 px-3 border rounded-lg bg-white text-ink min-h-[42px] outline-none transition-all duration-150 disabled:bg-page disabled:text-muted placeholder:text-muted/60 resize-y ${
          error
            ? 'border-danger focus:ring-2 focus:ring-danger/20'
            : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/20'
        }`}
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
