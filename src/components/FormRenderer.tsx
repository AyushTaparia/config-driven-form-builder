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
    <div className="bg-white border border-border rounded-2xl p-8 grid gap-5 shadow-sm" aria-busy="true" aria-live="polite">
      <p className="visually-hidden">Loading form…</p>
      <div className="h-8 w-2/3 rounded-lg skeleton-shimmer" />
      <div className="h-4 w-1/2 rounded skeleton-shimmer" />
      <div className="h-[42px] rounded-lg skeleton-shimmer" />
      <div className="h-[42px] rounded-lg skeleton-shimmer" />
      <div className="h-[42px] rounded-lg skeleton-shimmer" />
    </div>
  );
}

function ConfigErrors({ issues }: { issues: ConfigIssue[] }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-8 grid gap-4 shadow-sm">
      <div className="py-4 px-5 rounded-xl bg-danger-soft border border-danger/10" role="alert">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-8 h-8 rounded-full bg-danger/10 text-danger flex items-center justify-center text-sm font-bold">!</span>
          <h2 className="text-lg font-bold text-danger-text">This form can{'\u2019'}t be shown yet</h2>
        </div>
        <p className="text-sm text-danger-text/80 mb-3">Fix the following configuration problems in the builder:</p>
        <ul className="space-y-1.5">
          {[...new Set(issues.map((issue) => issue.message))].map((message) => (
            <li key={message} className="text-sm text-danger-text flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-danger/40 mt-1.5 shrink-0" />
              {message}
            </li>
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
      <div className="bg-white border border-border rounded-2xl p-8 grid gap-4 shadow-sm">
        <h2 className="text-2xl font-bold text-ink">{config.title}</h2>
        <div className="py-8 px-4 rounded-xl border-2 border-dashed border-border text-center">
          <p className="text-muted text-sm">This form has no fields yet. Add fields in the builder.</p>
        </div>
      </div>
    );
  }

  return (
    <form
      className="bg-white border border-border rounded-2xl p-8 grid gap-5 shadow-sm"
      noValidate
      onSubmit={handleSubmit}
      aria-labelledby={`${formId}-title`}
    >
      <div className="border-b border-border pb-5">
        <h2 className="text-2xl font-bold text-ink" id={`${formId}-title`}>
          {config.title}
        </h2>
        {config.description && <p className="text-muted text-sm mt-1.5">{config.description}</p>}
      </div>

      {engine.submitAttempted && engine.errorCount > 0 && (
        <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-danger-soft border border-danger/10" role="alert">
          <span className="w-7 h-7 rounded-full bg-danger/10 text-danger flex items-center justify-center text-xs font-bold shrink-0">
            {engine.errorCount}
          </span>
          <p className="text-sm text-danger-text">
            Please fix {engine.errorCount} {engine.errorCount === 1 ? 'field' : 'fields'} marked below.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-5 gap-y-4">
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
        <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-danger-soft border border-danger/10" role="alert">
          <span className="w-7 h-7 rounded-full bg-danger/10 text-danger flex items-center justify-center text-xs font-bold shrink-0">!</span>
          <p className="text-sm text-danger-text">Submission failed: {submitError}</p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <button
          type="submit"
          className="px-5 py-2.5 text-sm rounded-lg cursor-pointer border-0 bg-accent text-white font-semibold hover:bg-accent-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          disabled={disabled || submitting}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting…
            </span>
          ) : submitLabel}
        </button>
        <button
          type="button"
          className="px-5 py-2.5 text-sm rounded-lg cursor-pointer border border-border bg-white text-ink hover:bg-page transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <section className="py-4 px-5 rounded-xl bg-ok-soft border border-ok-text/10" role="status" aria-label="Submitted data">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-ok-text/15 text-ok-text flex items-center justify-center text-xs">✓</span>
            <h3 className="text-sm font-bold text-ok-text">Submitted successfully</h3>
          </div>
          <pre className="p-4 bg-white rounded-lg border border-border overflow-x-auto text-[0.8rem] text-ink font-mono leading-relaxed" data-testid="submission-output">
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </form>
  );
}
