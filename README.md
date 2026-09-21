# Form Studio: a config-driven form builder

A reusable form engine that renders forms from a JSON configuration, plus a
builder for editing that configuration and a preview for filling the form in.
Built with React 18 + TypeScript + Vite. Tests use Vitest and Testing Library.

## Setup

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 77 tests: validation, visibility, submission, builder, UI
npm run typecheck
npm run build
```

Requires Node 18+.

## Using it

- **Builder**: click an element in *Form elements* to add a field. Click a field
  on the canvas (or its **Edit** button) to edit its properties. Use ↑ / ↓ (or
  drag and drop) to reorder, **Remove** to delete.
- **Preview**: renders the same configuration as the real form. Submitting valid
  data shows the JSON payload.
- **Save form**: stores the configuration in `localStorage`. It refuses to save
  a configuration that has blocking errors.
- **Configuration JSON** (below the canvas): shows the live config and lets you
  paste a new one. Invalid JSON, unsupported field types and bad shapes produce
  a clear message instead of a crash.
- **Load sample**: restores the employee onboarding form.

The employee onboarding form from the reference lives in
`src/config/onboardingForm.ts`. It is plain data. Department is shown only for
full-time hires, and weekly hours / contract end date appear for part-time and
contract hires.

## Architecture

The code is split so each layer can be read, tested and replaced on its own.

```
src/
  engine/            pure TypeScript, no React except one hook
    types.ts           FormConfig / FieldConfig / rules: the config schema
    config.ts          parseConfig (untrusted JSON -> config), validateConfig, createField
    visibility.ts      conditional visibility (rules, cascade, cycles)
    validation.ts      per-field and whole-form validation (visible fields only)
    values.ts          defaults + raw value -> typed value
    submission.ts      validate, then build the typed JSON payload
    useFormEngine.ts   form STATE: values, touched, derived errors/visibility
  fields/            presentation of single inputs
    registry.ts        type -> component map (the only place that knows the types)
    FieldShell.tsx     label, help text, error, aria wiring shared by all fields
    TextLikeField / SelectField / TextareaField / CheckboxField / UnsupportedField
  components/
    FormRenderer.tsx   config in, form out. Loops over fields and asks the registry
  builder/           editing the config
    builderReducer.ts  add / update / remove / move (pure, unit-tested)
    Palette / Canvas / PropertiesPanel / OptionsEditor / JsonPanel / FormBuilder
  config/onboardingForm.ts
  App.tsx            mode switch, save/load
