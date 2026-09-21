import type { ReactNode } from 'react';
import type { FieldConfig } from '../engine/types';

export function helpId(inputId: string) {
  return `${inputId}-help`;
}
export function hintId(inputId: string) {
  return `${inputId}-hint`;
}
export function errorId(inputId: string) {
  return `${inputId}-error`;
}

/** Builds `aria-describedby` so help text, hints and errors are announced with the input. */
export function describedBy(
  inputId: string,
  field: FieldConfig,
  error?: string,
  hint?: string,
): string | undefined {
  const ids = [
    field.helpText ? helpId(inputId) : null,
    hint ? hintId(inputId) : null,
    error ? errorId(inputId) : null,
  ].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

interface FieldShellProps {
  field: FieldConfig;
  inputId: string;
  error?: string;
  hint?: string;
  /** Checkbox renders its own label next to the box. */
  hideLabel?: boolean;
  children: ReactNode;
}

/** Label, help text and error message: the chrome shared by every field type. */
export function FieldShell({ field, inputId, error, hint, hideLabel, children }: FieldShellProps) {
  return (
    <div className={`grid gap-1.5 ${error ? 'field--invalid' : ''}`}>
      {!hideLabel && (
        <label className="text-[0.85rem] font-semibold text-ink" htmlFor={inputId}>
          {field.label}
          {field.validation?.required && (
            <span className="text-danger ml-0.5" aria-hidden="true">*</span>
          )}
        </label>
      )}
      {children}
      {field.helpText && (
        <p className="text-[0.78rem] text-muted leading-snug" id={helpId(inputId)}>
          {field.helpText}
        </p>
      )}
      {hint && (
        <p className="text-[0.78rem] text-muted leading-snug" id={hintId(inputId)}>
          {hint}
        </p>
      )}
      {error && (
        <p className="text-[0.8rem] text-danger font-medium flex items-center gap-1.5" id={errorId(inputId)} role="alert">
          <span className="w-1 h-1 rounded-full bg-danger shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
