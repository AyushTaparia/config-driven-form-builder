/**
 * The whole form is described by a plain, JSON-serialisable `FormConfig`.
 * Nothing in the renderer knows about specific fields such as "department".
 */

export const FIELD_TYPES = [
  'text',
  'number',
  'email',
  'select',
  'date',
  'textarea',
  'checkbox',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];
export type FieldWidth = 'half' | 'full';

/** Raw value held in form state. Numbers/dates stay strings until submission. */
export type FieldValue = string | boolean;
export type FormValues = Record<string, FieldValue>;

/** Typed value that ends up in the submitted JSON. */
export type SubmittedValue = string | number | boolean | null;
export type SubmittedData = Record<string, SubmittedValue>;

export interface SelectOption {
  label: string;
  value: string;
}

export type VisibilityOperator = 'equals' | 'notEquals' | 'isEmpty' | 'isNotEmpty';

export interface VisibilityRule {
  /** `key` of the field this rule listens to. */
  field: string;
  operator: VisibilityOperator;
  /** Compared as text. Checkboxes compare against "true" / "false". */
  value?: string;
}

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  /** ISO dates (yyyy-mm-dd). */
  minDate?: string;
  maxDate?: string;
  pattern?: string;
  patternMessage?: string;
}

export interface FieldConfig {
  /** Stable internal identity. Never shown, never submitted; survives key renames. */
  id: string;
  /** Property name in the submitted JSON. Must be unique. */
  key: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: FieldValue;
  width: FieldWidth;
  options?: SelectOption[];
  validation?: ValidationRules;
  visibleWhen?: VisibilityRule | null;
}

export interface FormConfig {
  version: 1;
  title: string;
  description?: string;
  fields: FieldConfig[];
}

export interface ConfigIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  fieldId?: string;
}

/** Validation errors keyed by field `key`. */
export type FieldErrors = Record<string, string>;
