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
    <section className="" aria-labelledby="canvas-title">
      <h2 className="text-[0.95rem] font-bold mb-3" id="canvas-title">
        Employee onboarding
      </h2>

      <div className="grid gap-1 mb-4">
        <label className="text-[0.85rem] font-semibold" htmlFor="form-title">
          Form title
        </label>
        <input
          id="form-title"
          className="w-full font-[inherit] text-[0.95rem] py-2 px-2.5 border border-input rounded-md bg-white text-ink min-h-[38px] focus:border-accent focus:ring-1 focus:ring-accent outline-none"
          value={config.title}
          onChange={(e) => dispatch({ type: 'setMeta', patch: { title: e.target.value } })}
        />
        <label className="text-[0.85rem] font-semibold" htmlFor="form-description">
          Description
        </label>
        <input
          id="form-description"
          className="w-full font-[inherit] text-[0.95rem] py-2 px-2.5 border border-input rounded-md bg-white text-ink min-h-[38px] focus:border-accent focus:ring-1 focus:ring-accent outline-none"
          value={config.description ?? ''}
          onChange={(e) => dispatch({ type: 'setMeta', patch: { description: e.target.value } })}
        />
      </div>

      {count === 0 ? (
        <div className="p-3 rounded-md bg-page text-[0.9rem]">
          <strong>No fields yet.</strong> Choose a form element on the left to add your first field.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 canvas-dot-bg p-3 rounded-lg">
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
                  'min-w-0 rounded-md border p-2.5 pb-2.5 cursor-pointer transition-all',
                  field.width === 'half' ? 'col-span-1' : 'col-span-2',
                  selected ? 'border-accent ring-2 ring-accent-soft ring-offset-1' : 'border-border',
                  hasError ? 'border-danger' : '',
                  isOver ? 'border-dashed border-accent' : '',
                  'bg-surface hover:shadow-sm',
                ].join(' ')}
                draggable
                onClick={() => onSelect(field.id)}
                onDragStart={(e) => {
                  setDragId(field.id);
                  e.dataTransfer.effectAllowed = 'move';
                  // Set a transparent drag image for smoother UX
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
                <div className="flex flex-wrap gap-1 mb-1.5">
                  <button
                    type="button"
                    className={`px-2 py-0.5 text-[0.8rem] rounded border cursor-pointer transition-colors ${
                      selected
                        ? 'bg-accent text-white border-accent font-semibold'
                        : 'bg-surface text-ink border-border hover:border-muted'
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
                    className="px-2 py-0.5 text-[0.8rem] rounded border border-border bg-surface text-ink cursor-pointer hover:border-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                    className="px-2 py-0.5 text-[0.8rem] rounded border border-border bg-surface text-ink cursor-pointer hover:border-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                    className="ml-auto px-2 py-0.5 text-[0.8rem] rounded border border-danger/20 bg-surface text-danger cursor-pointer hover:bg-danger-soft transition-colors"
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
                  <p className={`text-[0.78rem] mt-1.5 ${hasError ? 'text-danger' : 'text-muted'}`}>
                    {hasError ? 'Needs attention · ' : ''}
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
