import { describe, expect, it } from 'vitest';

import { formatPlaceLabel } from './place-label.js';

describe('formatPlaceLabel', () => {
  it.each([
    [
      { name: 'Lucknow', region: 'Uttar Pradesh', country: 'India' },
      'Lucknow, Uttar Pradesh, India',
    ],
    [{ name: 'Delhi', region: 'Delhi', country: 'India' }, 'Delhi, India'],
    [{ name: 'Nowhere', region: null, country: null }, 'Nowhere'],
    [{ name: 'Leh', region: '', country: 'India' }, 'Leh, India'],
  ])('%o → %s', (place, label) => {
    expect(formatPlaceLabel(place)).toBe(label);
  });
});
