import type { JSX } from 'react';

import type { FieldName } from '../../hooks/use-profile-form.js';

/**
 * The DOM id of a profile form control (also the error summary's link target).
 * @param name - Field name.
 * @returns The element id.
 */
export function fieldId(name: FieldName): string {
  return `profile-${name}`;
}

const INPUT_CLASS =
  'mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 aria-invalid:border-danger';

interface FieldBase {
  readonly name: FieldName;
  readonly label: string;
  readonly hint?: string;
  /** Translated error message, when the field is invalid. */
  readonly error?: string | undefined;
}

const describedBy = ({ name, hint, error }: FieldBase): string | undefined => {
  const ids = [
    hint === undefined ? null : `${fieldId(name)}-hint`,
    error === undefined ? null : `${fieldId(name)}-error`,
  ];
  const joined = ids.filter((id) => id !== null).join(' ');
  return joined === '' ? undefined : joined;
};

function FieldText({ name, hint, error }: FieldBase): JSX.Element {
  return (
    <>
      {hint !== undefined && (
        <p id={`${fieldId(name)}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={`${fieldId(name)}-error`} className="mt-1 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </>
  );
}

/** Props for {@link NumberField}. */
export interface NumberFieldProps extends FieldBase {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly step?: string;
}

/**
 * Labelled numeric input with hint and inline error wired up via `aria-describedby`.
 * @param props - Field name, label, value, change handler, hint and error.
 * @returns The field.
 */
export function NumberField(props: NumberFieldProps): JSX.Element {
  const { name, label, value, onChange, error, step = '1' } = props;
  return (
    <div>
      <label htmlFor={fieldId(name)} className="block font-medium">
        {label}
      </label>
      <input
        id={fieldId(name)}
        name={name}
        type="number"
        inputMode={step === '1' ? 'numeric' : 'decimal'}
        step={step}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy(props)}
        className={INPUT_CLASS}
      />
      <FieldText {...props} />
    </div>
  );
}

/** Props for {@link SelectField}. */
export interface SelectFieldProps<T extends string> extends FieldBase {
  readonly value: T;
  /** Allowed values in display order (the shared constant, e.g. `COMMUTE_MODES`). */
  readonly values: readonly T[];
  readonly labels: Readonly<Record<T, string>>;
  readonly onChange: (value: T) => void;
}

/**
 * Labelled `<select>` over a fixed list of values. The DOM hands back a plain string, so the
 * choice is matched against `values` rather than cast; anything else is ignored.
 * @param props - Field name, label, value, allowed values, their labels and change handler.
 * @returns The field.
 */
export function SelectField<T extends string>(props: SelectFieldProps<T>): JSX.Element {
  const { name, label, value, values, labels, onChange } = props;
  return (
    <div>
      <label htmlFor={fieldId(name)} className="block font-medium">
        {label}
      </label>
      <select
        id={fieldId(name)}
        name={name}
        value={value}
        onChange={(event) => {
          const picked = values.find((option) => option === event.target.value);
          if (picked !== undefined) onChange(picked);
        }}
        aria-describedby={describedBy(props)}
        className={INPUT_CLASS}
      >
        {values.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
      <FieldText {...props} />
    </div>
  );
}

/** Props for {@link CheckboxField}. */
export interface CheckboxFieldProps extends FieldBase {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

/**
 * Checkbox with its label to the right, large enough to tap.
 * @param props - Field name, label, state and change handler.
 * @returns The field.
 */
export function CheckboxField({ name, label, checked, onChange }: CheckboxFieldProps): JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <input
        id={fieldId(name)}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        className="mt-1 size-5 accent-accent"
      />
      <label htmlFor={fieldId(name)}>{label}</label>
    </div>
  );
}

/** Props for {@link TextAreaField}. */
export interface TextAreaFieldProps extends FieldBase {
  readonly value: string;
  readonly maxLength: number;
  readonly onChange: (value: string) => void;
}

/**
 * Labelled multi-line text input.
 * @param props - Field name, label, value, limit, change handler, hint and error.
 * @returns The field.
 */
export function TextAreaField(props: TextAreaFieldProps): JSX.Element {
  const { name, label, value, maxLength, onChange, error } = props;
  return (
    <div>
      <label htmlFor={fieldId(name)} className="block font-medium">
        {label}
      </label>
      <textarea
        id={fieldId(name)}
        name={name}
        rows={3}
        maxLength={maxLength}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy(props)}
        className={INPUT_CLASS}
      />
      <FieldText {...props} />
    </div>
  );
}