```

**Data flow.** `FormConfig` (JSON) → `FormRenderer` → `useFormEngine` computes
values, visibility and errors → each visible field is rendered by the component
the registry returns for its `type`. The builder only ever produces a new
`FormConfig`; the renderer never changes.

### Separation of concerns

| Concern | Where | Notes |
| --- | --- | --- |
| Configuration | `engine/types.ts`, `engine/config.ts`, `builder/builderReducer.ts` | Plain JSON. Each field has a stable internal `id` and a data `key`. |
| Form state | `engine/useFormEngine.ts` | Stores only what the user typed and which fields were touched. Everything else is derived. |
| Validation | `engine/validation.ts` | Pure functions. No React, no DOM. |
| Presentation | `fields/*`, `components/FormRenderer.tsx` | Renders and forwards events. Decides nothing about validity. |

### Reusable field rendering

`FormRenderer` has no `if (type === ...)` block. It calls
`getFieldComponent(field.type)` and renders the result. All field components
share one props contract (`FieldComponentProps`) and one wrapper
(`FieldShell`), so label/help/error/ARIA behaviour is written once.

To add a new field type: add the name to `FIELD_TYPES`, write a component that
implements `FieldComponentProps`, add one line to `registry.ts`, and (if
needed) a rule in `validation.ts` / `values.ts`.

## What the requirements map to

- **Field types**: text, number, email, select, date, textarea, checkbox.
- **Builder**: add, edit, remove, reorder (buttons and drag-and-drop). Label,
  placeholder, key, default value, help text, select options, width, type.
- **Validation**: required, min/max length, regex pattern with custom message,
  number min/max, date min/max, built-in email and date format checks. Messages
  render next to the field.
- **Layout**: `width: "half" | "full"` on a 2-column grid. Half-width cells
  collapse to one column when their container is narrower than 480px, so the
  canvas and preview work on narrow screens.
- **Conditional visibility**: `visibleWhen: { field, operator, value }` with
  `equals`, `notEquals`, `isEmpty`, `isNotEmpty`.
- **Submit**: valid data is submitted as typed JSON.

### Submitted data

| Field type | Value in JSON |
| --- | --- |
| text, email, textarea | trimmed string (`""` when empty) |
| number | `number`, or `null` when empty |
| date | `"yyyy-mm-dd"`, or `null` when empty |
| select | the option `value`, or `null` when nothing is selected |
| checkbox | `boolean` |

Hidden fields are **not validated and not included**.

## Behaviour details worth knowing

- **Errors are derived, not stored.** `useFormEngine` recomputes errors from
  (config + values) each render and only *shows* them for touched fields or
  after a submit attempt. They cannot go stale when a field becomes hidden or the
  config changes. Changing the config while a form is on screen updates it
  immediately (defaults are resolved on read, not copied into state).
- **Hidden values are remembered** in state (so toggling a condition back does
  not lose input) but are never validated or submitted.
- **Cascading visibility.** If field B depends on field A and A is hidden, B is
  hidden as well.
- **Duplicate keys** are reported in the builder next to the key input
  (`aria-describedby`), flagged on the canvas, and *block* preview and save with
  an explanatory message. Invalid keys, empty keys, self-dependencies and
  circular dependencies are blocked the same way.
- **Renaming a key** rewrites visibility rules that pointed at the old key.
  **Removing a field** clears rules that depended on it.
- **Select safety.** Missing, empty, malformed or duplicate options never throw.
  The select is disabled with a visible explanation, and a stored value that is
  no longer a valid option counts as empty.
- **Unsupported field types** in imported JSON are skipped with a warning; if one
  reaches the renderer anyway it shows a notice and is excluded from validation
  and submission.
- **States**: loading skeleton (`isLoading`), empty form / empty canvas,
  disabled inputs (`disabled`, and automatically while submitting), submit
  error (`role="alert"`), config error panel.
- **Accessibility**: every input has a real `<label>`; errors and help text are
  linked with `aria-describedby`; invalid inputs get `aria-invalid`; required
  inputs get `aria-required`; the first invalid field receives focus on a failed
  submit; all builder actions are real buttons (drag and drop is an extra, not
  the only way to reorder); visible focus styles.

## Form library decision

No external form library is used. `react-hook-form` (or Formik) would own
input registration, value/touched/dirty tracking and re-render optimisation,
with a resolver such as Zod for schema validation. In this project the form
*engine* has to own the parts that library would not: turning a JSON config
into validation rules and visibility, excluding hidden fields, and typing the
payload. Those already require a controlled state model, so a library would
mostly sit in the way for a form of this size. The seam is clean if that
changes: `useFormEngine` is the only piece that would be swapped for
`useForm`, while `validateForm`, `computeVisibility` and `buildSubmission`
would be reused as the resolver.

## Assumptions

- Field keys must match `^[A-Za-z_][A-Za-z0-9_]*$` so they are safe JSON
  property names.
- A visibility rule listens to **one** field (no AND/OR groups).
- Select option values are strings.
- A visibility rule pointing at a field that does not exist *fails open* (the
  field is shown) and is reported as a warning, so users' input is not silently
  hidden by a config typo.
- Dates are ISO `yyyy-mm-dd` (what `<input type="date">` produces). The
  browser localises how it is displayed.
- The submit in the demo is simulated with a short delay, to show the
  submitting state. Pass your own `onSubmit` to `FormRenderer` for a real API.

## Tradeoffs and known limits

- **Raw string state for numbers/dates.** Keeping the typed text avoids fighting
  the user while they type `1.` or `-`; conversion happens once on submit.
- **Errors show on blur / submit, not on every keystroke** for untouched
  fields. This is quieter, but a user may not see an error until they leave the
  field.
- **Native drag and drop** is used (no library) for reordering. It works with a
  mouse but not with touch screens, which is why the ↑ / ↓ buttons exist.
- **One rule per field, one condition.** Enough for the brief; a rule tree would
  be the next step.
- **No undo/redo**, no field groups/sections, no async or cross-field
  validation (for example "end date after start date").
- **Persistence is `localStorage` only** (per browser). The config is plain JSON,
  so swapping in an API is a change in `App.tsx`.
- **The builder's canvas shows disabled inputs** as a preview of each field.
  It is a faithful rendering of the same components, but it is not interactive.

## Tests

`npm test` runs 77 tests:

- `engine/validation.test.ts`: required, email, lengths, numbers, patterns
  (including an invalid regex), dates, checkboxes, select edge cases, hidden
  fields not validated.
- `engine/visibility.test.ts`: every operator, checkbox values, defaults,
  cascading, missing sources, circular rules.
- `engine/submission.test.ts`: typed values, nulls for empty values, hidden
  fields excluded, stale select values, submit blocked while invalid.
- `engine/config.test.ts`: duplicate/invalid keys, cycles, warnings, parsing of
  untrusted JSON, field factory.
- `builder/builderReducer.test.ts`: add / update / rename cascade / remove /
  reorder / type change.
- `components/FormRenderer.test.tsx`: rendering from config, config changes,
  errors next to fields with ARIA, focus on first error, conditional
  visibility, submission payload, hidden-field exclusion, submitting/failed
  states, duplicate keys, broken selects, unsupported types, empty/loading/
  disabled states.
- `App.test.tsx`: builder flows (select, add, edit, reorder, remove, options,
  duplicate key error, JSON import), preview mode, and save.
