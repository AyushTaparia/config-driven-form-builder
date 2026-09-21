import { getSelectOptions } from '../engine/config';
import type { FieldComponentProps } from './types';
import { FieldShell, describedBy } from './FieldShell';

export function SelectField({ field, inputId, value, error, disabled, onChange, onBlur }: FieldComponentProps) {
  // Missing, empty or malformed options never crash: the select is disabled and says why.
  const options = getSelectOptions(field);
  const hasOptions = options.length > 0;
  const current = typeof value === 'string' && options.some((o) => o.value === value) ? value : '';
  const hint = hasOptions ? undefined : 'No options are configured for this field.';

  return (
    <FieldShell field={field} inputId={inputId} error={error} hint={hint}>
      <select
        id={inputId}
        name={field.key}
        className={`w-full font-[inherit] text-[0.9rem] py-2.5 px-3 border rounded-lg bg-white text-ink min-h-[42px] outline-none transition-all duration-150 disabled:bg-page disabled:text-muted appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%235b6675%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10 ${
          error
            ? 'border-danger focus:ring-2 focus:ring-danger/20'
            : 'border-border focus:border-accent focus:ring-2 focus:ring-accent/20'
        }`}
        value={current}
        disabled={disabled || !hasOptions}
        aria-required={field.validation?.required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, field, error, hint)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      >
        <option value="">{hasOptions ? field.placeholder || 'Select an option' : 'No options available'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
