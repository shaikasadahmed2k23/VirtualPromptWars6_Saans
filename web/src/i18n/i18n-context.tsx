import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';

import type { Language } from '@saans/shared';

import { EN, type Messages } from './en.js';
import { HI } from './hi.js';

const DICTIONARIES: Readonly<Record<Language, Messages>> = { en: EN, hi: HI };

/** Current language, its strings, and a way to switch. */
export interface I18nValue {
  readonly language: Language;
  readonly t: Messages;
  readonly toggleLanguage: () => void;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Props for {@link I18nProvider}. */
export interface I18nProviderProps {
  readonly initialLanguage?: Language;
  readonly children: ReactNode;
}

/**
 * Holds the UI language and keeps `<html lang>` and the document title in sync, so screen readers
 * switch voice and the tab title reads in the chosen language.
 * @param props - Optional starting language and the subtree.
 * @returns The provider element.
 */
export function I18nProvider({ initialLanguage = 'en', children }: I18nProviderProps): JSX.Element {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = DICTIONARIES[language].documentTitle;
  }, [language]);
  const value = useMemo<I18nValue>(
    () => ({
      language,
      t: DICTIONARIES[language],
      toggleLanguage: () => {
        setLanguage((current) => (current === 'en' ? 'hi' : 'en'));
      },
    }),
    [language],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Reads the current language and dictionary.
 * @returns The i18n value.
 * @throws {Error} When used outside an {@link I18nProvider}.
 */
export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (value === null) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return value;
}
