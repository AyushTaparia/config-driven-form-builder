import {
  FIELD_TYPES,
  type ConfigIssue,
  type FieldConfig,
  type FieldType,
  type FieldValue,
  type FormConfig,
  type SelectOption,
  type ValidationRules,
  type VisibilityOperator,
  type VisibilityRule,
} from './types';

export const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const VISIBILITY_OPERATORS: VisibilityOperator[] = [
  'equals',
  'notEquals',
  'isEmpty',
  'isNotEmpty',
];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  email: 'Email',
  select: 'Select',
  date: 'Date',
  textarea: 'Textarea',
  checkbox: 'Checkbox',
};

export function isSupportedType(type: unknown): type is FieldType {
  return typeof type === 'string' && (FIELD_TYPES as readonly string[]).includes(type);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

let idCounter = 0;
export function newId(): string {
  idCounter += 1;
  return `f_${Date.now().toString(36)}${idCounter}${Math.random().toString(36).slice(2, 6)}`;
}

/** Creates a new field with a unique key such as `text_1`, `text_2`, ... */
export function createField(type: FieldType, existing: FieldConfig[]): FieldConfig {
  const taken = new Set(existing.map((f) => f.key));
  let n = 1;
  while (taken.has(`${type}_${n}`)) n += 1;

  const field: FieldConfig = {
    id: newId(),
    key: `${type}_${n}`,
    type,
    label: `${FIELD_TYPE_LABELS[type]} field`,
    placeholder: '',
    width: 'full',
    validation: {},
  };
  if (type === 'select') {
    field.options = [
      { label: 'Option 1', value: 'option_1' },
      { label: 'Option 2', value: 'option_2' },
    ];
  }
  if (type === 'checkbox') field.defaultValue = false;
  return field;
}

/**
 * Options that are safe to render: tolerates `undefined`, non-arrays, malformed
 * entries, empty values and duplicate values.
 */
export function getSelectOptions(field: FieldConfig): SelectOption[] {
  if (!Array.isArray(field.options)) return [];
  const seen = new Set<string>();
  const result: SelectOption[] = [];
  for (const option of field.options) {
    if (!option || typeof option.value !== 'string' || option.value.trim() === '') continue;
    if (seen.has(option.value)) continue;
    seen.add(option.value);
    result.push({
      value: option.value,
      label: typeof option.label === 'string' && option.label.trim() ? option.label : option.value,
    });
  }
  return result;
}

/**
 * Validates the *configuration itself* (not user input).
 * `error` issues block rendering; `warning` issues are reported but the form still works.
 */
export function validateConfig(config: FormConfig): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const fields = Array.isArray(config?.fields) ? config.fields : [];

  const keyCounts = new Map<string, number>();
  const byKey = new Map<string, FieldConfig>();
  for (const f of fields) {
    keyCounts.set(f.key, (keyCounts.get(f.key) ?? 0) + 1);
    if (!byKey.has(f.key)) byKey.set(f.key, f);
  }

  for (const f of fields) {
    const name = f.label?.trim() || f.key || 'Untitled field';
    const add = (severity: ConfigIssue['severity'], code: string, message: string) =>
      issues.push({ severity, code, message, fieldId: f.id });

    if (!isSupportedType(f.type)) {
      add('warning', 'type.unsupported', `"${name}" has unsupported type "${String(f.type)}" and is skipped.`);
    }

    if (!f.key || !f.key.trim()) {
      add('error', 'key.empty', `"${name}" needs a field key.`);
    } else if (!KEY_PATTERN.test(f.key)) {
      add(
        'error',
        'key.invalid',
        `Field key "${f.key}" must start with a letter or underscore and use only letters, numbers and underscores.`,
      );
    } else if ((keyCounts.get(f.key) ?? 0) > 1) {
      add('error', 'key.duplicate', `Field key "${f.key}" is used by more than one field. Keys must be unique.`);
    }

    if (!f.label || !f.label.trim()) {
      add('warning', 'label.empty', `The field with key "${f.key}" has no label.`);
    }

    if (f.type === 'select') {
      const raw = Array.isArray(f.options) ? f.options : [];
      const usable = getSelectOptions(f);
      if (usable.length === 0) {
        add('warning', 'select.noOptions', `"${name}" has no options, so it cannot be answered. Add at least one option.`);
      } else if (usable.length < raw.length) {
        add('warning', 'select.invalidOptions', `"${name}" has options with an empty or duplicate value that are ignored.`);
      }
    }

    if (f.validation?.pattern) {
      try {
        new RegExp(f.validation.pattern);
      } catch {
        add('warning', 'pattern.invalid', `"${name}" has an invalid pattern, so the pattern rule is ignored.`);
      }
    }

    const rule = f.visibleWhen;
    if (rule) {
      if (rule.field === f.key) {
        add('error', 'visibility.self', `"${name}" cannot depend on itself.`);
      } else if (!byKey.has(rule.field)) {
        add(
          'warning',
          'visibility.unknownField',
          `"${name}" is shown based on "${rule.field}", which does not exist. It is always shown until that is fixed.`,
        );
      } else {
        // Walk the dependency chain; if it leads back to this field there is a cycle.
        const seen = new Set<string>([f.id]);
        let cursor: FieldConfig | undefined = byKey.get(rule.field);
        while (cursor) {
          if (cursor.id === f.id) {
            add('error', 'visibility.cycle', `"${name}" has a circular visibility dependency.`);
            break;
          }
          if (seen.has(cursor.id)) break;
          seen.add(cursor.id);
          cursor = cursor.visibleWhen ? byKey.get(cursor.visibleWhen.field) : undefined;
        }
      }
    }
  }

  return issues;
}

