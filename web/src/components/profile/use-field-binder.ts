import type { FieldName, ProfileForm, ProfileFormValues } from '../../hooks/use-profile-form.js';
import { useI18n } from '../../i18n/i18n-context.js';

/** Fields holding free text or numbers-as-text (not fixed choices). */
export type TextFieldName = {
  [K in FieldName]: string extends ProfileFormValues[K] ? K : never;
}[FieldName];

/** Fields holding a yes/no value. */
export type FlagFieldName = {
  [K in FieldName]: ProfileFormValues[K] extends boolean ? K : never;
}[FieldName];

/** Props a text-like field needs, produced by {@link useFieldBinder}. */
export interface TextBinding {
  readonly name: TextFieldName;
  readonly value: string;
  readonly error: string | undefined;
  readonly onChange: (value: string) => void;
}

/** Props a checkbox needs, produced by {@link useFieldBinder}. */
export interface FlagBinding {
  readonly name: FlagFieldName;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

/**
 * Binds form fields to the form state: value, change handler and translated error.
 * @param form - The profile form.
 * @returns `text(name)` and `flag(name)` binding factories.
 */
export function useFieldBinder(form: ProfileForm): {
  readonly text: (name: TextFieldName) => TextBinding;
  readonly flag: (name: FlagFieldName) => FlagBinding;
} {
  const { t } = useI18n();
  return {
    text: (name) => {
      const errorKey = form.errors[name];
      return {
        name,
        value: form.values[name],
        error: errorKey === undefined ? undefined : t.profile.fieldErrors[errorKey],
        onChange: (value) => {
          form.update(name, value);
        },
      };
    },
    flag: (name) => ({
      name,
      checked: form.values[name],
      onChange: (checked) => {
        form.update(name, checked);
      },
    }),
  };
}
