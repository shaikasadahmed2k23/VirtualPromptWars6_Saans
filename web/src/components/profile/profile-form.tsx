import { useRef, useState, type FormEvent, type JSX, type Ref } from 'react';

import type { UserProfile } from '@saans/shared';

import type { SelectedPlace } from '../../hooks/selected-place.js';
import {
  useProfileForm,
  type FieldErrorKey,
  type FieldErrors,
  type FieldName,
} from '../../hooks/use-profile-form.js';
import { useI18n } from '../../i18n/i18n-context.js';
import { SectionCard } from '../ui/section-card.js';

import { fieldId } from './fields.js';
import { CommuteFieldset, HomeFieldset, HouseholdFieldset, ScheduleFieldset } from './fieldsets.js';

/** Props for {@link ProfileForm}. */
export interface ProfileFormProps {
  readonly place: SelectedPlace | null;
  readonly submitting: boolean;
  readonly onSubmit: (profile: UserProfile) => void;
}

/**
 * Household details form, validated with the shared schema before anything is sent.
 * @param props - Selected place, whether a plan is in flight, and the submit handler.
 * @returns The profile section.
 */
export function ProfileForm({ place, submitting, onSubmit }: ProfileFormProps): JSX.Element {
  const { t, language } = useI18n();
  const form = useProfileForm();
  const [needsLocation, setNeedsLocation] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setNeedsLocation(place === null);
    const profile = place === null ? null : await form.validate(place, language);
    if (profile === null) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    onSubmit(profile);
  };

  return (
    <SectionCard id="profile" title={t.profile.heading}>
      <p className="mb-4 text-muted">{t.profile.intro}</p>
      <form noValidate onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
        <ErrorSummary summaryRef={summaryRef} errors={form.errors} needsLocation={needsLocation} />
        <HouseholdFieldset form={form} />
        <CommuteFieldset form={form} />
        <ScheduleFieldset form={form} />
        <HomeFieldset form={form} />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-accent px-5 py-3 text-lg font-semibold text-white hover:bg-accent-strong disabled:opacity-70 sm:w-auto"
        >
          {submitting ? t.profile.submitting : t.profile.submit}
        </button>
      </form>
    </SectionCard>
  );
}

interface ErrorSummaryProps {
  readonly errors: FieldErrors;
  readonly needsLocation: boolean;
  readonly summaryRef: Ref<HTMLDivElement>;
}

const useFieldLabels = (): Readonly<Record<keyof FieldErrors, string>> => {
  const { profile } = useI18n().t;
  return {
    adults: profile.adults,
    children: profile.children,
    elderly: profile.elderly,
    hasSensitiveMembers: profile.sensitive,
    commuteMode: profile.mode,
    distanceKm: profile.distance,
    workLocation: profile.workLocation,
    officeDaysPerWeek: profile.officeDays,
    startHour: profile.startHour,
    endHour: profile.endHour,
    exerciseTiming: profile.exercise,
    minutesPerDay: profile.minutes,
    hasPurifier: profile.purifier,
    cookingFuel: profile.fuel,
    notes: profile.notes,
  };
};

function ErrorSummary({
  errors,
  needsLocation,
  summaryRef,
}: ErrorSummaryProps): JSX.Element | null {
  const { t } = useI18n();
  const labels = useFieldLabels();
  const fields = Object.entries(errors) as [FieldName, FieldErrorKey][];
  if (fields.length === 0 && !needsLocation) return null;
  return (
    <div
      ref={summaryRef}
      tabIndex={-1}
      role="alert"
      className="rounded-xl border border-danger/40 bg-danger/5 p-4"
    >
      {needsLocation && <p className="font-medium text-danger">{t.profile.needLocation}</p>}
      {fields.length > 0 && (
        <>
          <p className="font-medium text-danger">{t.profile.errorSummary(fields.length)}</p>
          <ul className="mt-2 list-disc pl-5">
            {fields.map(([name, errorKey]) => (
              <li key={name}>
                <a href={`#${fieldId(name)}`} className="text-danger underline">
                  {labels[name]}: {t.profile.fieldErrors[errorKey]}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
