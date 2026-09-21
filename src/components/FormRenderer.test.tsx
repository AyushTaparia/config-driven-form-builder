import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { onboardingForm } from '../config/onboardingForm';
import type { FormConfig } from '../engine/types';
import { makeField } from '../test/helpers';
import { FormRenderer } from './FormRenderer';

const field = (name: RegExp | string) => screen.getByLabelText(name);

async function fillValidBase(user: ReturnType<typeof userEvent.setup>) {
  await user.type(field(/full name/i), 'Aisha Khan');
  await user.type(field(/work email/i), 'aisha@company.com');
}

describe('FormRenderer: rendering from config', () => {
  it('renders the onboarding form entirely from configuration', () => {
    render(<FormRenderer config={onboardingForm} />);
    expect(screen.getByRole('heading', { name: 'Employee onboarding' })).toBeInTheDocument();
    expect(field(/full name/i)).toHaveAttribute('placeholder', 'e.g. Aisha Khan');
    expect(field(/^department/i)).toBeInTheDocument();
    expect(field(/work email/i)).toHaveAttribute('type', 'email');
    expect(field(/^joining date/i)).toHaveAttribute('type', 'date');
    expect(field(/employment type/i)).toHaveValue('full_time');
    expect(field(/additional notes/i).tagName).toBe('TEXTAREA');
    expect(field(/welcome email/i)).toBeChecked();
  });

  it('applies half/full width classes from config', () => {
    const { container } = render(<FormRenderer config={onboardingForm} />);
    const cellOf = (label: RegExp) => field(label).closest('.form-cell');
    expect(cellOf(/full name/i)).toHaveClass('form-cell--full');
    expect(cellOf(/work email/i)).toHaveClass('form-cell--half');
    expect(container.querySelectorAll('.form-cell').length).toBeGreaterThan(0);
  });

  it('reflects config changes immediately without touching the renderer', () => {
    const { rerender } = render(<FormRenderer config={onboardingForm} />);
    expect(screen.queryByLabelText(/badge number/i)).not.toBeInTheDocument();

    const changed: FormConfig = {
      ...onboardingForm,
      fields: [...onboardingForm.fields, makeField('badge', 'text', { label: 'Badge number' })],
    };
    rerender(<FormRenderer config={changed} />);
    expect(field(/badge number/i)).toBeInTheDocument();
  });
});

describe('FormRenderer: validation', () => {
  it('shows required errors next to each field, associated for assistive tech, and focuses the first', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FormRenderer config={onboardingForm} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(field(/full name/i)).toHaveAccessibleDescription('Full name is required');
    expect(field(/full name/i)).toHaveAttribute('aria-invalid', 'true');
    expect(field(/^department/i)).toHaveAccessibleDescription('Department is required');
    expect(field(/work email/i)).toHaveAccessibleDescription('Work email is required');
    expect(field(/full name/i)).toHaveFocus();
  });

  it('validates on blur and clears the error once fixed', async () => {
    const user = userEvent.setup();
    render(<FormRenderer config={onboardingForm} />);

    await user.type(field(/work email/i), 'nope');
    await user.tab();
    expect(field(/work email/i)).toHaveAccessibleDescription('Enter a valid email address');

    await user.clear(field(/work email/i));
    await user.type(field(/work email/i), 'aisha@company.com');
    expect(field(/work email/i)).not.toHaveAttribute('aria-invalid');
  });

  it('does not show errors for untouched fields before the first submit', () => {
    render(<FormRenderer config={onboardingForm} />);
    expect(screen.queryByText(/is required/i)).not.toBeInTheDocument();
  });
});

describe('FormRenderer: conditional visibility', () => {
  it('shows and hides fields as the controlling field changes', async () => {
    const user = userEvent.setup();
    render(<FormRenderer config={onboardingForm} />);

    expect(field(/^department/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/weekly hours/i)).not.toBeInTheDocument();

    await user.selectOptions(field(/employment type/i), 'part_time');
    expect(screen.queryByLabelText(/^department/i)).not.toBeInTheDocument();
    expect(field(/weekly hours/i)).toBeInTheDocument();

    await user.selectOptions(field(/employment type/i), 'contract');
    expect(field(/contract end date/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/weekly hours/i)).not.toBeInTheDocument();
  });

  it('remembers what was typed in a field that is hidden and shown again', async () => {
    const user = userEvent.setup();
    render(<FormRenderer config={onboardingForm} />);
    await user.selectOptions(field(/^department/i), 'design');
    await user.selectOptions(field(/employment type/i), 'intern');
    await user.selectOptions(field(/employment type/i), 'full_time');
    expect(field(/^department/i)).toHaveValue('design');
  });
});

