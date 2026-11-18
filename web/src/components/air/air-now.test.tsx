import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { AirResponse } from '@saans/shared';

import type { AirQuality } from '../../hooks/use-air-quality.js';
import { AIR_RESPONSE } from '../../test/fixtures.js';
import { renderWithProviders } from '../../test/render.js';

import { AirNow } from './air-now.js';

const withData = (data: AirResponse): AirQuality => ({
  state: { status: 'success', data },
  retry: () => undefined,
});

describe('AirNow', () => {
  it('shows no stale notice for live data', () => {
    renderWithProviders(<AirNow air={withData(AIR_RESPONSE)} />);
    expect(screen.queryByText(/may be up to/)).not.toBeInTheDocument();
  });

  it('tells the reader how old the data may be when live data was unavailable', () => {
    renderWithProviders(<AirNow air={withData({ ...AIR_RESPONSE, staleMinutes: 25 })} />);
    expect(screen.getByText(/Live air data is unavailable.*up to 25 min old/)).toBeInTheDocument();
  });

  it('says the same in Hindi', () => {
    renderWithProviders(<AirNow air={withData({ ...AIR_RESPONSE, staleMinutes: 25 })} />, {
      language: 'hi',
    });
    expect(screen.getByText(/लाइव डेटा अभी उपलब्ध नहीं है.*25 मिनट/)).toBeInTheDocument();
  });

  it('names the air service when the forecast cannot be loaded', () => {
    renderWithProviders(
      <AirNow
        air={{
          state: { status: 'error', error: 'UPSTREAM_ERROR' },
          retry: () => undefined,
        }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('air-quality service is not responding');
  });
});
