import { useReducer, useState } from 'react';
import { builderReducer } from './builder/builderReducer';
import { FormBuilder } from './builder/FormBuilder';
import { FormRenderer } from './components/FormRenderer';
import { onboardingForm } from './config/onboardingForm';
import { hasBlockingIssues, parseConfig, validateConfig } from './engine/config';
import type { FormConfig, SubmittedData } from './engine/types';

export const STORAGE_KEY = 'form-studio:config:v1';

function loadInitialConfig(): FormConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const { config, issues } = parseConfig(JSON.parse(raw));
      if (config && !hasBlockingIssues(issues)) return config;
    }
  } catch {
    // Corrupt or unavailable storage falls back to the sample form.
  }
  return onboardingForm;
}

/** Stand-in for an API call so the submitting state is visible in the demo. */
async function fakeSubmit(_data: SubmittedData): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 400));
}

type Mode = 'builder' | 'preview';
type SaveMessage = { kind: 'success' | 'error'; text: string } | null;

export function App() {
  const [config, dispatch] = useReducer(builderReducer, undefined, loadInitialConfig);
  const [mode, setMode] = useState<Mode>('builder');
  const [selectedId, setSelectedId] = useState<string | null>(
    () => config.fields.find((f) => f.key === 'department')?.id ?? config.fields[0]?.id ?? null,
  );
  const [saveMessage, setSaveMessage] = useState<SaveMessage>(null);

  const removeField = (id: string) => {
    if (id === selectedId) {
      const index = config.fields.findIndex((f) => f.id === id);
      const neighbour = config.fields[index + 1] ?? config.fields[index - 1];
      setSelectedId(neighbour?.id ?? null);
    }
    dispatch({ type: 'removeField', id });
  };

  const save = () => {
    if (hasBlockingIssues(validateConfig(config))) {
      setSaveMessage({ kind: 'error', text: 'Fix the configuration errors before saving.' });
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setSaveMessage({ kind: 'success', text: 'Form saved in this browser.' });
    } catch {
      setSaveMessage({ kind: 'error', text: 'Could not save: browser storage is unavailable.' });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-page">
      <header className="flex items-center gap-4 px-5 py-2.5 bg-ink text-white shrink-0 shadow-md">
        <h1 className="text-[1.05rem] font-bold tracking-wide mr-auto">Form Studio</h1>

        <div className="inline-flex rounded-full border border-white/25 overflow-hidden text-sm" role="group" aria-label="Mode">
          <button
            type="button"
            aria-pressed={mode === 'builder'}
            className={`px-4 py-1.5 border-0 cursor-pointer transition-all duration-200 ${
              mode === 'builder' ? 'bg-white text-ink font-semibold' : 'bg-transparent text-white/80 hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => setMode('builder')}
          >
            Builder
          </button>
          <button
            type="button"
            aria-pressed={mode === 'preview'}
            className={`px-4 py-1.5 border-0 cursor-pointer transition-all duration-200 ${
              mode === 'preview' ? 'bg-white text-ink font-semibold' : 'bg-transparent text-white/80 hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => setMode('preview')}
          >
            Preview
          </button>
        </div>

        <div className="flex items-center gap-2">
          {saveMessage && (
            <span
              className={`text-xs px-3 py-1 rounded-full transition-all duration-300 ${
                saveMessage.kind === 'error' ? 'bg-danger text-white' : 'bg-white/14'
              }`}
              role="status"
            >
              {saveMessage.text}
            </span>
          )}
          <button
            type="button"
            className="px-4 py-1.5 text-sm rounded-md cursor-pointer border border-accent bg-accent text-white font-semibold hover:bg-accent-hover transition-colors"
            onClick={save}
          >
            Save form
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        {mode === 'builder' ? (
          <FormBuilder
            config={config}
            dispatch={dispatch}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRemove={removeField}
          />
        ) : (
          <div className="max-w-[720px] mx-auto py-8 px-4">
            <FormRenderer config={config} onSubmit={fakeSubmit} />
          </div>
        )}
      </main>
    </div>
  );
}
