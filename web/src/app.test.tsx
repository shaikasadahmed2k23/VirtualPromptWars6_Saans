import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { ApiError } from './api/api-client.js';
import { App } from './app.js';
import { AIR_RESPONSE, PLAN_RESPONSE, fakeApi } from './test/fixtures.js';
import { renderWithProviders } from './test/render.js';

const expectNoAxeViolations = async (container: HTMLElement): Promise<void> => {
  const results = await axe(container);
  expect(results.violations).toEqual([]);
};

const chooseDelhi = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await user.type(screen.getByRole('combobox', { name: /search for your city/i }), 'Delhi');
  await user.click(await screen.findByRole('option', { name: 'Delhi, India' }));
};

describe('App', () => {
  it('renders landmarks, one h1, a working skip link and no axe violations when empty', async () => {
    const { container } = renderWithProviders(<App />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const main = screen.getByRole('main');
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      `#${main.id}`,
    );
    expect(screen.getByText('Choose a location to see its air quality.')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('shows air quality and a plan for a searched city, accessibly', async () => {
    const user = userEvent.setup();
    const api = fakeApi();
    const { container } = renderWithProviders(<App geolocation={null} />, { api });
    await chooseDelhi(user);
    expect(await screen.findByText(/Reading for 06:00/)).toBeInTheDocument();
    expect(api.getAir).toHaveBeenCalledWith(
      { latitude: 28.65, longitude: 77.23 },
      expect.any(AbortSignal),
    );
    expect(screen.getByRole('table', { name: /^Hourly NAQI forecast/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Make my plan' }));
    // The results UI is lazy-loaded; the first dynamic import is slow under coverage.
    const plan = await screen.findByRole('article', {}, { timeout: 5000 });
    expect(within(plan).getByText('AI-personalised')).toBeInTheDocument();
    expect(within(plan).getByText('Take the metro on office days')).toBeInTheDocument();
    expect(api.createPlan.mock.calls[0]?.[0]).toMatchObject({
      location: { kind: 'coords', latitude: 28.65, longitude: 77.23, label: 'Delhi, India' },
      language: 'en',
    });
    await expectNoAxeViolations(container);
  });

  it('announces loading while the plan is being made', async () => {
    const user = userEvent.setup();
    const api = fakeApi({ createPlan: vi.fn(() => new Promise<never>(() => undefined)) });
    const { container } = renderWithProviders(<App geolocation={null} />, { api });
    await chooseDelhi(user);
    await user.click(screen.getByRole('button', { name: 'Make my plan' }));
    expect(screen.getByRole('button', { name: 'Making your plan…' })).toBeDisabled();
    expect(
      screen.getAllByRole('status').some((node) => node.textContent === 'Making your plan…'),
    ).toBe(true);
    await expectNoAxeViolations(container);
  });

  it('shows a translated error with a working retry', async () => {
    const user = userEvent.setup();
    const getAir = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('UPSTREAM_ERROR', '502'))
      .mockResolvedValue(AIR_RESPONSE);
    const { container } = renderWithProviders(<App geolocation={null} />, {
      api: fakeApi({ getAir }),
    });
    await chooseDelhi(user);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The air-quality service is not responding');
    await expectNoAxeViolations(container);
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/Reading for 06:00/)).toBeInTheDocument();
  });

  it('labels offline plans as offline guidance', async () => {
    const user = userEvent.setup();
    const api = fakeApi({
      createPlan: vi.fn(() => Promise.resolve({ ...PLAN_RESPONSE, source: 'fallback' as const })),
    });
    renderWithProviders(<App geolocation={null} />, { api });
    await chooseDelhi(user);
    await user.click(screen.getByRole('button', { name: 'Make my plan' }));
    expect(await screen.findByText('Offline guidance')).toBeInTheDocument();
  });

  it('switches the whole interface to Hindi and requests a Hindi plan', async () => {
    const user = userEvent.setup();
    const api = fakeApi();
    renderWithProviders(<App geolocation={null} />, { api });
    await user.click(screen.getByRole('button', { name: 'भाषा बदलें: हिन्दी' }));
    expect(document.documentElement.lang).toBe('hi');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'स्मॉग के मौसम में आसानी से साँस लें',
    );
    await user.type(screen.getByRole('combobox', { name: 'या अपना शहर खोजें' }), 'Delhi');
    await user.click(await screen.findByRole('option', { name: 'Delhi, India' }));
    await user.click(screen.getByRole('button', { name: 'मेरी योजना बनाएँ' }));
    await waitFor(() => {
      expect(api.createPlan.mock.calls[0]?.[0]).toMatchObject({ language: 'hi' });
    });
  });

  it('explains a denied location permission and keeps city search available', async () => {
    const user = userEvent.setup();
    const geolocation = {
      getCurrentPosition: (_ok: PositionCallback, fail: PositionErrorCallback) => {
        fail({ code: 1 } as GeolocationPositionError);
      },
    } as unknown as Geolocation;
    renderWithProviders(<App geolocation={geolocation} />);
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Location access was blocked');
    expect(screen.getByRole('combobox', { name: /search for your city/i })).toBeEnabled();
  });

  it('uses the device location when allowed', async () => {
    const user = userEvent.setup();
    const api = fakeApi();
    const geolocation = {
      getCurrentPosition: (ok: PositionCallback) => {
        ok({ coords: { latitude: 19.07, longitude: 72.88 } } as GeolocationPosition);
      },
    } as unknown as Geolocation;
    renderWithProviders(<App geolocation={geolocation} />, { api });
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(await screen.findByText('Showing air quality for Your location.')).toBeInTheDocument();
    expect(api.getAir).toHaveBeenCalledWith(
      { latitude: 19.07, longitude: 72.88 },
      expect.any(AbortSignal),
    );
  });
});
