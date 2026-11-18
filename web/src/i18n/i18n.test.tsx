import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { EN } from './en.js';
import { HI } from './hi.js';
import { I18nProvider, useI18n } from './i18n-context.js';

// Every leaf path of a dictionary, e.g. "profile.fieldErrors.adults".
const keysOf = (value: unknown, prefix = ''): string[] =>
  typeof value === 'object' && value !== null
    ? Object.entries(value).flatMap(([key, child]) => keysOf(child, `${prefix}${key}.`))
    : [prefix.slice(0, -1)];

describe('dictionaries', () => {
  it('Hindi translates every English key', () => {
    expect(keysOf(HI)).toEqual(keysOf(EN));
  });

  // Every interpolating message, in both languages, must produce text that includes its input.
  const functionsOf = (value: unknown): ((...args: unknown[]) => unknown)[] =>
    typeof value === 'function'
      ? [value as (...args: unknown[]) => unknown]
      : typeof value === 'object' && value !== null
        ? Object.values(value).flatMap(functionsOf)
        : [];

  it.each([
    ['en', EN],
    ['hi', HI],
  ])('every %s template renders its arguments', (_language, dictionary) => {
    const templates = functionsOf(dictionary);
    expect(templates.length).toBeGreaterThan(0);
    for (const template of templates) {
      expect(template(7, 8, 'नाम')).toMatch(/7/);
    }
  });

  it('interpolates numbers into both languages', () => {
    expect(EN.plan.exposure(105, 70)).toContain('105 µg');
    expect(HI.plan.co2(9.79)).toContain('9.79');
    expect(EN.location.results(1)).toContain('1 place found');
    expect(EN.profile.errorSummary(2)).toContain('2 fields');
  });
});

describe('I18nProvider', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider>{children}</I18nProvider>
  );

  it('switches language and updates the html lang attribute', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(document.documentElement.lang).toBe('en');
    act(() => {
      result.current.toggleLanguage();
    });
    expect(result.current.language).toBe('hi');
    expect(result.current.t.appName).toBe('साँस');
    expect(document.documentElement.lang).toBe('hi');
    act(() => {
      result.current.toggleLanguage();
    });
    expect(document.documentElement.lang).toBe('en');
  });

  it('refuses to work outside the provider', () => {
    // React logs the error it is about to rethrow; keep the test output clean.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useI18n())).toThrow('inside <I18nProvider>');
    consoleError.mockRestore();
  });
});
