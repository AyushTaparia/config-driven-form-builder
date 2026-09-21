import { useId, type Dispatch, type ReactNode } from 'react';
import { FIELD_TYPE_LABELS, getSelectOptions } from '../engine/config';
import {
  FIELD_TYPES,
  type ConfigIssue,
  type FieldConfig,
  type FieldType,
  type FormConfig,
  type ValidationRules,
  type VisibilityOperator,
  type VisibilityRule,
} from '../engine/types';
import type { BuilderAction } from './builderReducer';
import { OptionsEditor } from './OptionsEditor';

interface PropertiesPanelProps {
  config: FormConfig;
  field: FieldConfig | null;
  issues: ConfigIssue[];
  dispatch: Dispatch<BuilderAction>;
  onRemove: (id: string) => void;
}

const OPERATOR_LABELS: Record<VisibilityOperator, string> = {
  equals: 'equals',
  notEquals: 'does not equal',
  isEmpty: 'is empty',
  isNotEmpty: 'is not empty',
};

function toNumber(text: string): number | undefined {
  if (text.trim() === '') return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

/* Small labelled inputs so every control has a real <label>. */

function TextProp(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
}) {
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  return (
    <div className="grid gap-1">
      <label className="text-[0.85rem] font-semibold" htmlFor={id}>
        {props.label}
      </label>
      <input
        id={id}
        className="w-full font-[inherit] text-[0.9rem] py-2 px-3 border border-border rounded-lg bg-white text-ink min-h-[38px] focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
        type={props.type ?? 'text'}
        step={props.type === 'number' ? 'any' : undefined}
        value={props.value}
        placeholder={props.placeholder}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={[props.hint ? hintId : '', props.error ? errId : ''].filter(Boolean).join(' ') || undefined}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.hint && (
        <p className="text-[0.78rem] text-muted" id={hintId}>
          {props.hint}
        </p>
      )}
      {props.error && (
        <p className="text-[0.82rem] text-danger font-medium" id={errId} role="alert">
          {props.error}
        </p>
      )}
    </div>
  );
}

function SelectProp(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="grid gap-1">
      <label className="text-[0.85rem] font-semibold" htmlFor={id}>
        {props.label}
      </label>
      <select
        id={id}
        className="w-full font-[inherit] text-[0.9rem] py-2 px-3 border border-border rounded-lg bg-white text-ink min-h-[38px] focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      >
        {props.children}
      </select>
    </div>
  );
}

