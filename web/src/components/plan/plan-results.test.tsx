import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { PLAN_RESPONSE } from '../../test/fixtures.js';
import { renderWithProviders } from '../../test/render.js';

import { PlanResults } from './plan-results.js';

describe('PlanResults', () => {
  it('renders the routine, tips and impact cards with estimate labels and numbers', async () => {
    const { container } = renderWithProviders(<PlanResults plan={PLAN_RESPONSE} />);
    const routine = screen.getByRole('region', { name: 'Your day' });
    expect(within(routine).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('region', { name: 'Indoor air hacks' })).toHaveTextContent(
      'Mop, don’t sweep',
    );
    expect(screen.getByRole('region', { name: 'Cleaner choices' })).toHaveTextContent(
      'Take the metro',
    );
    const impacts = screen.getByRole('region', { name: 'What each change does' });
    expect(within(impacts).getAllByText('Estimate')).toHaveLength(2);
    expect(impacts).toHaveTextContent('105 µg less PM2.5 breathed (70% lower)');
    expect(impacts).toHaveTextContent('9.79 kg CO₂ saved per week');
    // Shown for the impact that has the comparison; the one without it simply omits the line.
    expect(
      within(impacts).getAllByText(
        '≈ the same as 2.1 hours of breathing today’s outdoor air at rest',
      ),
    ).toHaveLength(1);
    expect(screen.getByText(/not medical advice/)).toBeInTheDocument();
    expect((await axe(container)).violations).toEqual([]);
  });

  it('hides zero figures and marks the plan language', () => {
    const plan = {
      ...PLAN_RESPONSE,
      language: 'hi' as const,
      impacts: PLAN_RESPONSE.impacts.map((impact) => ({
        ...impact,
        exposureAvoided: { micrograms: 0, percent: 0 },
        co2SavedKgPerWeek: 0,
      })),
      routine: [],
      indoorHacks: [],
    };
    renderWithProviders(<PlanResults plan={plan} />);
    expect(screen.getByRole('article')).toHaveAttribute('lang', 'hi');
    expect(screen.queryByText(/µg less/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CO₂ saved/)).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Your day' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Indoor air hacks' })).not.toBeInTheDocument();
  });
});