describe('FormRenderer: submission', () => {
  it('submits typed JSON for a valid full-time hire', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FormRenderer config={onboardingForm} onSubmit={onSubmit} />);

    await fillValidBase(user);
    await user.selectOptions(field(/^department/i), 'engineering');
    fireEvent.change(field(/^joining date/i), { target: { value: '2026-10-05' } });
    await user.type(field(/additional notes/i), 'Laptop ready on day one');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      full_name: 'Aisha Khan',
      department: 'engineering',
      work_email: 'aisha@company.com',
      joining_date: '2026-10-05',
      employment_type: 'full_time',
      additional_notes: 'Laptop ready on day one',
      send_welcome_email: true,
    });
    expect(await screen.findByTestId('submission-output')).toHaveTextContent('"full_name": "Aisha Khan"');
  });

  it('leaves hidden fields out of the payload and does not validate them', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FormRenderer config={onboardingForm} onSubmit={onSubmit} />);

    await fillValidBase(user);
    await user.selectOptions(field(/^department/i), 'design'); // will be hidden below
    await user.selectOptions(field(/employment type/i), 'part_time');
    await user.type(field(/weekly hours/i), '20');
    await user.click(field(/welcome email/i)); // uncheck
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const data = onSubmit.mock.calls[0][0];
    expect(data).not.toHaveProperty('department');
    expect(data).not.toHaveProperty('contract_end_date');
    expect(data.weekly_hours).toBe(20); // number, not "20"
    expect(data.send_welcome_email).toBe(false); // boolean
    expect(data.joining_date).toBeNull();
  });

  it('blocks submit when a newly visible required field is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FormRenderer config={onboardingForm} onSubmit={onSubmit} />);

    await fillValidBase(user);
    await user.selectOptions(field(/employment type/i), 'part_time');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(field(/weekly hours/i)).toHaveAccessibleDescription(/Weekly hours is required/);
  });

  it('disables the form while submitting and reports a failed submit', async () => {
    const user = userEvent.setup();
    let reject!: (e: Error) => void;
    const onSubmit = vi.fn(() => new Promise<void>((_, r) => (reject = r)));
    render(<FormRenderer config={onboardingForm} onSubmit={onSubmit} />);

    await fillValidBase(user);
    await user.selectOptions(field(/^department/i), 'design');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByRole('button', { name: 'Submitting…' })).toBeDisabled();
    expect(field(/full name/i)).toBeDisabled();

    reject(new Error('Server unavailable'));
    expect(await screen.findByText(/Submission failed: Server unavailable/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
  });

  it('resets values back to the configured defaults', async () => {
    const user = userEvent.setup();
    render(<FormRenderer config={onboardingForm} />);
    await user.type(field(/full name/i), 'Aisha');
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(field(/full name/i)).toHaveValue('');
  });
});

describe('FormRenderer: invalid and edge-case configs', () => {
  it('refuses to render duplicate field keys and explains why', () => {
    const config: FormConfig = {
      version: 1,
      title: 'Broken',
      fields: [makeField('email', 'email'), makeField('other', 'text', { key: 'email' })],
    };
    render(<FormRenderer config={config} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/can’t be shown/i);
    expect(screen.getByText(/Field key "email" is used by more than one field/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
  });

  it('handles a select with missing, empty or malformed options safely', () => {
    const config: FormConfig = {
      version: 1,
      title: 'Selects',
      fields: [
        makeField('a', 'select', { label: 'No options', options: undefined }),
        makeField('b', 'select', { label: 'Empty options', options: [] }),
        makeField('c', 'select', { label: 'Bad options', options: [{ label: 'x' }, null] as never }),
      ],
    };
    render(<FormRenderer config={config} />);
    for (const label of ['No options', 'Empty options', 'Bad options']) {
      const select = screen.getByLabelText(label);
      expect(select).toBeDisabled();
      expect(select).toHaveAccessibleDescription('No options are configured for this field.');
    }
  });

  it('renders a notice for an unsupported field type instead of crashing', () => {
    const weird = { ...makeField('sig'), type: 'signature', label: 'Signature' } as never;
    render(<FormRenderer config={{ version: 1, title: 'X', fields: [makeField('a', 'text', { label: 'A' }), weird] }} />);
    expect(screen.getByRole('note')).toHaveTextContent(/unsupported field type/i);
    expect(field('A')).toBeInTheDocument();
  });

  it('shows an empty state when there are no fields', () => {
    render(<FormRenderer config={{ version: 1, title: 'Blank', fields: [] }} />);
    expect(screen.getByText(/no fields yet/i)).toBeInTheDocument();
  });

  it('shows a busy skeleton while loading', () => {
    const { container } = render(<FormRenderer config={onboardingForm} isLoading />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
  });

  it('can be disabled as a whole', () => {
    render(<FormRenderer config={onboardingForm} disabled />);
    expect(field(/full name/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });
});