function CheckProp(props: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const id = useId();
  return (
    <div className="grid gap-1">
      <label className="flex items-start gap-2 text-[0.92rem] cursor-pointer" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={props.checked}
          className="w-[18px] h-[18px] mt-0.5 accent-accent"
          onChange={(e) => props.onChange(e.target.checked)}
        />
        <span>{props.label}</span>
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function VisibilityEditor({
  config,
  field,
  update,
}: {
  config: FormConfig;
  field: FieldConfig;
  update: (patch: Partial<FieldConfig>) => void;
}) {
  const rule = field.visibleWhen ?? null;
  const others = config.fields.filter((f) => f.id !== field.id);
  const source = rule ? config.fields.find((f) => f.key === rule.field) : undefined;
  const sourceOptions = source?.type === 'select' ? getSelectOptions(source) : [];
  const sourceKnown = !rule || rule.field === '' || others.some((f) => f.key === rule.field);

  const setRule = (next: VisibilityRule | null) => update({ visibleWhen: next });

  const defaultValueFor = (target: FieldConfig | undefined): string => {
    if (!target) return '';
    if (target.type === 'checkbox') return 'true';
    if (target.type === 'select') return getSelectOptions(target)[0]?.value ?? '';
    return '';
  };

  const valueId = useId();

  return (
    <fieldset className="border border-border rounded-lg p-3 grid gap-3 min-w-0">
      <legend className="text-[0.8rem] font-semibold text-muted uppercase tracking-wider px-1">Conditional visibility</legend>
      <SelectProp
        label="Show when field"
        value={rule?.field ?? ''}
        onChange={(key) => {
          if (key === '') return setRule(null);
          const target = config.fields.find((f) => f.key === key);
          setRule({ field: key, operator: rule?.operator ?? 'equals', value: defaultValueFor(target) });
        }}
      >
        <option value="">Always visible</option>
        {others.map((f) => (
          <option key={f.id} value={f.key}>
            {f.label || f.key} ({f.key})
          </option>
        ))}
        {!sourceKnown && rule && <option value={rule.field}>{rule.field} (missing)</option>}
      </SelectProp>

      {rule && (
        <>
          <SelectProp
            label="Condition"
            value={rule.operator}
            onChange={(operator) => setRule({ ...rule, operator: operator as VisibilityOperator })}
          >
            {(Object.keys(OPERATOR_LABELS) as VisibilityOperator[]).map((op) => (
              <option key={op} value={op}>
                {OPERATOR_LABELS[op]}
              </option>
            ))}
          </SelectProp>

          {(rule.operator === 'equals' || rule.operator === 'notEquals') &&
            (sourceOptions.length > 0 || source?.type === 'checkbox' ? (
              <div className="grid gap-1">
                <label className="text-[0.85rem] font-semibold" htmlFor={valueId}>
                  Value
                </label>
                <select
                  id={valueId}
                  className="w-full font-[inherit] text-[0.95rem] py-2 px-2.5 border border-input rounded-md bg-white text-ink min-h-[38px] focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  value={rule.value ?? ''}
                  onChange={(e) => setRule({ ...rule, value: e.target.value })}
                >
                  {source?.type === 'checkbox' ? (
                    <>
                      <option value="true">Checked</option>
                      <option value="false">Unchecked</option>
                    </>
                  ) : (
                    <>
                      {!sourceOptions.some((o) => o.value === (rule.value ?? '')) && (
                        <option value={rule.value ?? ''}>{rule.value ? `${rule.value} (missing)` : 'Choose a value'}</option>
                      )}
                      {sourceOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            ) : (
              <TextProp label="Value" value={rule.value ?? ''} onChange={(value) => setRule({ ...rule, value })} />
            ))}
        </>
      )}
    </fieldset>
  );
}

export function PropertiesPanel({ config, field, issues, dispatch, onRemove }: PropertiesPanelProps) {
  if (!field) {
    return (
      <section className="p-4" aria-labelledby="props-title">
        <h2 className="text-[0.8rem] font-semibold text-muted uppercase tracking-wider mb-3" id="props-title">
          Field properties
        </h2>
        <div className="py-8 px-4 rounded-lg border-2 border-dashed border-border text-center">
          <p className="text-muted text-[0.85rem]">Select a field on the canvas to edit its properties.</p>
        </div>
      </section>
    );
  }

  const update = (patch: Partial<Omit<FieldConfig, 'id'>>) => dispatch({ type: 'updateField', id: field.id, patch });
  const rules = field.validation ?? {};
  const updateRules = (patch: Partial<ValidationRules>) => update({ validation: { ...rules, ...patch } });

  const fieldIssues = issues.filter((i) => i.fieldId === field.id);
  const keyIssue = fieldIssues.find((i) => i.code.startsWith('key.'));
  const otherIssues = fieldIssues.filter((i) => !i.code.startsWith('key.'));

  const isTextual = field.type === 'text' || field.type === 'textarea' || field.type === 'email';
  const options = getSelectOptions(field);

  return (
    <section className="p-4 grid gap-4" aria-labelledby="props-title">
      <h2 className="text-[0.8rem] font-semibold text-muted uppercase tracking-wider" id="props-title">
        Field properties
      </h2>

      {otherIssues.length > 0 && (
        <ul className="text-sm py-2 px-3 rounded-lg bg-warn-soft text-warn-text border border-warn-soft" aria-label="Issues with this field">
          {otherIssues.map((issue, i) => (
            <li key={`${issue.code}-${i}`}>{issue.message}</li>
          ))}
        </ul>
      )}

      <TextProp label="Label" value={field.label} onChange={(label) => update({ label })} />
      <TextProp
        label="Field key"
        value={field.key}
        onChange={(key) => update({ key })}
        error={keyIssue?.message}
        hint="The property name used in the submitted JSON."
      />
      <SelectProp
        label="Input type"
        value={field.type}
        onChange={(type) => update({ type: type as FieldType })}
      >
        {FIELD_TYPES.map((t) => (
          <option key={t} value={t}>
            {FIELD_TYPE_LABELS[t]}
          </option>
        ))}
      </SelectProp>

      {field.type !== 'checkbox' && (
        <TextProp
          label="Placeholder"
          value={field.placeholder ?? ''}
          onChange={(placeholder) => update({ placeholder })}
        />
      )}
      <TextProp label="Help text" value={field.helpText ?? ''} onChange={(helpText) => update({ helpText })} />

      {/* Default value control adapts to the field type. */}
      {field.type === 'checkbox' ? (
        <CheckProp
          label="Checked by default"
          checked={field.defaultValue === true}
          onChange={(defaultValue) => update({ defaultValue })}
        />
      ) : field.type === 'select' ? (
        <SelectProp
          label="Default value"
          value={typeof field.defaultValue === 'string' ? field.defaultValue : ''}
          onChange={(defaultValue) => update({ defaultValue })}
        >
          <option value="">None</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectProp>
      ) : (
        <TextProp
          label="Default value"
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          value={typeof field.defaultValue === 'string' ? field.defaultValue : ''}
          onChange={(defaultValue) => update({ defaultValue })}
        />
      )}

      <SelectProp label="Width" value={field.width} onChange={(width) => update({ width: width as FieldConfig['width'] })}>
        <option value="full">Full width</option>
        <option value="half">Half width</option>
      </SelectProp>

      {field.type === 'select' && <OptionsEditor options={field.options} onChange={(opts) => update({ options: opts })} />}

      <fieldset className="border border-border rounded-lg p-3 grid gap-3">
        <legend className="text-[0.8rem] font-semibold text-muted uppercase tracking-wider px-1">Validation</legend>
        <CheckProp label="Required field" checked={rules.required === true} onChange={(required) => updateRules({ required })} />

        {isTextual && (
          <div className="grid grid-cols-2 gap-2">
            <TextProp
              label="Min length"
              type="number"
              value={rules.minLength?.toString() ?? ''}
              onChange={(v) => updateRules({ minLength: toNumber(v) })}
            />
            <TextProp
              label="Max length"
              type="number"
              value={rules.maxLength?.toString() ?? ''}
              onChange={(v) => updateRules({ maxLength: toNumber(v) })}
            />
          </div>
        )}
        {field.type === 'number' && (
          <div className="grid grid-cols-2 gap-2">
            <TextProp
              label="Minimum"
              type="number"
              value={rules.min?.toString() ?? ''}
              onChange={(v) => updateRules({ min: toNumber(v) })}
            />
            <TextProp
              label="Maximum"
              type="number"
              value={rules.max?.toString() ?? ''}
              onChange={(v) => updateRules({ max: toNumber(v) })}
            />
          </div>
        )}
        {field.type === 'date' && (
          <div className="grid grid-cols-2 gap-2">
            <TextProp
              label="Earliest date"
              type="date"
              value={rules.minDate ?? ''}
              onChange={(v) => updateRules({ minDate: v || undefined })}
            />
            <TextProp
              label="Latest date"
              type="date"
              value={rules.maxDate ?? ''}
              onChange={(v) => updateRules({ maxDate: v || undefined })}
            />
          </div>
        )}
      </fieldset>

      <VisibilityEditor config={config} field={field} update={update} />

      <button
        type="button"
        className="mt-1 w-full px-3 py-2 text-[0.85rem] rounded-lg cursor-pointer border border-danger/20 bg-white text-danger font-medium hover:bg-danger-soft transition-colors"
        onClick={() => onRemove(field.id)}
      >
        Remove this field
      </button>
    </section>
  );
}
