import { describe, expect, it } from 'vitest';
import { onboardingForm } from '../config/onboardingForm';
import { makeField } from '../test/helpers';
import { createField, hasBlockingIssues, parseConfig, validateConfig } from './config';
import type { FormConfig } from './types';

const cfg = (fields: FormConfig['fields']): FormConfig => ({ version: 1, title: 't', fields });

describe('validateConfig', () => {
  it('accepts the onboarding form', () => {
    expect(validateConfig(onboardingForm)).toEqual([]);
  });

  it('reports duplicate keys on every field that shares the key', () => {
    const issues = validateConfig(cfg([makeField('a'), makeField('b', 'text', { key: 'a' })]));
    const dupes = issues.filter((i) => i.code === 'key.duplicate');
    expect(dupes).toHaveLength(2);
    expect(dupes[0].message).toMatch(/"a".*unique/);
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it('rejects empty and invalid keys', () => {
    const issues = validateConfig(
      cfg([makeField('a', 'text', { key: '' }), makeField('b', 'text', { key: '9 bad key' })]),
    );
    expect(issues.map((i) => i.code)).toEqual(expect.arrayContaining(['key.empty', 'key.invalid']));
  });

  it('flags self and circular visibility rules as errors', () => {
    const self = validateConfig(cfg([makeField('a', 'text', { visibleWhen: { field: 'a', operator: 'isEmpty' } })]));
    expect(self.map((i) => i.code)).toContain('visibility.self');

    const cycle = validateConfig(
      cfg([
        makeField('a', 'text', { visibleWhen: { field: 'b', operator: 'isEmpty' } }),
        makeField('b', 'text', { visibleWhen: { field: 'a', operator: 'isEmpty' } }),
      ]),
    );
    expect(cycle.filter((i) => i.code === 'visibility.cycle')).toHaveLength(2);
  });

  it('warns (does not block) for unknown visibility source and select without options', () => {
    const issues = validateConfig(
      cfg([
        makeField('a', 'text', { visibleWhen: { field: 'nope', operator: 'isEmpty' } }),
        makeField('s', 'select', { options: undefined }),
      ]),
    );
    expect(issues.map((i) => i.code)).toEqual(expect.arrayContaining(['visibility.unknownField', 'select.noOptions']));
    expect(hasBlockingIssues(issues)).toBe(false);
  });
});

describe('parseConfig', () => {
  it('rejects non-objects and configs without a fields array', () => {
    expect(parseConfig('hello').config).toBeNull();
    expect(parseConfig(null).config).toBeNull();
    expect(parseConfig({ title: 'x' }).config).toBeNull();
    expect(parseConfig({ fields: 'nope' }).issues[0].severity).toBe('error');
  });

  it('skips unsupported field types and reports them', () => {
    const { config, issues } = parseConfig({
      title: 'x',
      fields: [
        { key: 'a', type: 'text', label: 'A' },
        { key: 'sig', type: 'signature', label: 'Sign' },
        'garbage',
      ],
    });
    expect(config?.fields.map((f) => f.key)).toEqual(['a']);
    expect(issues.filter((i) => i.severity === 'warning')).toHaveLength(2);
  });

  it('fills safe defaults for sparse fields', () => {
    const { config } = parseConfig({ fields: [{ key: 'a', type: 'select' }] });
    expect(config?.fields[0]).toMatchObject({ key: 'a', label: 'a', width: 'full', validation: {}, visibleWhen: null });
    expect(config?.title).toBe('Untitled form');
  });

  it('round-trips a valid config', () => {
    const { config, issues } = parseConfig(JSON.parse(JSON.stringify(onboardingForm)));
    expect(issues).toEqual([]);
    expect(config).toEqual(expect.objectContaining({ title: onboardingForm.title }));
    expect(config?.fields).toHaveLength(onboardingForm.fields.length);
  });
});

describe('createField', () => {
  it('generates unique keys', () => {
    const first = createField('text', []);
    const second = createField('text', [first]);
    expect(first.key).toBe('text_1');
    expect(second.key).toBe('text_2');
    expect(second.id).not.toBe(first.id);
  });

  it('gives selects starter options and checkboxes a boolean default', () => {
    expect(createField('select', []).options).toHaveLength(2);
    expect(createField('checkbox', []).defaultValue).toBe(false);
  });
});
