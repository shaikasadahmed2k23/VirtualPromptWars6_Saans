import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AIR_RESPONSE, BEST_WINDOW } from '../../test/fixtures.js';
import { renderWithProviders } from '../../test/render.js';

import { ForecastStrip } from './forecast-strip.js';

describe('ForecastStrip', () => {
  it('summarises the best and worst windows in words and lists every hour in a table', () => {
    renderWithProviders(<ForecastStrip data={AIR_RESPONSE} />);
    expect(screen.getByText('Today 14:00–16:00, average NAQI 167 (Moderate)')).toBeInTheDocument();
    expect(screen.getByText('Today 07:00–09:00, average NAQI 327 (Very poor)')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: /^Hourly NAQI forecast/ });
    expect(within(table).getAllByRole('row')).toHaveLength(AIR_RESPONSE.hourly.length + 1);
    expect(within(table).getByRole('rowheader', { name: '2026-11-18 06:00' })).toBeInTheDocument();
  });

  it('says the windows come from the next 24 hours and marks that edge with text', () => {
    renderWithProviders(<ForecastStrip data={AIR_RESPONSE} />);
    expect(screen.getByText('Best window in the next 24 hours:')).toBeInTheDocument();
    expect(screen.getByText('Worst window in the next 24 hours:')).toBeInTheDocument();
    expect(screen.getByText(/picked from the next 24 hours only/)).toBeInTheDocument();
    expect(screen.getAllByText(/Next 24 hours end here/)).toHaveLength(1);
  });

  it('labels a window on the next calendar day as Tomorrow, by the location’s clock', () => {
    const data = {
      ...AIR_RESPONSE,
      current: { ...AIR_RESPONSE.current, time: '2026-11-18T16:00' },
      bestWindow: { ...BEST_WINDOW, start: '2026-11-19T14:00', end: '2026-11-19T16:00' },
      worstWindow: { ...BEST_WINDOW, start: '2026-11-18T18:00', end: '2026-11-18T20:00' },
    };
    renderWithProviders(<ForecastStrip data={data} />);
    expect(screen.getByText(/^Tomorrow 14:00–16:00, average NAQI/)).toBeInTheDocument();
    expect(screen.getByText(/^Today 18:00–20:00, average NAQI/)).toBeInTheDocument();
  });

  it('says now is a good time instead of a clock time when the best window has begun', () => {
    const data = {
      ...AIR_RESPONSE,
      current: { ...AIR_RESPONSE.current, time: '2026-11-18T14:00' },
      worstWindow: null,
    };
    renderWithProviders(<ForecastStrip data={data} />);
    expect(
      screen.getByText('Now is a good time to be outside, average NAQI 167 (Moderate)'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/14:00–16:00/)).not.toBeInTheDocument();
  });

  it('warns that now is the worst time when the worst window has begun', () => {
    const data = {
      ...AIR_RESPONSE,
      current: { ...AIR_RESPONSE.current, time: '2026-11-18T07:00' },
      bestWindow: null,
    };
    renderWithProviders(<ForecastStrip data={data} />);
    expect(screen.getByText(/^Now is the worst time to be outside/)).toBeInTheDocument();
  });

  it('labels days in Hindi', () => {
    const data = {
      ...AIR_RESPONSE,
      current: { ...AIR_RESPONSE.current, time: '2026-11-18T16:00' },
      bestWindow: { ...BEST_WINDOW, start: '2026-11-19T14:00', end: '2026-11-19T16:00' },
    };
    renderWithProviders(<ForecastStrip data={data} />, { language: 'hi' });
    expect(screen.getByText(/^कल 14:00–16:00/)).toBeInTheDocument();
  });

  it('draws no 24-hour edge when the forecast is shorter than 24 hours', () => {
    renderWithProviders(
      <ForecastStrip data={{ ...AIR_RESPONSE, hourly: AIR_RESPONSE.hourly.slice(0, 20) }} />,
    );
    expect(screen.queryByText(/Next 24 hours end here/)).not.toBeInTheDocument();
  });

  it('warns when even the best window is Severe and omits missing windows', () => {
    renderWithProviders(
      <ForecastStrip
        data={{
          ...AIR_RESPONSE,
          bestWindow: { ...BEST_WINDOW, category: 'severe', allUnsafe: true },
          worstWindow: null,
        }}
      />,
    );
    expect(screen.getByText(/this is the least-bad time/)).toBeInTheDocument();
    expect(screen.queryByText('Worst window:')).not.toBeInTheDocument();
  });
});
