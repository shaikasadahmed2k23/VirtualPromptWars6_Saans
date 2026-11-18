import type { JSX } from 'react';

import { useI18n } from '../../i18n/i18n-context.js';

/** Id of the main landmark, the skip link's target. */
export const MAIN_ID = 'main-content';

/**
 * Skip link, wordmark with tagline, and the language toggle.
 * @returns The page header.
 */
export function SiteHeader(): JSX.Element {
  const { t, language, toggleLanguage } = useI18n();
  const otherLanguage = language === 'en' ? 'hi' : 'en';
  return (
    <header className="border-b border-line bg-surface">
      <a
        href={`#${MAIN_ID}`}
        className="sr-only rounded-lg bg-accent px-4 py-2 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        {t.skipLink}
      </a>
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="size-9">
            <circle cx="16" cy="16" r="15" className="fill-accent" />
            <path
              d="M8 13c3-3 6 3 9 0s5-3 7 0M8 19c3-3 6 3 9 0s5-3 7 0"
              className="fill-none stroke-white"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          <div>
            <p className="text-xl font-bold leading-tight">{t.appName}</p>
            <p className="text-sm text-muted">{t.tagline}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleLanguage}
          aria-label={t.language.label}
          className="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-accent-soft"
        >
          <span lang={otherLanguage}>{t.language.short}</span>
        </button>
      </div>
    </header>
  );
}
