import { useState, type JSX } from 'react';

import { AirNow } from './components/air/air-now.js';
import { MAIN_ID, SiteHeader } from './components/layout/site-header.js';
import { LocationSection } from './components/location/location-section.js';
import { PlanSection } from './components/plan/plan-section.js';
import { ProfileForm } from './components/profile/profile-form.js';
import type { SelectedPlace } from './hooks/selected-place.js';
import { useAirQuality } from './hooks/use-air-quality.js';
import { usePlan } from './hooks/use-plan.js';
import { useI18n } from './i18n/i18n-context.js';

/** Props for {@link App}. */
export interface AppProps {
  /** Injectable for tests; defaults to the browser's geolocation. */
  readonly geolocation?: Geolocation | null;
}

/**
 * The single page: location → air now → household form → plan.
 * @param props - Optional geolocation override.
 * @returns The application.
 */
export function App({ geolocation }: AppProps): JSX.Element {
  const { t } = useI18n();
  const [place, setPlace] = useState<SelectedPlace | null>(null);
  const air = useAirQuality(place);
  const plan = usePlan();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main id={MAIN_ID} tabIndex={-1} className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight">{t.tagline}</h1>
        <LocationSection
          place={place}
          onSelect={setPlace}
          {...(geolocation === undefined ? {} : { geolocation })}
        />
        <AirNow air={air} />
        <ProfileForm
          place={place}
          submitting={plan.state.status === 'loading'}
          onSubmit={plan.submit}
        />
        <PlanSection plan={plan} />
      </main>
      <footer className="mx-auto max-w-3xl px-4 pb-10 text-sm text-muted">{t.footer}</footer>
    </div>
  );
}
