import { describe, expect, it } from 'vitest';

import { DEFAULT_VALUES, validateProfile } from './use-profile-form.js';

const PLACE = { latitude: 28.65, longitude: 77.23, label: 'Delhi, India' };

describe('validateProfile', () => {
  it('accepts the defaults', () => {
    expect(validateProfile(DEFAULT_VALUES, PLACE, 'en')).toMatchObject({ ok: true });
  });

  it('treats an empty number box as missing, not zero', () => {
    const result = validateProfile({ ...DEFAULT_VALUES, elderly: ' ' }, PLACE, 'en');
    expect(result).toEqual({ ok: false, errors: { elderly: 'count' } });
  });

  it('fails without inventing a field error when the problem is not a form field', () => {
    const result = validateProfile(DEFAULT_VALUES, { ...PLACE, latitude: 999 }, 'en');
    expect(result).toEqual({ ok: false, errors: {} });
  });
});
