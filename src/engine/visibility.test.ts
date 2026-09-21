import { describe, expect, it } from 'vitest';
import { makeField } from '../test/helpers';
import { computeVisibility, evaluateRule, getVisibleFields } from './visibility';
import { resolveValues } from './values';

describe('evaluateRule', () => {
  it('handles equals / notEquals', () => {
    expect(evaluateRule({ field: 'a', operator: 'equals', value: 'x' }, 'x')).toBe(true);
    expect(evaluateRule({ field: 'a', operator: 'equals', value: 'x' }, 'y')).toBe(false);
    expect(evaluateRule({ field: 'a', operator: 'notEquals', value: 'x' }, 'y')).toBe(true);
  });

  it('handles isEmpty / isNotEmpty', () => {
    expect(evaluateRule({ field: 'a', operator: 'isEmpty' }, '  ')).toBe(true);
    expect(evaluateRule({ field: 'a', operator: 'isEmpty' }, undefined)).toBe(true);
    expect(evaluateRule({ field: 'a', operator: 'isNotEmpty' }, 'hi')).toBe(true);
  });

  it('compares checkbox values as "true" / "false"', () => {
    expect(evaluateRule({ field: 'c', operator: 'equals', value: 'true' }, true)).toBe(true);
    expect(evaluateRule({ field: 'c', operator: 'equals', value: 'true' }, false)).toBe(false);
    expect(evaluateRule({ field: 'c', operator: 'isNotEmpty' }, false)).toBe(false);
  });
});

describe('computeVisibility', () => {
  const source = makeField('type', 'select', { defaultValue: 'full' });
  const dependent = makeField('dept', 'text', { visibleWhen: { field: 'type', operator: 'equals', value: 'full' } });

  it('reacts to the controlling field value and to defaults', () => {
    const fields = [source, dependent];
    expect(computeVisibility(fields, resolveValues(fields, {}))).toEqual({ type: true, dept: true });
    expect(computeVisibility(fields, resolveValues(fields, { type: 'part' }))).toEqual({ type: true, dept: false });
  });

  it('hides fields whose source field is hidden (cascade)', () => {
    const gate = makeField('gate', 'checkbox');
    const a = makeField('a', 'text', { visibleWhen: { field: 'gate', operator: 'equals', value: 'true' } });
    const b = makeField('b', 'text', { visibleWhen: { field: 'a', operator: 'isEmpty' } });
    const fields = [gate, a, b];
    // gate unchecked -> a hidden -> b hidden even though a is "empty"
    expect(computeVisibility(fields, resolveValues(fields, {})).b).toBe(false);
    expect(computeVisibility(fields, resolveValues(fields, { gate: true })).b).toBe(true);
  });

  it('fails open when the source field does not exist', () => {
    const orphan = makeField('o', 'text', { visibleWhen: { field: 'missing', operator: 'equals', value: 'x' } });
    expect(computeVisibility([orphan], {}).o).toBe(true);
  });

  it('does not loop forever on circular rules', () => {
    const a = makeField('a', 'text', { visibleWhen: { field: 'b', operator: 'isEmpty' } });
    const b = makeField('b', 'text', { visibleWhen: { field: 'a', operator: 'isEmpty' } });
    expect(() => computeVisibility([a, b], { a: '', b: '' })).not.toThrow();
  });

  it('getVisibleFields returns only visible fields, in order', () => {
    const fields = [source, dependent];
    expect(getVisibleFields(fields, resolveValues(fields, { type: 'part' })).map((f) => f.key)).toEqual(['type']);
  });
});
