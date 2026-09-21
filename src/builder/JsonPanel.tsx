import { useState, type Dispatch } from 'react';
import { parseConfig } from '../engine/config';
import type { ConfigIssue, FormConfig } from '../engine/types';
import type { BuilderAction } from './builderReducer';

interface JsonPanelProps {
  config: FormConfig;
  dispatch: Dispatch<BuilderAction>;
}

/** Shows the live configuration and lets you paste one in. Bad JSON fails with a clear message. */
export function JsonPanel({ config, dispatch }: JsonPanelProps) {
  const pretty = JSON.stringify(config, null, 2);
  const [draft, setDraft] = useState<string | null>(null);
  const [problems, setProblems] = useState<ConfigIssue[]>([]);
  const [applied, setApplied] = useState(false);

  const apply = () => {
    setApplied(false);
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft ?? pretty);
    } catch (err) {
      setProblems([
        {
          severity: 'error',
          code: 'json.syntax',
          message: `That is not valid JSON: ${err instanceof Error ? err.message : 'syntax error'}`,
        },
      ]);
      return;
    }
    const result = parseConfig(parsed);
    setProblems(result.issues);
    if (result.config) {
      dispatch({ type: 'replace', config: result.config });
      setDraft(null);
      setApplied(true);
    }
  };

  return (
    <details className="bg-surface border border-border rounded-lg">
      <summary className="cursor-pointer font-semibold text-[0.9rem] px-3.5 py-2.5 select-none hover:bg-page/50 rounded-lg transition-colors">
        Configuration JSON
      </summary>
      <div className="px-3.5 pb-3.5 pt-1 flex flex-col gap-2">
        <label className="text-[0.85rem] font-semibold" htmlFor="config-json">
          Edit the configuration directly, then apply it
        </label>
        <textarea
          id="config-json"
          className="w-full font-mono text-[0.8rem] min-h-[220px] py-2 px-2.5 border border-input rounded-md bg-white text-ink resize-vertical focus:border-accent focus:ring-1 focus:ring-accent outline-none"
          spellCheck={false}
          value={draft ?? pretty}
          onChange={(e) => {
            setDraft(e.target.value);
            setApplied(false);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="px-2.5 py-1.5 text-[0.8rem] rounded-md cursor-pointer border border-accent bg-accent text-white font-semibold hover:bg-accent-hover transition-colors"
            onClick={apply}
          >
            Apply JSON
          </button>
          <button
            type="button"
            className="px-2.5 py-1.5 text-[0.8rem] rounded-md cursor-pointer border border-border bg-surface text-ink hover:border-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={draft === null}
            onClick={() => {
              setDraft(null);
              setProblems([]);
            }}
          >
            Discard edits
          </button>
        </div>
        {applied && problems.length === 0 && (
          <p className="text-sm py-2 px-3 rounded-md bg-ok-soft text-ok-text" role="status">
            Configuration applied.
          </p>
        )}
        {problems.length > 0 && (
          <ul
            className={`text-sm py-2 px-3 rounded-md ${
              problems.some((p) => p.severity === 'error')
                ? 'bg-danger-soft text-danger-text'
                : 'bg-warn-soft text-warn-text'
            }`}
            role="alert"
          >
            {problems.map((p, i) => (
              <li key={i}>{p.message}</li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
