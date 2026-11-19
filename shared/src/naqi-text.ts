import type { Language, NaqiCategory } from './constants/index.js';

/** Display name of each NAQI category, per language. */
export const NAQI_CATEGORY_NAMES = {
  en: {
    good: 'Good',
    satisfactory: 'Satisfactory',
    moderate: 'Moderate',
    poor: 'Poor',
    veryPoor: 'Very poor',
    severe: 'Severe',
  },
  hi: {
    good: 'अच्छी',
    satisfactory: 'संतोषजनक',
    moderate: 'मध्यम',
    poor: 'ख़राब',
    veryPoor: 'बहुत ख़राब',
    severe: 'गंभीर',
  },
} as const satisfies Record<Language, Record<NaqiCategory, string>>;

/**
 * CPCB health statement for each NAQI category (CPCB National Air Quality Index, 2014). The
 * English text is CPCB's own wording; the Hindi is our translation of it.
 */
export const NAQI_ADVISORIES = {
  en: {
    good: 'Minimal impact.',
    satisfactory: 'Minor breathing discomfort to sensitive people.',
    moderate:
      'Breathing discomfort to people with lung disease such as asthma, and to people with heart disease, children and older adults.',
    poor: 'Breathing discomfort to most people on prolonged exposure.',
    veryPoor: 'Respiratory illness on prolonged exposure.',
    severe: 'Affects healthy people and seriously impacts those with existing diseases.',
  },
  hi: {
    good: 'न्यूनतम असर।',
    satisfactory: 'संवेदनशील लोगों को साँस लेने में हल्की तकलीफ़।',
    moderate: 'दमा जैसी फेफड़ों की बीमारी वालों, दिल के मरीज़ों, बच्चों और बुज़ुर्गों को साँस लेने में तकलीफ़।',
    poor: 'लंबे समय तक संपर्क में रहने पर ज़्यादातर लोगों को साँस लेने में तकलीफ़।',
    veryPoor: 'लंबे समय तक संपर्क में रहने पर साँस की बीमारी।',
    severe: 'स्वस्थ लोगों पर भी असर, और बीमार लोगों पर गंभीर असर।',
  },
} as const satisfies Record<Language, Record<NaqiCategory, string>>;
