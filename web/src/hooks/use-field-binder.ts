import { useI18n } from '../i18n/i18n-context.js';

import type { FieldName, ProfileForm, ProfileFormValues } from './use-profile-form.js';

/** Fields holding free text or numbers-as-text. */
export type TextFieldName = {
  [K in FieldName]: string extends ProfileFormValues[K] ? K : never;
}[FieldName];

/** Fields holding a yes/no value. */
export type FlagFieldName = {
  [K in FieldName]: ProfileFormValues[K] extends boolean ? K : never;
}[FieldName];

/** Fields holding one of a fixed set of strings (rendered as a select). */
export type ChoiceFieldName = Exclude<FieldName, TextFieldName | FlagFieldName>;

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

/** Props a select needs (besides its values and labels), produced by {@link useFieldBinder}. */
export interface ChoiceBinding<K extends ChoiceFieldName> {
  readonly name: K;
  readonly value: ProfileFormValues[K];
  readonly onChange: (value: ProfileFormValues[K]) => void;
}

/** The binding factories returned by {@link useFieldBinder}. */
export interface FieldBinder {
  readonly text: (name: TextFieldName) => TextBinding;
  readonly flag: (name: FlagFieldName) => FlagBinding;
  readonly choice: <K extends ChoiceFieldName>(name: K) => ChoiceBinding<K>;
}

/**
 * Binds form fields to the form state: value, change handler and translated error.
 * @param form - The profile form.
 * @returns `text`, `flag` and `choice` binding factories, one per kind of control.
 */
export function useFieldBinder(form: ProfileForm): FieldBinder {
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
    choice: (name) => ({
      name,
      value: form.values[name],
      onChange: (value) => {
        form.update(name, value);
      },
    }),
  };
}
