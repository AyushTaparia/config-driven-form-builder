import { describe, expect, it } from 'vitest';
import { makeField } from '../test/helpers';
import { validateField, validateForm } from './validation';

describe('validateField', () => {
  it('requires a value when required (whitespace counts as empty)', () => {
    const f = makeField('name', 'text', { label: 'Full name', validation: { required: true } });
    expect(validateField(f, '')).toBe('Full name is required');
    expect(validateField(f, '   ')).toBe('Full name is required');
    expect(validateField(f, 'Aisha')).toBeNull();
  });

  it('skips every other rule when an optional field is empty', () => {
    const f = makeField('email', 'email');
    expect(validateField(f, '')).toBeNull();
  });

  it('validates email format', () => {
    const f = makeField('email', 'email');
    expect(validateField(f, 'nope')).toBe('Enter a valid email address');
    expect(validateField(f, 'a@b')).toBe('Enter a valid email address');
    expect(validateField(f, 'aisha@company.com')).toBeNull();
  });

  it('validates min/max length for text', () => {
    const f = makeField('t', 'text', { validation: { minLength: 3, maxLength: 5 } });
    expect(validateField(f, 'ab')).toBe('Must be at least 3 characters');
    expect(validateField(f, 'abcdef')).toBe('Must be at most 5 characters');
    expect(validateField(f, 'abcd')).toBeNull();
  });

  it('validates numbers and their min/max', () => {
    const f = makeField('n', 'number', { validation: { min: 1, max: 40 } });
    expect(validateField(f, 'abc')).toBe('Enter a valid number');
    expect(validateField(f, '0')).toBe('Must be at least 1');
    expect(validateField(f, '41')).toBe('Must be at most 40');
    expect(validateField(f, '20.5')).toBeNull();
  });

  it('validates dates and date ranges', () => {
    const f = makeField('d', 'date', { validation: { minDate: '2026-01-01', maxDate: '2026-12-31' } });
    expect(validateField(f, '2026-02-30')).toBe('Enter a valid date');
    expect(validateField(f, '2025-12-31')).toBe('Date must be on or after 2026-01-01');
    expect(validateField(f, '2027-01-01')).toBe('Date must be on or before 2026-12-31');
    expect(validateField(f, '2026-06-15')).toBeNull();
  });

  it('requires a checkbox to be checked when required', () => {
    const f = makeField('agree', 'checkbox', { label: 'Terms', validation: { required: true } });
    expect(validateField(f, false)).toBe('Terms must be checked');
    expect(validateField(f, true)).toBeNull();
  });

  describe('select', () => {
    const options = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
    ];

    it('treats a value that is not an option as empty', () => {
      const f = makeField('s', 'select', { options, validation: { required: true } });
      expect(validateField(f, 'zzz')).toBe('s is required');
      expect(validateField(f, 'a')).toBeNull();
    });

    it('does not crash with missing, empty or malformed options', () => {
      const undefinedOptions = makeField('s', 'select', { options: undefined });
      const emptyOptions = makeField('s', 'select', { options: [] });
      const malformed = makeField('s', 'select', {
        options: [null, { label: 'x' }, { label: 'y', value: '' }] as never,
      });
      for (const f of [undefinedOptions, emptyOptions, malformed]) {
        expect(validateField(f, '')).toBeNull();
        expect(validateField({ ...f, validation: { required: true } }, '')).toBe('s is required');
      }
    });
  });
});

describe('validateForm', () => {
  it('does not validate hidden fields', () => {
    const fields = [
      makeField('kind', 'select', {
        options: [
          { label: 'Full', value: 'full' },
          { label: 'Part', value: 'part' },
        ],
      }),
      makeField('hours', 'number', {
        validation: { required: true },
        visibleWhen: { field: 'kind', operator: 'equals', value: 'part' },
      }),
    ];
    expect(validateForm(fields, { kind: 'full', hours: '' })).toEqual({});
    expect(validateForm(fields, { kind: 'part', hours: '' })).toEqual({ hours: 'hours is required' });
  });

  it('skips unsupported field types', () => {
    const weird = { ...makeField('x'), type: 'signature' } as never;
    expect(validateForm([weird], { x: '' })).toEqual({});
  });
});
