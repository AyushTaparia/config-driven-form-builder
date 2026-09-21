import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App, STORAGE_KEY } from './App';

beforeEach(() => {
  window.localStorage.clear();
});

const editButtons = () => screen.getAllByRole('button', { name: /^Edit / }).map((b) => b.getAttribute('aria-label'));

describe('App: builder', () => {
  it('opens with the onboarding form and the Department field selected', () => {
    render(<App />);
    expect(screen.getByLabelText('Label')).toHaveValue('Department');
    expect(screen.getByLabelText('Field key')).toHaveValue('department');
    expect(screen.getByLabelText('Input type')).toHaveValue('select');
    expect(screen.getByLabelText('Required field')).toBeChecked();
    expect(screen.getByLabelText('Show when field')).toHaveValue('employment_type');
    expect(screen.getByLabelText('Value')).toHaveValue('full_time');
  });

  it('selecting another field reveals its properties', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Edit Work email' }));
    expect(screen.getByLabelText('Label')).toHaveValue('Work email');
    expect(screen.getByLabelText('Input type')).toHaveValue('email');
  });

  it('adds a field, edits it, and the canvas updates immediately', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Add Number field' }));
    expect(screen.getByLabelText('Label')).toHaveValue('Number field');
    expect(screen.getByLabelText('Field key')).toHaveValue('number_1');

    await user.clear(screen.getByLabelText('Label'));
    await user.type(screen.getByLabelText('Label'), 'Salary band');
    expect(screen.getByRole('button', { name: 'Edit Salary band' })).toBeInTheDocument();
  });

  it('reorders fields with the move buttons', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add Date field' }));
    expect(editButtons().slice(-2)).toEqual(['Edit Send a welcome email on the joining date', 'Edit Date field']);

    await user.click(screen.getByRole('button', { name: 'Move Date field up' }));
    expect(editButtons().slice(-2)).toEqual(['Edit Date field', 'Edit Send a welcome email on the joining date']);
  });

  it('removes a field and selects a neighbour', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Remove Department' }));
    expect(screen.queryByRole('button', { name: 'Edit Department' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Label')).toBeInTheDocument(); // panel still shows a neighbour
  });

  it('reports a duplicate field key next to the key input', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add Text field' }));
    const key = screen.getByLabelText('Field key');
    await user.clear(key);
    await user.type(key, 'full_name');

    expect(key).toHaveAccessibleDescription(/used by more than one field/i);
    expect(key).toHaveAttribute('aria-invalid', 'true');
  });

  it('lets a select field manage its options', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add Select field' }));
    expect(screen.getByLabelText('Option 1 label')).toHaveValue('Option 1');
    await user.click(screen.getByRole('button', { name: 'Add option' }));
    expect(screen.getByLabelText('Option 3 label')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove option 1' }));
    expect(screen.queryByLabelText('Option 3 label')).not.toBeInTheDocument();
  });

  it('applies pasted JSON and rejects invalid JSON with a clear message', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Configuration JSON'));
    const box = screen.getByLabelText(/edit the configuration directly/i);

    await user.clear(box);
    await user.click(box);
    await user.paste('{ nope');
    await user.click(screen.getByRole('button', { name: 'Apply JSON' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/not valid JSON/i);

    await user.clear(box);
    await user.click(box);
    await user.paste('{"title":"Tiny","fields":[{"key":"a","type":"text","label":"Only field"}]}');
    await user.click(screen.getByRole('button', { name: 'Apply JSON' }));
    expect(screen.getByLabelText('Form title')).toHaveValue('Tiny');
    expect(screen.getByRole('button', { name: 'Edit Only field' })).toBeInTheDocument();
  });
});

describe('App: preview and save', () => {
  it('preview mode removes builder controls and renders the usable form', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.queryByRole('button', { name: /^Add / })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Employee onboarding' })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/full name/i), 'Aisha');
    expect(screen.getByLabelText(/full name/i)).toHaveValue('Aisha');
  });

  it('builder changes show up in the preview', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add Text field' }));
    await user.clear(screen.getByLabelText('Label'));
    await user.type(screen.getByLabelText('Label'), 'Badge number');
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByLabelText('Badge number')).toBeInTheDocument();
  });

  it('shows why the preview is blocked when the config has errors', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add Text field' }));
    await user.clear(screen.getByLabelText('Field key'));
    await user.type(screen.getByLabelText('Field key'), 'full_name');
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText(/can’t be shown/i)).toBeInTheDocument();
  });

  it('saves a valid form to localStorage and refuses to save an invalid one', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Save form' }));
    expect(screen.getByRole('status')).toHaveTextContent(/saved/i);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).title).toBe('Employee onboarding');

    await user.click(screen.getByRole('button', { name: 'Add Text field' }));
    await user.clear(screen.getByLabelText('Field key'));
    await user.type(screen.getByLabelText('Field key'), 'full_name');
    await user.click(screen.getByRole('button', { name: 'Save form' }));
    expect(screen.getByRole('status')).toHaveTextContent(/fix the configuration errors/i);
  });
});
