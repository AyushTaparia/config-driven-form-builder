import type { ComponentType } from 'react';
import { isSupportedType } from '../engine/config';
import type { FieldType } from '../engine/types';
import { CheckboxField } from './CheckboxField';
import { SelectField } from './SelectField';
import { TextareaField } from './TextareaField';
import { TextLikeField } from './TextLikeField';
import type { FieldComponentProps } from './types';
import { UnsupportedField } from './UnsupportedField';

/**
 * The single place that maps a config `type` to a component.
 * Adding a new field type = add a component + one line here (+ the type in the engine).
 */
export const fieldRegistry: Record<FieldType, ComponentType<FieldComponentProps>> = {
  text: TextLikeField,
  number: TextLikeField,
  email: TextLikeField,
  date: TextLikeField,
  select: SelectField,
  textarea: TextareaField,
  checkbox: CheckboxField,
};

export function getFieldComponent(type: unknown): ComponentType<FieldComponentProps> {
  return isSupportedType(type) ? fieldRegistry[type] : UnsupportedField;
}
