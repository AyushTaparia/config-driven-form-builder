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
        className="w-full font-[inherit] text-[0.95rem] py-2 px-2.5 border border-input rounded-md bg-white text-ink min-h-[38px] focus:border-accent focus:ring-1 focus:ring-accent outline-none disabled:bg-[#f0f2f5] disabled:text-muted"
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
