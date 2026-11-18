import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { UserProfile } from '@saans/shared';

import { renderWithProviders } from '../../test/render.js';

import { ProfileForm } from './profile-form.js';

const PLACE = { latitude: 28.65, longitude: 77.23, label: 'Delhi, India' };

const setup = (place: typeof PLACE | null = PLACE) => {
  const onSubmit = vi.fn();
  renderWithProviders(<ProfileForm place={place} submitting={false} onSubmit={onSubmit} />);
  return { onSubmit, user: userEvent.setup() };
};

const submit = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await user.click(screen.getByRole('button', { name: 'Make my plan' }));
};

describe('ProfileForm', () => {
  it('groups every field in a labelled fieldset', () => {
    setup();
    for (const legend of ['Household', 'Commute', 'Work and exercise', 'Home']) {
      expect(screen.getByRole('group', { name: legend })).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Adults')).toHaveValue(2);
    expect(screen.getByLabelText('Cooking fuel')).toHaveValue('lpg');
  });

  it('submits a profile that matches the shared schema', async () => {
    const { onSubmit, user } = setup();
    await user.selectOptions(screen.getByLabelText('Usual way to travel'), 'metro');
    await user.click(screen.getByLabelText('We have an air purifier'));
    await user.type(screen.getByLabelText('Anything else? (optional)'), 'Grandma walks at dawn');
    await submit(user);
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          location: { kind: 'coords', ...PLACE },
          commute: { mode: 'metro', distanceKm: 10 },
          hasPurifier: true,
          notes: 'Grandma walks at dawn',
          language: 'en',
        }),
      );
    });
  });

  it('sends every choice the household makes', async () => {
    const { onSubmit, user } = setup();
    await user.selectOptions(screen.getByLabelText('Where do you work?'), 'home');
    await user.selectOptions(screen.getByLabelText('Outdoor exercise'), 'none');
    await user.selectOptions(screen.getByLabelText('Cooking fuel'), 'biomass');
    await user.click(screen.getByLabelText(/asthma, heart or lung problems/));
    await submit(user);
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    const profile = onSubmit.mock.calls[0]?.[0] as UserProfile | undefined;
    expect(profile?.work.location).toBe('home');
    expect(profile?.exercise.timing).toBe('none');
    expect(profile?.cookingFuel).toBe('biomass');
    expect(profile?.household.hasSensitiveMembers).toBe(true);
    expect(profile).not.toHaveProperty('notes');
  });

  it('blocks submission and explains each invalid field inline and in a focused summary', async () => {
    const { onSubmit, user } = setup();
    const adults = screen.getByLabelText('Adults');
    await user.clear(adults);
    await user.type(adults, '0');
    await user.clear(screen.getByLabelText('Work ends (hour, 1–24)'));
    await user.type(screen.getByLabelText('Work ends (hour, 1–24)'), '8');
    await user.clear(screen.getByLabelText('One-way distance (km)'));
    await submit(user);
    const summary = await screen.findByRole('alert');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(summary).toHaveTextContent('Please fix 3 fields below.');
    expect(adults).toHaveAttribute('aria-invalid', 'true');
    expect(adults).toHaveAccessibleDescription('Enter a whole number from 1 to 20.');
    expect(screen.getByRole('link', { name: /Adults: Enter a whole number/ })).toHaveAttribute(
      'href',
      '#profile-adults',
    );
    await vi.waitFor(() => {
      expect(summary).toHaveFocus();
    });
  });

  it('asks for a location before anything else', async () => {
    const { onSubmit, user } = setup(null);
    await submit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a location above first.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears errors once the input is fixed', async () => {
    const { onSubmit, user } = setup();
    const minutes = screen.getByLabelText('Minutes per day');
    await user.clear(minutes);
    await user.type(minutes, '999');
    await submit(user);
    await waitFor(() => {
      expect(minutes).toHaveAttribute('aria-invalid', 'true');
    });
    await user.clear(minutes);
    await user.type(minutes, '45');
    await submit(user);
    await waitFor(() => {
      expect(minutes).toHaveAttribute('aria-invalid', 'false');
    });
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
  });
});
