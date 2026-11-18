import type { JSX, ReactNode } from 'react';

import {
  COMMUTE_MODES,
  COOKING_FUELS,
  EXERCISE_TIMINGS,
  INPUT_LIMITS,
  WORK_LOCATIONS,
} from '@saans/shared';

import { useFieldBinder } from '../../hooks/use-field-binder.js';
import type { ProfileForm } from '../../hooks/use-profile-form.js';
import { useI18n } from '../../i18n/i18n-context.js';

import { CheckboxField, NumberField, SelectField, TextAreaField } from './fields.js';

/** Props shared by every fieldset: the form state and its actions. */
export interface FieldsetProps {
  readonly form: ProfileForm;
}

interface GroupProps {
  readonly legend: string;
  readonly children: ReactNode;
}

function Group({ legend, children }: GroupProps): JSX.Element {
  return (
    <fieldset className="rounded-xl border border-line p-4">
      <legend className="px-1 font-semibold">{legend}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/**
 * Who lives at home.
 * @param props - Form state.
 * @returns The household fieldset.
 */
export function HouseholdFieldset({ form }: FieldsetProps): JSX.Element {
  const { t } = useI18n();
  const bind = useFieldBinder(form);
  return (
    <Group legend={t.profile.household}>
      <NumberField label={t.profile.adults} {...bind.text('adults')} />
      <NumberField label={t.profile.children} {...bind.text('children')} />
      <NumberField label={t.profile.elderly} {...bind.text('elderly')} />
      <div className="sm:col-span-2">
        <CheckboxField label={t.profile.sensitive} {...bind.flag('hasSensitiveMembers')} />
      </div>
    </Group>
  );
}

/**
 * How the household commutes.
 * @param props - Form state.
 * @returns The commute fieldset.
 */
export function CommuteFieldset({ form }: FieldsetProps): JSX.Element {
  const { t } = useI18n();
  const bind = useFieldBinder(form);
  return (
    <Group legend={t.profile.commute}>
      <SelectField
        label={t.profile.mode}
        values={COMMUTE_MODES}
        labels={t.profile.modes}
        {...bind.choice('commuteMode')}
      />
      <NumberField label={t.profile.distance} step="0.5" {...bind.text('distanceKm')} />
    </Group>
  );
}

/**
 * Work pattern and outdoor exercise.
 * @param props - Form state.
 * @returns The schedule fieldset.
 */
export function ScheduleFieldset({ form }: FieldsetProps): JSX.Element {
  const { t } = useI18n();
  const bind = useFieldBinder(form);
  return (
    <Group legend={t.profile.schedule}>
      <SelectField
        label={t.profile.workLocation}
        values={WORK_LOCATIONS}
        labels={t.profile.workLocations}
        {...bind.choice('workLocation')}
      />
      <NumberField label={t.profile.officeDays} {...bind.text('officeDaysPerWeek')} />
      <NumberField label={t.profile.startHour} {...bind.text('startHour')} />
      <NumberField label={t.profile.endHour} {...bind.text('endHour')} />
      <SelectField
        label={t.profile.exercise}
        values={EXERCISE_TIMINGS}
        labels={t.profile.exerciseTimings}
        {...bind.choice('exerciseTiming')}
      />
      <NumberField label={t.profile.minutes} {...bind.text('minutesPerDay')} />
    </Group>
  );
}

/**
 * Home air: purifier, cooking fuel and free-text notes.
 * @param props - Form state.
 * @returns The home fieldset.
 */
export function HomeFieldset({ form }: FieldsetProps): JSX.Element {
  const { t } = useI18n();
  const bind = useFieldBinder(form);
  return (
    <Group legend={t.profile.home}>
      <SelectField
        label={t.profile.fuel}
        values={COOKING_FUELS}
        labels={t.profile.fuels}
        {...bind.choice('cookingFuel')}
      />
      <div className="self-end">
        <CheckboxField label={t.profile.purifier} {...bind.flag('hasPurifier')} />
      </div>
      <div className="sm:col-span-2">
        <TextAreaField
          label={t.profile.notes}
          hint={t.profile.notesHint}
          maxLength={INPUT_LIMITS.notesMax}
          {...bind.text('notes')}
        />
      </div>
    </Group>
  );
}
