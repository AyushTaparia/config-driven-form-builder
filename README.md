# Form Studio

A config-driven form builder with a visual builder, live preview, and drag-to-rearrange. Forms are defined as JSON — the renderer has zero field-specific knowledge.

## Tech Stack

- **React 18** + **TypeScript** (strict mode)
- **Vite** for dev server and bundling
- **Tailwind CSS 3** for all styling
- **Vitest** + **Testing Library** for tests

No external form libraries (no react-hook-form, Formik, or Zod).

## Getting Started

```bash
git clone <repository-url>
cd form-studio
npm install
```

## Scripts

```bash
npm run dev          # Start dev server at http://localhost:5173
npm run build        # Type-check + production build
npm run typecheck    # Type-check only
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
```

Requires Node 18+.

## How It Works

- **Builder**: Click an element in the left sidebar to add a field. Click a field on the canvas (or its Edit button) to edit properties in the right sidebar. Use the arrow buttons or drag and drop to reorder.
- **Preview**: Renders the form as a user would see it. Submitting valid data shows the JSON payload.
- **Save**: Stores the configuration in `localStorage`. Refuses to save if there are blocking errors.

## Architecture

```
src/
  engine/              Pure TypeScript (no React except one hook)
    types.ts             FormConfig, FieldConfig, ValidationRules
    config.ts            parseConfig, validateConfig, createField
    visibility.ts        Conditional visibility with cycle detection
    validation.ts        Per-field and whole-form validation
    values.ts            Defaults + raw-to-typed coercion
    submission.ts        Build typed JSON payload
    useFormEngine.ts     React hook: values, touched, derived errors/visibility

  fields/              Single-input components
    registry.ts          Type-to-component map
    FieldShell.tsx       Label, help text, error, ARIA wrapper
    TextLikeField        Text, number, email, date inputs
    TextareaField        Textarea input
    SelectField          Select dropdown
    CheckboxField        Checkbox input
    UnsupportedField     Fallback for unknown types

  components/
    FormRenderer.tsx     Config in → form out. Loops fields, asks registry.

  builder/             Config editor UI
    builderReducer.ts    Add/update/remove/move actions (pure, tested)
    FormBuilder.tsx      3-column layout orchestrator
    Palette.tsx          Field type picker (left sidebar)
    Canvas.tsx           Editable field list with drag-and-drop
    PropertiesPanel.tsx  Field property editor (right sidebar)
    OptionsEditor.tsx    Select option manager

  config/
    onboardingForm.ts    Sample form configuration

  App.tsx              Mode switch (builder/preview), save, toast notifications
```

## Field Types

text, number, email, select, date, textarea, checkbox

## Validation

Required, min/max length, number min/max, date min/max, built-in email format check. Errors appear next to fields on blur or submit.

## Conditional Visibility

`visibleWhen: { field, operator, value }` with operators: `equals`, `notEquals`, `isEmpty`, `isNotEmpty`. Cascading: if field A is hidden, fields depending on A are also hidden.

## Submitted Data

| Field type | Value in JSON |
| --- | --- |
| text, email, textarea | trimmed string (`""` when empty) |
| number | `number`, or `null` when empty |
| date | `"yyyy-mm-dd"`, or `null` when empty |
| select | the option `value`, or `null` when nothing is selected |
| checkbox | `boolean` |

Hidden fields are not validated and not included.

## Tests

74 tests across 7 files:

- `engine/validation.test.ts` — required, email, lengths, numbers, dates, checkboxes, select edge cases
- `engine/visibility.test.ts` — operators, cascade, missing source, circular rules
- `engine/submission.test.ts` — typed values, nulls, hidden exclusion, stale selects
- `engine/config.test.ts` — duplicates, keys, cycles, parsing, field factory
- `builder/builderReducer.test.ts` — add, update, rename, remove, reorder, type change
- `components/FormRenderer.test.tsx` — rendering, validation, visibility, submission, edge cases
- `App.test.tsx` — builder flows, preview mode, save/toast
