import { getSelectOptions } from './config';
import type { FieldConfig, FieldValue, FormValues, SubmittedValue } from './types';

/** The value a field has before the user touches it. */
export function getInitialValue(field: FieldConfig): FieldValue {
  if (field.type === 'checkbox') return field.defaultValue === true;
  const d = field.defaultValue as unknown;
  if (typeof d === 'string') return d;
  if (typeof d === 'number') return String(d);
  return '';
}

/**
 * Merges what the user has entered so far with configured defaults.
 * Because defaults are resolved on read (not copied into state), editing the
 * config while a form is on screen is reflected immediately.
 */
export function resolveValues(fields: FieldConfig[], userValues: FormValues): FormValues {
  const resolved: FormValues = {};
  for (const field of fields) {
    resolved[field.key] = Object.prototype.hasOwnProperty.call(userValues, field.key)
      ? userValues[field.key]
      : getInitialValue(field);
  }
  return resolved;
}

/** Converts a raw form value into the typed value that is submitted. */
export function coerceValue(field: FieldConfig, raw: FieldValue | undefined): SubmittedValue {
  switch (field.type) {
    case 'checkbox':
      return raw === true;
    case 'number': {
      const text = typeof raw === 'string' ? raw.trim() : '';
      if (text === '') return null;
      const n = Number(text);
      return Number.isFinite(n) ? n : null;
    }
    case 'date': {
      const text = typeof raw === 'string' ? raw.trim() : '';
      return text === '' ? null : text;
    }
    case 'select': {
      const text = typeof raw === 'string' ? raw : '';
      return getSelectOptions(field).some((o) => o.value === text) ? text : null;
    }
    default:
      return typeof raw === 'string' ? raw.trim() : '';
  }
}
