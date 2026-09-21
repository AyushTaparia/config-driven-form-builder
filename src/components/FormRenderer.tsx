import { useId, useMemo, useState, type FormEvent } from 'react';
import { hasBlockingIssues, validateConfig } from '../engine/config';
import type { ConfigIssue, FormConfig, SubmittedData } from '../engine/types';
import { useFormEngine } from '../engine/useFormEngine';
import { getFieldComponent } from '../fields/registry';

export interface FormRendererProps {
  config: FormConfig;
  /** Called with the typed JSON payload once every visible field is valid. */
  onSubmit?: (data: SubmittedData) => void | Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  submitLabel?: string;
}

function FormSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-lg p-6 grid gap-4" aria-busy="true" aria-live="polite">
      <p className="visually-hidden">Loading form…</p>
      <div className="h-7 w-1/2 rounded-md skeleton-shimmer" />
      <div className="h-[38px] rounded-md skeleton-shimmer" />
      <div className="h-[38px] rounded-md skeleton-shimmer" />
      <div className="h-[38px] rounded-md skeleton-shimmer" />
    </div>
  );
}

function ConfigErrors({ issues }: { issues: ConfigIssue[] }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-6 grid gap-4">
      <div className="py-2.5 px-3 rounded-md bg-danger-soft text-danger-text" role="alert">
        <h2 className="text-base font-semibold mb-1">This form can{'\u2019'}t be shown yet</h2>
        <p className="text-sm">Fix the following configuration problems in the builder:</p>
        <ul className="list-disc pl-7 mt-1">
          {[...new Set(issues.map((issue) => issue.message))].map((message) => (
            <li key={message} className="text-sm">{message}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Renders any FormConfig. It contains no field-specific knowledge: it asks the
 * registry for a component per field and wires it to the form state.
 */
export function FormRenderer({
  config,
  onSubmit,
  isLoading = false,
  disabled = false,
  submitLabel = 'Submit',
}: FormRendererProps) {
  const formId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const engine = useFormEngine(config.fields);
  const [status, setStatus] = useState<'idle' | 'submitting'>('idle');
  const [result, setResult] = useState<SubmittedData | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const issues = useMemo(() => validateConfig(config), [config]);
  const blocking = useMemo(() => issues.filter((i) => i.severity === 'error'), [issues]);

  if (isLoading) return <FormSkeleton />;
  if (hasBlockingIssues(blocking)) return <ConfigErrors issues={blocking} />;

  const inputIdFor = (key: string) => `${formId}-${key}`;
  const submitting = status === 'submitting';
  const visibleFields = config.fields.filter((f) => engine.visibility[f.id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting || disabled) return;
    setResult(null);
    setSubmitError(null);

    const outcome = engine.submit();
    if (!outcome.ok) {
      const firstInvalid = config.fields.find((f) => engine.visibility[f.id] && outcome.errors[f.key]);
      if (firstInvalid) document.getElementById(inputIdFor(firstInvalid.key))?.focus();
      return;
    }

    setStatus('submitting');
    try {
      await onSubmit?.(outcome.data);
      setResult(outcome.data);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong while submitting.');
    } finally {
      setStatus('idle');
    }
  }

  if (config.fields.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-lg p-6 grid gap-4">
        <h2 className="text-xl font-bold">{config.title}</h2>
        <div className="py-2 px-3 rounded-md bg-page text-sm">This form has no fields yet. Add fields in the builder.</div>
      </div>
    );
  }

  return (
    <form
      className="bg-surface border border-border rounded-lg p-6 grid gap-4"
      noValidate
      onSubmit={handleSubmit}
      aria-labelledby={`${formId}-title`}
    >
      <h2 className="text-xl font-bold" id={`${formId}-title`}>
        {config.title}
      </h2>
      {config.description && <p className="text-muted mt-[-8px]">{config.description}</p>}

      {engine.submitAttempted && engine.errorCount > 0 && (
        <p className="text-sm py-2 px-3 rounded-md bg-danger-soft text-danger-text" role="alert">
          Please fix {engine.errorCount} {engine.errorCount === 1 ? 'field' : 'fields'} marked below.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {visibleFields.map((field) => {
          const Component = getFieldComponent(field.type);
          return (
            <div key={field.id} className={`form-cell min-w-0 ${field.width === 'half' ? 'form-cell--half col-span-2 md:col-span-1' : 'form-cell--full col-span-2'}`}>
              <Component
                field={field}
                inputId={inputIdFor(field.key)}
                value={engine.values[field.key]}
                error={engine.errors[field.key]}
                disabled={disabled || submitting}
                onChange={(value) => {
                  setResult(null);
                  engine.setValue(field.key, value);
                }}
                onBlur={() => engine.touch(field.key)}
              />
            </div>
          );
        })}
      </div>

      {submitError && (
        <p className="text-sm py-2 px-3 rounded-md bg-danger-soft text-danger-text" role="alert">
          Submission failed: {submitError}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-md cursor-pointer border border-accent bg-accent text-white font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={disabled || submitting}
        >
          {submitting ? 'Submitting…' : submitLabel}
        </button>
        <button
          type="button"
          className="px-4 py-2 text-sm rounded-md cursor-pointer border border-border bg-surface text-ink hover:border-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={submitting}
          onClick={() => {
            engine.reset();
            setResult(null);
            setSubmitError(null);
          }}
        >
          Reset
        </button>
      </div>

      {result && (
        <section className="py-2.5 px-3 rounded-md bg-ok-soft text-ok-text" role="status" aria-label="Submitted data">
          <h3 className="text-base font-semibold mb-1">Submitted</h3>
          <pre className="mt-2 p-2.5 bg-white rounded-md overflow-x-auto text-[0.82rem] text-ink" data-testid="submission-output">
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </form>
  );
}
