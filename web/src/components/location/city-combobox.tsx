import { useCallback, useId, useState, type JSX } from 'react';

import type { GeoPlace } from '@saans/shared';

import type { AsyncState } from '../../hooks/use-async-task.js';
import { useCitySearch } from '../../hooks/use-city-search.js';
import { useCombobox, type Combobox } from '../../hooks/use-combobox.js';
import { useI18n } from '../../i18n/i18n-context.js';

import { toSelectedPlace, type SelectedPlace } from './selected-place.js';

/** Props for {@link CityCombobox}. */
export interface CityComboboxProps {
  readonly onSelect: (place: SelectedPlace) => void;
}

interface CityPicker {
  readonly ids: {
    readonly input: string;
    readonly hint: string;
    readonly listbox: string;
    readonly status: string;
  };
  readonly optionId: (index: number) => string;
  readonly query: string;
  readonly setQuery: (query: string) => void;
  readonly search: AsyncState<readonly GeoPlace[]>;
  readonly places: readonly GeoPlace[];
  readonly combobox: Combobox;
}

// A stable empty list, so callbacks depending on `places` don't change every render.
const NO_PLACES: readonly GeoPlace[] = [];

function useCityPicker(onSelect: (place: SelectedPlace) => void): CityPicker {
  const id = useId();
  const [query, setQuery] = useState('');
  const search = useCitySearch(query);
  const places = search.status === 'success' ? search.data : NO_PLACES;
  const pick = useCallback(
    (index: number) => {
      const place = places[index];
      if (place === undefined) return;
      const selected = toSelectedPlace(place);
      setQuery(selected.label);
      onSelect(selected);
    },
    [places, onSelect],
  );
  return {
    ids: {
      input: `${id}-input`,
      hint: `${id}-hint`,
      listbox: `${id}-listbox`,
      status: `${id}-status`,
    },
    optionId: (index) => `${id}-option-${String(index)}`,
    query,
    setQuery,
    search,
    places,
    combobox: useCombobox(places.length, pick),
  };
}

/**
 * Accessible city search: an ARIA combobox with a debounced listbox of matches.
 * @param props - Called when the user picks a place.
 * @returns The labelled input, its listbox and a live status line.
 */
export function CityCombobox({ onSelect }: CityComboboxProps): JSX.Element {
  const { t } = useI18n();
  const picker = useCityPicker(onSelect);
  return (
    <div className="relative">
      <label htmlFor={picker.ids.input} className="block font-medium">
        {t.location.searchLabel}
      </label>
      <p id={picker.ids.hint} className="text-sm text-muted">
        {t.location.searchHint}
      </p>
      <ComboboxInput picker={picker} />
      <CityOptions picker={picker} />
      <SearchStatus picker={picker} />
    </div>
  );
}

function ComboboxInput({ picker }: { readonly picker: CityPicker }): JSX.Element {
  const { ids, combobox } = picker;
  const active =
    combobox.activeIndex >= 0
      ? { 'aria-activedescendant': picker.optionId(combobox.activeIndex) }
      : {};
  return (
    <input
      id={ids.input}
      type="text"
      role="combobox"
      autoComplete="off"
      aria-autocomplete="list"
      aria-expanded={combobox.expanded}
      aria-controls={ids.listbox}
      aria-describedby={`${ids.hint} ${ids.status}`}
      {...active}
      value={picker.query}
      onChange={(event) => {
        picker.setQuery(event.target.value);
        combobox.open();
      }}
      onKeyDown={combobox.onKeyDown}
      onBlur={combobox.close}
      className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2"
    />
  );
}

function CityOptions({ picker }: { readonly picker: CityPicker }): JSX.Element {
  const { combobox } = picker;
  return (
    <ul
      id={picker.ids.listbox}
      role="listbox"
      hidden={!combobox.expanded}
      className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-lg"
    >
      {picker.places.map((place, index) => (
        <li
          key={place.id}
          id={picker.optionId(index)}
          role="option"
          aria-selected={index === combobox.activeIndex}
          onMouseDown={(event) => {
            event.preventDefault();
            combobox.choose(index);
          }}
          className="cursor-pointer px-3 py-2 aria-selected:bg-accent-soft"
        >
          {toSelectedPlace(place).label}
        </li>
      ))}
    </ul>
  );
}

function SearchStatus({ picker }: { readonly picker: CityPicker }): JSX.Element {
  const { t } = useI18n();
  const { search, places } = picker;
  const messages = {
    idle: '',
    loading: t.location.searching,
    success: places.length === 0 ? t.location.noResults : t.location.results(places.length),
    error: search.status === 'error' ? t.errors[search.error] : '',
  };
  return (
    <p id={picker.ids.status} role="status" className="mt-2 min-h-6 text-sm text-muted">
      {messages[search.status]}
    </p>
  );
}
