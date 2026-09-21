import { useMemo, type Dispatch } from 'react';
import { createField, validateConfig } from '../engine/config';
import type { FieldType, FormConfig } from '../engine/types';
import type { BuilderAction } from './builderReducer';
import { Canvas } from './Canvas';
import { Palette } from './Palette';
import { PropertiesPanel } from './PropertiesPanel';

interface FormBuilderProps {
  config: FormConfig;
  dispatch: Dispatch<BuilderAction>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
}

export function FormBuilder({ config, dispatch, selectedId, onSelect, onRemove }: FormBuilderProps) {
  const issues = useMemo(() => validateConfig(config), [config]);
  const selected = config.fields.find((f) => f.id === selectedId) ?? null;

  const handleAdd = (type: FieldType) => {
    const field = createField(type, config.fields);
    dispatch({ type: 'addField', field });
    onSelect(field.id);
  };

  return (
    <div className="flex h-full">
      {/* Left sidebar - Palette */}
      <aside className="w-[280px] shrink-0 h-full overflow-y-auto scrollbar-hidden border-r border-border bg-surface">
        <Palette onAdd={handleAdd} />
      </aside>

      {/* Center - Canvas */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto scrollbar-hidden bg-surface border-r border-border">
        <div className="p-4">
          <Canvas
            config={config}
            issues={issues}
            selectedId={selectedId}
            onSelect={onSelect}
            onRemove={onRemove}
            dispatch={dispatch}
          />
        </div>
      </div>

      {/* Right sidebar - Properties */}
      <aside className="w-[340px] shrink-0 h-full overflow-y-auto scrollbar-hidden bg-surface">
        <PropertiesPanel config={config} field={selected} issues={issues} dispatch={dispatch} onRemove={onRemove} />
      </aside>
    </div>
  );
}
