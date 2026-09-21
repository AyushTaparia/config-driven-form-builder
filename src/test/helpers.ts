import { createField } from '../engine/config';
import type { FieldConfig, FieldType } from '../engine/types';

/** Concise field factory for tests. */
export function makeField(
  key: string,
  type: FieldType = 'text',
  overrides: Partial<FieldConfig> = {},
): FieldConfig {
  return { ...createField(type, []), id: key, key, label: key, ...overrides };
}
