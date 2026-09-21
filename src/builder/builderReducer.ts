import type { FieldConfig, FormConfig } from '../engine/types';

export type BuilderAction =
  | { type: 'replace'; config: FormConfig }
  | { type: 'setMeta'; patch: Partial<Pick<FormConfig, 'title' | 'description'>> }
  | { type: 'addField'; field: FieldConfig; index?: number }
  | { type: 'updateField'; id: string; patch: Partial<Omit<FieldConfig, 'id'>> }
  | { type: 'removeField'; id: string }
  | { type: 'moveField'; id: string; toIndex: number };

const DEFAULT_OPTIONS = [
  { label: 'Option 1', value: 'option_1' },
  { label: 'Option 2', value: 'option_2' },
];

/** Switching type resets settings that no longer make sense (default value, type-specific rules). */
function applyTypeChange(previous: FieldConfig, next: FieldConfig): FieldConfig {
  return {
    ...next,
    defaultValue: next.type === 'checkbox' ? false : undefined,
    options: next.type === 'select' ? (previous.options?.length ? previous.options : DEFAULT_OPTIONS) : undefined,
    validation: { required: previous.validation?.required },
  };
}

export function builderReducer(state: FormConfig, action: BuilderAction): FormConfig {
  switch (action.type) {
    case 'replace':
      return action.config;

    case 'setMeta':
      return { ...state, ...action.patch };

    case 'addField': {
      const fields = [...state.fields];
      const index = action.index ?? fields.length;
      fields.splice(Math.max(0, Math.min(index, fields.length)), 0, action.field);
      return { ...state, fields };
    }

    case 'updateField': {
      const previous = state.fields.find((f) => f.id === action.id);
      if (!previous) return state;

      let next: FieldConfig = { ...previous, ...action.patch };
      if (action.patch.type && action.patch.type !== previous.type) next = applyTypeChange(previous, next);

      let fields = state.fields.map((f) => (f.id === action.id ? next : f));

      // Renaming a key keeps every rule that listened to it pointing at the same field.
      if (next.key !== previous.key) {
        fields = fields.map((f) =>
          f.id !== action.id && f.visibleWhen?.field === previous.key
            ? { ...f, visibleWhen: { ...f.visibleWhen, field: next.key } }
            : f,
        );
      }
      return { ...state, fields };
    }

    case 'removeField': {
      const removed = state.fields.find((f) => f.id === action.id);
      if (!removed) return state;
      const remaining = state.fields.filter((f) => f.id !== action.id);
      const keyStillExists = remaining.some((f) => f.key === removed.key);
      // Rules that depended on the removed field would point at nothing: clear them.
      const fields = keyStillExists
        ? remaining
        : remaining.map((f) => (f.visibleWhen?.field === removed.key ? { ...f, visibleWhen: null } : f));
      return { ...state, fields };
    }

    case 'moveField': {
      const from = state.fields.findIndex((f) => f.id === action.id);
      if (from === -1) return state;
      const to = Math.max(0, Math.min(action.toIndex, state.fields.length - 1));
      if (from === to) return state;
      const fields = [...state.fields];
      const [moved] = fields.splice(from, 1);
      fields.splice(to, 0, moved);
      return { ...state, fields };
    }

    default:
      return state;
  }
}
