import type { JSX, ReactNode } from 'react';

import { INPUT_LIMITS } from '@saans/shared';

import type { ProfileForm } from '../../hooks/use-profile-form.js';
import { useI18n } from '../../i18n/i18n-context.js';

import { CheckboxField, NumberField, SelectField, TextAreaField } from './fields.js';
import { useFieldBinder } from './use-field-binder.js';

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
        name="commuteMode"
        label={t.profile.mode}
        value={form.values.commuteMode}
        options={t.profile.modes}
        onChange={(value) => {
          form.update('commuteMode', value);
        }}
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
        name="workLocation"
        label={t.profile.workLocation}
        value={form.values.workLocation}
        options={t.profile.workLocations}
        onChange={(value) => {
          form.update('workLocation', value);
        }}
      />
      <NumberField label={t.profile.officeDays} {...bind.text('officeDaysPerWeek')} />
      <NumberField label={t.profile.startHour} {...bind.text('startHour')} />
      <NumberField label={t.profile.endHour} {...bind.text('endHour')} />
      <SelectField
        name="exerciseTiming"
        label={t.profile.exercise}
        value={form.values.exerciseTiming}
        options={t.profile.exerciseTimings}
        onChange={(value) => {
          form.update('exerciseTiming', value);
        }}
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
        name="cookingFuel"
        label={t.profile.fuel}
        value={form.values.cookingFuel}
        options={t.profile.fuels}
        onChange={(value) => {
          form.update('cookingFuel', value);
        }}
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
