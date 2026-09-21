import type { FieldConfig, FieldValue, FormValues, VisibilityRule } from './types';

export function isEmptyValue(value: FieldValue | undefined): boolean {
  if (value === undefined || value === false) return true;
  if (value === true) return false;
  return value.trim() === '';
}

/** Evaluates one rule against the current value of the field it listens to. */
export function evaluateRule(rule: VisibilityRule, value: FieldValue | undefined): boolean {
  const text = typeof value === 'boolean' ? String(value) : (value ?? '');
  switch (rule.operator) {
    case 'equals':
      return text === (rule.value ?? '');
    case 'notEquals':
      return text !== (rule.value ?? '');
    case 'isEmpty':
      return isEmptyValue(value);
    case 'isNotEmpty':
      return !isEmptyValue(value);
    default:
      return true;
  }
}

/**
 * Returns `{ [field.id]: visible }`.
 *
 * - A field with no rule is visible.
 * - A field whose source field is itself hidden is hidden too (cascade).
 * - A rule pointing at a field that does not exist fails open (visible); the
 *   config validator reports it separately.
 * - Circular rules are treated as hidden; the config validator reports them as errors.
 *
 * `values` must already be resolved (see `resolveValues`).
 */
export function computeVisibility(fields: FieldConfig[], values: FormValues): Record<string, boolean> {
  const byKey = new Map<string, FieldConfig>();
  for (const f of fields) if (!byKey.has(f.key)) byKey.set(f.key, f);

  const memo = new Map<string, boolean>();
  const inProgress = new Set<string>();

  const visit = (field: FieldConfig): boolean => {
    const cached = memo.get(field.id);
    if (cached !== undefined) return cached;

    const rule = field.visibleWhen;
    if (!rule) {
      memo.set(field.id, true);
      return true;
    }
    if (inProgress.has(field.id)) return false;

    inProgress.add(field.id);
    const source = byKey.get(rule.field);
    let result: boolean;
    if (!source) result = true;
    else if (source.id === field.id) result = false;
    else result = visit(source) && evaluateRule(rule, values[source.key]);
    inProgress.delete(field.id);

    memo.set(field.id, result);
    return result;
  };

  const out: Record<string, boolean> = {};
  for (const f of fields) out[f.id] = visit(f);
  return out;
}

export function getVisibleFields(fields: FieldConfig[], values: FormValues): FieldConfig[] {
  const visibility = computeVisibility(fields, values);
  return fields.filter((f) => visibility[f.id]);
}
