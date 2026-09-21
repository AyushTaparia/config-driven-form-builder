import { describe, expect, it } from 'vitest';
import { makeField } from '../test/helpers';
import type { FormConfig } from '../engine/types';
import { builderReducer } from './builderReducer';

const base = (): FormConfig => ({
  version: 1,
  title: 't',
  fields: [
    makeField('type', 'select'),
    makeField('dept', 'text', { visibleWhen: { field: 'type', operator: 'equals', value: 'x' } }),
    makeField('notes', 'textarea'),
  ],
});

describe('builderReducer', () => {
  it('adds a field at the end or at an index', () => {
    const added = makeField('new');
    expect(builderReducer(base(), { type: 'addField', field: added }).fields.map((f) => f.id)).toEqual([
      'type', 'dept', 'notes', 'new',
    ]);
    expect(builderReducer(base(), { type: 'addField', field: added, index: 1 }).fields[1].id).toBe('new');
  });

  it('updates a field without touching others', () => {
    const state = base();
    const next = builderReducer(state, { type: 'updateField', id: 'notes', patch: { label: 'Comments' } });
    expect(next.fields[2].label).toBe('Comments');
    expect(next.fields[0]).toBe(state.fields[0]);
  });

  it('keeps visibility rules pointing at a renamed field', () => {
    const next = builderReducer(base(), { type: 'updateField', id: 'type', patch: { key: 'employment_type' } });
    expect(next.fields[1].visibleWhen?.field).toBe('employment_type');
  });

  it('clears rules that depended on a removed field', () => {
    const next = builderReducer(base(), { type: 'removeField', id: 'type' });
    expect(next.fields.map((f) => f.id)).toEqual(['dept', 'notes']);
    expect(next.fields[0].visibleWhen).toBeNull();
  });

  it('reorders fields and clamps out-of-range targets', () => {
    const up = builderReducer(base(), { type: 'moveField', id: 'notes', toIndex: 0 });
    expect(up.fields.map((f) => f.id)).toEqual(['notes', 'type', 'dept']);
    const clamped = builderReducer(base(), { type: 'moveField', id: 'type', toIndex: 99 });
    expect(clamped.fields.map((f) => f.id)).toEqual(['dept', 'notes', 'type']);
  });

  it('resets type-specific settings when the type changes', () => {
    const state: FormConfig = {
      ...base(),
      fields: [makeField('a', 'number', { defaultValue: '5', validation: { required: true, min: 1 } })],
    };
    const next = builderReducer(state, { type: 'updateField', id: 'a', patch: { type: 'select' } });
    expect(next.fields[0].defaultValue).toBeUndefined();
    expect(next.fields[0].validation).toEqual({ required: true });
    expect(next.fields[0].options).toHaveLength(2);
  });

  it('ignores unknown ids', () => {
    const state = base();
    expect(builderReducer(state, { type: 'removeField', id: 'zzz' })).toBe(state);
    expect(builderReducer(state, { type: 'moveField', id: 'zzz', toIndex: 0 })).toBe(state);
    expect(builderReducer(state, { type: 'updateField', id: 'zzz', patch: {} })).toBe(state);
  });
});
