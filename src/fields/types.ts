import type { FieldConfig, FieldValue } from '../engine/types';

/** The contract every field component implements. */
export interface FieldComponentProps {
  field: FieldConfig;
  /** DOM id of the input; the label, help text and error are wired to it. */
  inputId: string;
  value: FieldValue;
  error?: string;
  disabled?: boolean;
  onChange: (value: FieldValue) => void;
  onBlur: () => void;
}
