import { describe, expect, it } from 'vitest';

import { LANGUAGES, NAQI_CATEGORIES } from './constants/index.js';
import { NAQI_ADVISORIES, NAQI_CATEGORY_NAMES } from './naqi-text.js';

describe('NAQI text', () => {
  it.each(LANGUAGES)('names and advises on every category in %s', (language) => {
    for (const category of NAQI_CATEGORIES) {
      expect(NAQI_CATEGORY_NAMES[language][category]).not.toBe('');
      expect(NAQI_ADVISORIES[language][category]).toMatch(/[.।]$/u);
    }
  });

  it('keeps CPCB’s English wording for the severe band', () => {
    expect(NAQI_ADVISORIES.en.severe).toBe(
      'Affects healthy people and seriously impacts those with existing diseases.',
    );
  });
});
