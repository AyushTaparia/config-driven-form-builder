import { isSupportedType } from './config';
import type { FieldConfig, FieldErrors, FormValues, SubmittedData } from './types';
import { validateForm } from './validation';
import { coerceValue } from './values';
import { computeVisibility } from './visibility';

/**
 * Builds the JSON payload: visible, supported fields only, with typed values.
 *
 *  text / textarea / email -> string (trimmed, "" when empty)
 *  number                  -> number, or null when empty
 *  date                    -> "yyyy-mm-dd", or null when empty
 *  select                  -> the option value, or null when nothing is selected
 *  checkbox                -> boolean
 */
export function buildSubmission(fields: FieldConfig[], values: FormValues): SubmittedData {
  const visibility = computeVisibility(fields, values);
  const data: SubmittedData = {};
  for (const field of fields) {
    if (!isSupportedType(field.type) || !visibility[field.id]) continue;
    data[field.key] = coerceValue(field, values[field.key]);
  }
  return data;
}

export type SubmitResult =
  | { ok: true; data: SubmittedData }
  | { ok: false; errors: FieldErrors };

/** Validate, then build the payload. Nothing is produced while any visible field is invalid. */
export function submitForm(fields: FieldConfig[], values: FormValues): SubmitResult {
  const errors = validateForm(fields, values);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: buildSubmission(fields, values) };
}
