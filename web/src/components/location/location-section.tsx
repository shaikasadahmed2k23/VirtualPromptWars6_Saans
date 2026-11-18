import { useEffect, type JSX } from 'react';

import type { SelectedPlace } from '../../hooks/selected-place.js';
import { useGeolocation, type GeolocationState } from '../../hooks/use-geolocation.js';
import { useI18n } from '../../i18n/i18n-context.js';
import { SectionCard } from '../ui/section-card.js';

import { CityCombobox } from './city-combobox.js';

/** Props for {@link LocationSection}. */
export interface LocationSectionProps {
  readonly place: SelectedPlace | null;
  readonly onSelect: (place: SelectedPlace) => void;
  /** Injectable for tests; defaults to the browser's geolocation. */
  readonly geolocation?: Geolocation | null;
}

/**
 * "Use my location" plus city search, with clear messages when either fails.
 * @param props - Current place, selection handler and optional geolocation.
 * @returns The location section.
 */
export function LocationSection({
  place,
  onSelect,
  geolocation,
}: LocationSectionProps): JSX.Element {
  const { t } = useI18n();
  const geo = useGeolocation(geolocation);
  const myLocationLabel = t.location.myLocation;

  useEffect(() => {
    if (geo.state.status === 'success') {
      onSelect({ ...geo.state.coordinates, label: myLocationLabel });
    }
  }, [geo.state, onSelect, myLocationLabel]);

  return (
    <SectionCard id="location" title={t.location.heading}>
      <div className="space-y-5">
        <button
          type="button"
          onClick={geo.locate}
          disabled={geo.state.status === 'locating'}
          className="rounded-lg bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-strong disabled:opacity-70"
        >
          {geo.state.status === 'locating' ? t.location.locating : t.location.useMine}
        </button>
        <GeolocationError state={geo.state} />
        <CityCombobox onSelect={onSelect} />
        {place !== null && (
          <p className="font-medium text-accent-strong">{t.location.current(place.label)}</p>
        )}
      </div>
    </SectionCard>
  );
}

function GeolocationError({ state }: { readonly state: GeolocationState }): JSX.Element | null {
  const { t } = useI18n();
  if (state.status !== 'error') return null;
  return (
    <p role="alert" className="text-danger">
      {t.location.geo[state.reason]}
    </p>
  );
}
