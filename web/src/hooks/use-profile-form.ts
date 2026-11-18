import { useCallback, useState } from 'react';

import type { CommuteMode, CookingFuel, Language, UserProfile } from '@saans/shared';

import type { Messages } from '../i18n/en.js';

import type { SelectedPlace } from './selected-place.js';

/** Raw form values; numbers stay strings until validation so inputs can be edited freely. */
export interface ProfileFormValues {
  readonly adults: string;
  readonly children: string;
  readonly elderly: string;
  readonly hasSensitiveMembers: boolean;
  readonly commuteMode: CommuteMode;
  readonly distanceKm: string;
  readonly workLocation: UserProfile['work']['location'];
  readonly officeDaysPerWeek: string;
  readonly startHour: string;
  readonly endHour: string;
  readonly exerciseTiming: UserProfile['exercise']['timing'];
  readonly minutesPerDay: string;
  readonly hasPurifier: boolean;
  readonly cookingFuel: CookingFuel;
  readonly notes: string;
}

/** A form field name. */
export type FieldName = keyof ProfileFormValues;
/** Which translated message explains a field's error. */
export type FieldErrorKey = keyof Messages['profile']['fieldErrors'];
/** Field → error message key, for fields that failed validation. */
export type FieldErrors = Partial<Record<FieldName, FieldErrorKey>>;

/** A typical urban household, so most people only adjust a few fields. */
export const DEFAULT_VALUES: ProfileFormValues = {
  adults: '2',
  children: '1',
  elderly: '0',
  hasSensitiveMembers: false,
  commuteMode: 'twoWheeler',
  distanceKm: '10',
  workLocation: 'office',
  officeDaysPerWeek: '5',
  startHour: '9',
  endHour: '18',
  exerciseTiming: 'morning',
  minutesPerDay: '30',
  hasPurifier: false,
  cookingFuel: 'lpg',
  notes: '',
};

// Schema issue path → the form field it belongs to and the message that explains it.
const FIELD_BY_PATH: Readonly<Record<string, readonly [FieldName, FieldErrorKey]>> = {
  'household.adults': ['adults', 'adults'],
  'household.children': ['children', 'count'],
  'household.elderly': ['elderly', 'count'],
  'commute.distanceKm': ['distanceKm', 'distance'],
  'work.startHour': ['startHour', 'hour'],
  'work.endHour': ['endHour', 'hour'],
  'work.officeDaysPerWeek': ['officeDaysPerWeek', 'officeDays'],
  'exercise.minutesPerDay': ['minutesPerDay', 'minutes'],
  notes: ['notes', 'notes'],
};

// An empty box is "no number", not zero.
const toNumber = (value: string): number => (value.trim() === '' ? Number.NaN : Number(value));

const toProfileInput = (values: ProfileFormValues, place: SelectedPlace, language: Language) => ({
  location: { kind: 'coords', ...place },
  household: {
    adults: toNumber(values.adults),
    children: toNumber(values.children),
    elderly: toNumber(values.elderly),
    hasSensitiveMembers: values.hasSensitiveMembers,
  },
  commute: { mode: values.commuteMode, distanceKm: toNumber(values.distanceKm) },
  work: {
    location: values.workLocation,
    startHour: toNumber(values.startHour),
    endHour: toNumber(values.endHour),
    officeDaysPerWeek: toNumber(values.officeDaysPerWeek),
  },
  exercise: { timing: values.exerciseTiming, minutesPerDay: toNumber(values.minutesPerDay) },
  hasPurifier: values.hasPurifier,
  cookingFuel: values.cookingFuel,
  language,
  ...(values.notes.trim() === '' ? {} : { notes: values.notes }),
});

/** Outcome of validating the form. */
export type ProfileValidation =
  | { readonly ok: true; readonly profile: UserProfile }
  | { readonly ok: false; readonly errors: FieldErrors };

/**
 * Validates form values with the same schema the server uses. The schema loads on first use so
 * it stays out of the initial bundle.
 * @param values - Raw form values.
 * @param place - Selected location.
 * @param language - Language the plan should be written in.
 * @returns The profile, or per-field error keys.
 */
export async function validateProfile(
  values: ProfileFormValues,
  place: SelectedPlace,
  language: Language,
): Promise<ProfileValidation> {
  const { userProfileSchema } = await import('../api/schemas.js');
  const result = userProfileSchema.safeParse(toProfileInput(values, place, language));
  if (result.success) {
    return { ok: true, profile: result.data };
  }
  const entries = result.error.issues.flatMap((issue) => {
    const field = FIELD_BY_PATH[issue.path.join('.')];
    return field === undefined ? [] : [field];
  });
  return { ok: false, errors: Object.fromEntries(entries) };
}

/** Form state, a field updater and validation that records errors. */
export interface ProfileForm {
  readonly values: ProfileFormValues;
  readonly errors: FieldErrors;
  readonly update: <K extends FieldName>(name: K, value: ProfileFormValues[K]) => void;
  readonly validate: (place: SelectedPlace, language: Language) => Promise<UserProfile | null>;
}

/**
 * Holds the household form and validates it on demand.
 * @returns The form state and actions.
 */
export function useProfileForm(): ProfileForm {
  const [values, setValues] = useState<ProfileFormValues>(DEFAULT_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});

  const update = useCallback(<K extends FieldName>(name: K, value: ProfileFormValues[K]) => {
    setValues((current) => ({ ...current, [name]: value }));
  }, []);

  const validate = useCallback(
    async (place: SelectedPlace, language: Language): Promise<UserProfile | null> => {
      const result = await validateProfile(values, place, language);
      setErrors(result.ok ? {} : result.errors);
      return result.ok ? result.profile : null;
    },
    [values],
  );

  return { values, errors, update, validate };
}
