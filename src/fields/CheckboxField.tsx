import type { FieldComponentProps } from './types';
import { FieldShell, describedBy } from './FieldShell';

export function CheckboxField({ field, inputId, value, error, disabled, onChange, onBlur }: FieldComponentProps) {
  return (
    <FieldShell field={field} inputId={inputId} error={error} hideLabel>
      <label className="flex items-start gap-2 text-[0.92rem] cursor-pointer" htmlFor={inputId}>
        <input
          id={inputId}
          name={field.key}
          type="checkbox"
          checked={value === true}
          className="w-[18px] h-[18px] mt-0.5 accent-accent"
          disabled={disabled}
          aria-required={field.validation?.required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, field, error)}
          onChange={(e) => onChange(e.target.checked)}
          onBlur={onBlur}
        />
        <span>
          {field.label}
          {field.validation?.required && (
            <span className="text-danger" aria-hidden="true">
              {' '}*
            </span>
          )}
        </span>
      </label>
    </FieldShell>
  );
}
