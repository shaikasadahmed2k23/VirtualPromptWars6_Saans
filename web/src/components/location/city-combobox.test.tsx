import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../api/api-client.js';
import { DELHI, fakeApi } from '../../test/fixtures.js';
import { renderWithProviders } from '../../test/render.js';

import { CityCombobox } from './city-combobox.js';

const MUMBAI = {
  ...DELHI,
  id: 2,
  name: 'Mumbai',
  region: 'Maharashtra',
  latitude: 19.07,
  longitude: 72.88,
};

const setup = (api = fakeApi({ geocode: vi.fn(() => Promise.resolve([DELHI, MUMBAI])) })) => {
  const onSelect = vi.fn();
  renderWithProviders(<CityCombobox onSelect={onSelect} />, { api });
  return { onSelect, user: userEvent.setup(), input: screen.getByRole('combobox') };
};

describe('CityCombobox', () => {
  it('follows the ARIA combobox keyboard pattern', async () => {
    const { onSelect, user, input } = setup();
    await user.type(input, 'Mu');
    expect(await screen.findByText(/2 places found/)).toHaveAttribute('role', 'status');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    const active = screen.getByRole('option', { selected: true });
    expect(active).toHaveTextContent('Mumbai, Maharashtra, India');
    expect(input).toHaveAttribute('aria-activedescendant', active.id);
    await user.keyboard('{ArrowUp}{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith({
      latitude: 19.07,
      longitude: 72.88,
      label: 'Mumbai, Maharashtra, India',
    });
    expect(input).toHaveValue('Mumbai, Maharashtra, India');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape without choosing', async () => {
    const { onSelect, user, input } = setup();
    await user.type(input, 'De');
    await screen.findByRole('option', { name: 'Delhi, India' });
    await user.keyboard('{Escape}{Enter}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('says so when nothing matches', async () => {
    const { user, input } = setup(fakeApi({ geocode: vi.fn(() => Promise.resolve([])) }));
    await user.type(input, 'Zzz');
    expect(
      await screen.findByText('No matching city. Try a nearby larger city.'),
    ).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('reports a search failure', async () => {
    const api = fakeApi({
      geocode: vi.fn(() => Promise.reject(new ApiError('RATE_LIMITED', '429'))),
    });
    const { user, input } = setup(api);
    await user.type(input, 'Delhi');
    expect(await screen.findByText(/Too many requests/)).toBeInTheDocument();
  });

  it('says the city search failed, not that the air service is down', async () => {
    const api = fakeApi({
      geocode: vi.fn(() => Promise.reject(new ApiError('GEOCODING_UNAVAILABLE', '502'))),
    });
    const { user, input } = setup(api);
    await user.type(input, 'Delhi');
    const message = await screen.findByText(/City search failed/);
    expect(message).toHaveAttribute('role', 'status');
    expect(screen.queryByText(/air-quality service/)).not.toBeInTheDocument();
  });

  it('says it in Hindi too', async () => {
    const api = fakeApi({
      geocode: vi.fn(() => Promise.reject(new ApiError('GEOCODING_UNAVAILABLE', '502'))),
    });
    renderWithProviders(<CityCombobox onSelect={vi.fn()} />, { api, language: 'hi' });
    await userEvent.setup().type(screen.getByRole('combobox'), 'Delhi');
    expect(await screen.findByText(/शहर की खोज विफल रही/)).toBeInTheDocument();
  });
});