export function hasBlockingIssues(issues: ConfigIssue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}

/* ------------------------------------------------------------------ */
/* Parsing untrusted JSON into a FormConfig                            */
/* ------------------------------------------------------------------ */

export interface ParseResult {
  config: FormConfig | null;
  issues: ConfigIssue[];
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseValidation(raw: unknown): ValidationRules {
  if (!isRecord(raw)) return {};
  const rules: ValidationRules = {};
  if (typeof raw.required === 'boolean') rules.required = raw.required;
  for (const k of ['minLength', 'maxLength', 'min', 'max'] as const) {
    const n = optionalNumber(raw[k]);
    if (n !== undefined) rules[k] = n;
  }
  for (const k of ['minDate', 'maxDate', 'pattern', 'patternMessage'] as const) {
    const s = optionalString(raw[k]);
    if (s !== undefined && s !== '') rules[k] = s;
  }
  return rules;
}

function parseVisibility(raw: unknown): VisibilityRule | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.field !== 'string' || raw.field === '') return null;
  const operator = raw.operator;
  if (!VISIBILITY_OPERATORS.includes(operator as VisibilityOperator)) return null;
  return {
    field: raw.field,
    operator: operator as VisibilityOperator,
    value: optionalString(raw.value),
  };
}

function parseField(raw: unknown, index: number, issues: ConfigIssue[]): FieldConfig | null {
  if (!isRecord(raw)) {
    issues.push({ severity: 'warning', code: 'field.invalid', message: `Field #${index + 1} is not an object and was skipped.` });
    return null;
  }
  const key = typeof raw.key === 'string' ? raw.key : '';
  const rawType = raw.type;
  if (!isSupportedType(rawType)) {
    issues.push({
      severity: 'warning',
      code: 'type.unsupported',
      message: `Field #${index + 1} ("${key || 'no key'}") was skipped: unsupported type "${String(rawType)}".`,
    });
    return null;
  }

  let defaultValue: FieldValue | undefined;
  if (rawType === 'checkbox') {
    defaultValue = raw.defaultValue === true;
  } else if (typeof raw.defaultValue === 'string') {
    defaultValue = raw.defaultValue;
  } else if (typeof raw.defaultValue === 'number') {
    defaultValue = String(raw.defaultValue);
  }

  const options = Array.isArray(raw.options)
    ? raw.options.filter(isRecord).map((o) => ({
        value: typeof o.value === 'string' ? o.value : o.value != null ? String(o.value) : '',
        label: typeof o.label === 'string' ? o.label : o.value != null ? String(o.value) : '',
      }))
    : undefined;

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
    key,
    type: rawType,
    label: typeof raw.label === 'string' ? raw.label : key,
    placeholder: optionalString(raw.placeholder),
    helpText: optionalString(raw.helpText),
    defaultValue,
    width: raw.width === 'half' ? 'half' : 'full',
    options,
    validation: parseValidation(raw.validation),
    visibleWhen: parseVisibility(raw.visibleWhen),
  };
}

/** Turns arbitrary JSON into a well-formed config, reporting anything it had to drop. */
export function parseConfig(input: unknown): ParseResult {
  if (!isRecord(input)) {
    return {
      config: null,
      issues: [{ severity: 'error', code: 'config.invalid', message: 'The configuration must be a JSON object.' }],
    };
  }
  if (!Array.isArray(input.fields)) {
    return {
      config: null,
      issues: [{ severity: 'error', code: 'config.fields', message: 'The configuration needs a "fields" array.' }],
    };
  }

  const issues: ConfigIssue[] = [];
  const fields: FieldConfig[] = [];
  input.fields.forEach((raw, index) => {
    const parsed = parseField(raw, index, issues);
    if (parsed) fields.push(parsed);
  });

  const config: FormConfig = {
    version: 1,
    title: typeof input.title === 'string' ? input.title : 'Untitled form',
    description: optionalString(input.description),
    fields,
  };
  return { config, issues: [...issues, ...validateConfig(config)] };
}
