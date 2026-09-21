import { useState, type Dispatch } from 'react';
import type { ConfigIssue, FieldConfig, FormConfig } from '../engine/types';
import { getFieldComponent } from '../fields/registry';
import type { BuilderAction } from './builderReducer';

interface CanvasProps {
  config: FormConfig;
  issues: ConfigIssue[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  dispatch: Dispatch<BuilderAction>;
}

function describeRule(field: FieldConfig, config: FormConfig): string | null {
  const rule = field.visibleWhen;
  if (!rule) return null;
  const source = config.fields.find((f) => f.key === rule.field);
  const sourceLabel = source?.label || rule.field;
  const sourceOption = source?.options?.find((o) => o.value === rule.value);
  const valueLabel = sourceOption?.label ?? rule.value ?? '';
  switch (rule.operator) {
    case 'equals':
      return `Shown when ${sourceLabel} = ${valueLabel}`;
    case 'notEquals':
      return `Shown when ${sourceLabel} ≠ ${valueLabel}`;
    case 'isEmpty':
      return `Shown when ${sourceLabel} is empty`;
    case 'isNotEmpty':
      return `Shown when ${sourceLabel} is filled`;
    default:
      return null;
  }
}

export function Canvas({ config, issues, selectedId, onSelect, onRemove, dispatch }: CanvasProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const count = config.fields.length;

  return (
    <section aria-labelledby="canvas-title">
      <h2 className="text-base font-bold mb-3 text-ink" id="canvas-title">
        {config.title || 'Form canvas'}
      </h2>

      <div className="grid gap-2 mb-5">
        <label className="text-[0.8rem] font-semibold text-muted uppercase tracking-wider" htmlFor="form-title">
          Form title
        </label>
        <input
          id="form-title"
          className="w-full font-[inherit] text-[0.95rem] py-2 px-3 border border-border rounded-lg bg-white text-ink min-h-[38px] focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
          value={config.title}
          onChange={(e) => dispatch({ type: 'setMeta', patch: { title: e.target.value } })}
        />
        <label className="text-[0.8rem] font-semibold text-muted uppercase tracking-wider" htmlFor="form-description">
          Description
        </label>
        <input
          id="form-description"
          className="w-full font-[inherit] text-[0.95rem] py-2 px-3 border border-border rounded-lg bg-white text-ink min-h-[38px] focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
          value={config.description ?? ''}
          onChange={(e) => dispatch({ type: 'setMeta', patch: { description: e.target.value } })}
        />
      </div>

      {count === 0 ? (
        <div className="py-10 px-4 rounded-lg border-2 border-dashed border-border text-center">
          <p className="text-muted text-[0.9rem]">No fields yet. Choose a form element on the left to add your first field.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 canvas-dot-bg p-4 rounded-lg">
          {config.fields.map((field, index) => {
            const Component = getFieldComponent(field.type);
            const selected = field.id === selectedId;
            const fieldIssues = issues.filter((i) => i.fieldId === field.id);
            const hasError = fieldIssues.some((i) => i.severity === 'error');
            const rule = describeRule(field, config);
            const name = field.label || field.key || 'field';
            const isOver = overId === field.id && dragId !== field.id;

            return (
              <li
                key={field.id}
                className={[
                  'min-w-0 rounded-lg border p-3 cursor-pointer transition-all duration-150',
                  field.width === 'half' ? 'col-span-1' : 'col-span-2',
                  selected
                    ? 'border-accent ring-2 ring-accent/15 shadow-md'
                    : 'border-border hover:border-muted hover:shadow-sm',
                  hasError ? 'border-danger/50' : '',
                  isOver ? 'border-dashed border-accent bg-accent-soft/30' : '',
                  'bg-white',
                ].join(' ')}
                draggable
                onClick={() => onSelect(field.id)}
                onDragStart={(e) => {
                  setDragId(field.id);
                  e.dataTransfer.effectAllowed = 'move';
                  const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
                  ghost.style.opacity = '0.6';
                  ghost.style.position = 'absolute';
                  ghost.style.top = '-9999px';
                  document.body.appendChild(ghost);
                  e.dataTransfer.setDragImage(ghost, 0, 0);
                  setTimeout(() => document.body.removeChild(ghost), 0);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setOverId(field.id);
                }}
                onDragLeave={() => setOverId((cur) => (cur === field.id ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId && dragId !== field.id) dispatch({ type: 'moveField', id: dragId, toIndex: index });
                  setDragId(null);
                  setOverId(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <button
                    type="button"
                    className={`px-2.5 py-1 text-[0.78rem] rounded-md border cursor-pointer transition-all duration-150 ${
                      selected
                        ? 'bg-accent text-white border-accent font-semibold shadow-sm'
                        : 'bg-page text-ink border-border hover:border-muted hover:bg-border/30'
                    }`}
                    aria-pressed={selected}
                    aria-label={`Edit ${name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(field.id);
                    }}
                  >
                    {selected ? 'Editing' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    className="px-1.5 py-1 text-[0.78rem] rounded-md border border-border bg-page text-ink cursor-pointer hover:bg-border/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label={`Move ${name} up`}
                    disabled={index === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'moveField', id: field.id, toIndex: index - 1 });
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="px-1.5 py-1 text-[0.78rem] rounded-md border border-border bg-page text-ink cursor-pointer hover:bg-border/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label={`Move ${name} down`}
                    disabled={index === count - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'moveField', id: field.id, toIndex: index + 1 });
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="ml-auto px-2.5 py-1 text-[0.78rem] rounded-md border border-danger/20 bg-page text-danger cursor-pointer hover:bg-danger-soft transition-colors"
                    aria-label={`Remove ${name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(field.id);
                    }}
                  >
                    Remove
                  </button>
                </div>

                <div className="pointer-events-none opacity-80" aria-hidden="true">
                  <Component
                    field={field}
                    inputId={`canvas-${field.id}`}
                    value={field.type === 'checkbox' ? field.defaultValue === true : (field.defaultValue ?? '')}
                    disabled
                    onChange={() => undefined}
                    onBlur={() => undefined}
                  />
                </div>

                {(rule || hasError) && (
                  <p className={`text-[0.75rem] mt-2 pt-2 border-t border-border/50 ${hasError ? 'text-danger' : 'text-muted'}`}>
                    {hasError ? 'Needs attention' : ''}
                    {hasError && rule ? ' · ' : ''}
                    {rule}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
