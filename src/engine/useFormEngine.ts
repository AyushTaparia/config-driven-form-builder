import { useCallback, useMemo, useState } from 'react';
import { submitForm, type SubmitResult } from './submission';
import type { FieldConfig, FieldErrors, FieldValue, FormValues } from './types';
import { validateForm } from './validation';
import { resolveValues } from './values';
import { computeVisibility } from './visibility';

/**
 * Form *state* only: what the user typed, which fields were touched, and
 * derived visibility/errors. It renders nothing and knows no field types.
 *
 * Errors are derived from (config + values) on every render, never stored,
 * so they cannot go stale when the config or a controlling field changes.
 */
export function useFormEngine(fields: FieldConfig[]) {
  const [userValues, setUserValues] = useState<FormValues>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const values = useMemo(() => resolveValues(fields, userValues), [fields, userValues]);
  const visibility = useMemo(() => computeVisibility(fields, values), [fields, values]);
  const allErrors = useMemo(() => validateForm(fields, values), [fields, values]);

  /** Errors the user should see now: touched fields, or everything after a submit attempt. */
  const errors = useMemo<FieldErrors>(() => {
    const shown: FieldErrors = {};
    for (const [key, message] of Object.entries(allErrors)) {
      if (submitAttempted || touched[key]) shown[key] = message;
    }
    return shown;
  }, [allErrors, touched, submitAttempted]);

  const setValue = useCallback((key: string, value: FieldValue) => {
    setUserValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const touch = useCallback((key: string) => {
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }, []);

  const reset = useCallback(() => {
    setUserValues({});
    setTouched({});
    setSubmitAttempted(false);
  }, []);

  const submit = useCallback((): SubmitResult => {
    setSubmitAttempted(true);
    return submitForm(fields, values);
  }, [fields, values]);

  return {
    values,
    visibility,
    errors,
    errorCount: Object.keys(allErrors).length,
    submitAttempted,
    setValue,
    touch,
    reset,
    submit,
  };
}
