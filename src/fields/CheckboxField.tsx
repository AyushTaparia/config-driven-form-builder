import type { FieldComponentProps } from './types';
import { FieldShell, describedBy } from './FieldShell';

export function CheckboxField({ field, inputId, value, error, disabled, onChange, onBlur }: FieldComponentProps) {
  return (
    <FieldShell field={field} inputId={inputId} error={error} hideLabel>
      <label className="flex items-start gap-3 py-1 cursor-pointer group" htmlFor={inputId}>
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            id={inputId}
            name={field.key}
            type="checkbox"
            checked={value === true}
            className="w-[18px] h-[18px] rounded border-border text-accent focus:ring-2 focus:ring-accent/20 accent-accent cursor-pointer"
            disabled={disabled}
            aria-required={field.validation?.required || undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(inputId, field, error)}
            onChange={(e) => onChange(e.target.checked)}
            onBlur={onBlur}
          />
        </div>
        <span className="text-[0.9rem] text-ink leading-snug select-none group-hover:text-accent transition-colors">
          {field.label}
          {field.validation?.required && (
            <span className="text-danger ml-0.5" aria-hidden="true">*</span>
          )}
        </span>
      </label>
    </FieldShell>
  );
}
