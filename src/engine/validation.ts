import { getSelectOptions, isSupportedType } from './config';
import type { FieldConfig, FieldErrors, FieldValue, FormValues } from './types';
import { computeVisibility } from './visibility';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(text: string): boolean {
  if (!ISO_DATE_RE.test(text)) return false;
  const d = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text;
}

/** Returns an error message for a single field, or `null` when the value is valid. */
export function validateField(field: FieldConfig, raw: FieldValue | undefined): string | null {
  const rules = field.validation ?? {};
  const label = field.label?.trim() || field.key;

  if (field.type === 'checkbox') {
    return rules.required && raw !== true ? `${label} must be checked` : null;
  }

  let text = typeof raw === 'string' ? raw : '';
  // A value that is no longer one of the configured options counts as "nothing selected".
  if (field.type === 'select' && !getSelectOptions(field).some((o) => o.value === text)) text = '';

  const trimmed = text.trim();
  if (trimmed === '') return rules.required ? `${label} is required` : null;

  if (field.type === 'email' && !EMAIL_RE.test(trimmed)) {
    return 'Enter a valid email address';
  }

  if (field.type === 'number') {
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return 'Enter a valid number';
    if (typeof rules.min === 'number' && n < rules.min) return `Must be at least ${rules.min}`;
    if (typeof rules.max === 'number' && n > rules.max) return `Must be at most ${rules.max}`;
  }

  if (field.type === 'date') {
    if (!isValidIsoDate(trimmed)) return 'Enter a valid date';
    if (rules.minDate && trimmed < rules.minDate) return `Date must be on or after ${rules.minDate}`;
    if (rules.maxDate && trimmed > rules.maxDate) return `Date must be on or before ${rules.maxDate}`;
  }

  if (field.type === 'text' || field.type === 'textarea' || field.type === 'email') {
    if (typeof rules.minLength === 'number' && trimmed.length < rules.minLength) {
      return `Must be at least ${rules.minLength} characters`;
    }
    if (typeof rules.maxLength === 'number' && trimmed.length > rules.maxLength) {
      return `Must be at most ${rules.maxLength} characters`;
    }
    if (rules.pattern) {
      try {
        if (!new RegExp(rules.pattern).test(trimmed)) return rules.patternMessage || 'Invalid format';
      } catch {
        // An invalid pattern is a config problem (reported by validateConfig), not the user's.
      }
    }
  }

  return null;
}

/**
 * Validates every *visible* field. Hidden fields are never validated.
 * `values` must already be resolved (see `resolveValues`).
 */
export function validateForm(fields: FieldConfig[], values: FormValues): FieldErrors {
  const visibility = computeVisibility(fields, values);
  const errors: FieldErrors = {};
  for (const field of fields) {
    if (!isSupportedType(field.type) || !visibility[field.id]) continue;
    const message = validateField(field, values[field.key]);
    if (message) errors[field.key] = message;
  }
  return errors;
}
