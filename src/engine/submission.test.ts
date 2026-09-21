import { describe, expect, it } from 'vitest';
import { makeField } from '../test/helpers';
import { buildSubmission, submitForm } from './submission';
import { resolveValues } from './values';

const fields = [
  makeField('name', 'text', { validation: { required: true } }),
  makeField('age', 'number'),
  makeField('start', 'date'),
  makeField('team', 'select', { options: [{ label: 'Core', value: 'core' }] }),
  makeField('notes', 'textarea'),
  makeField('news', 'checkbox', { defaultValue: true }),
  makeField('hours', 'number', { visibleWhen: { field: 'news', operator: 'equals', value: 'false' } }),
];

describe('buildSubmission', () => {
  it('preserves types: number -> number, checkbox -> boolean, empty -> null', () => {
    const values = resolveValues(fields, { name: '  Aisha ', age: '31', start: '2026-10-01', team: 'core', notes: 'hi' });
    expect(buildSubmission(fields, values)).toEqual({
      name: 'Aisha',
      age: 31,
      start: '2026-10-01',
      team: 'core',
      notes: 'hi',
      news: true,
    });
  });

  it('uses null for empty number/date/select and "" for empty text', () => {
    const values = resolveValues(fields, { name: 'A' });
    expect(buildSubmission(fields, values)).toMatchObject({ age: null, start: null, team: null, notes: '' });
  });

  it('keeps decimals and negative numbers', () => {
    const values = resolveValues(fields, { name: 'A', age: '-2.5' });
    expect(buildSubmission(fields, values).age).toBe(-2.5);
  });

  it('excludes hidden fields, even when they hold a value', () => {
    const values = resolveValues(fields, { name: 'A', hours: '40' });
    expect(buildSubmission(fields, values)).not.toHaveProperty('hours'); // news is true -> hours hidden
    const shown = resolveValues(fields, { name: 'A', hours: '40', news: false });
    expect(buildSubmission(fields, shown).hours).toBe(40);
  });

  it('nulls a select value that is no longer a configured option', () => {
    const values = resolveValues(fields, { name: 'A', team: 'gone' });
    expect(buildSubmission(fields, values).team).toBeNull();
  });
});

describe('submitForm', () => {
  it('returns errors and no data while a visible field is invalid', () => {
    const result = submitForm(fields, resolveValues(fields, {}));
    expect(result).toEqual({ ok: false, errors: { name: 'name is required' } });
  });

  it('returns typed data when everything is valid', () => {
    const result = submitForm(fields, resolveValues(fields, { name: 'Aisha' }));
    expect(result.ok).toBe(true);
  });
});
