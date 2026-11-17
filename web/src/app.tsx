import type { JSX } from 'react';

const MAIN_ID = 'main-content';

/**
 * Application shell: skip link plus header, main and footer landmarks.
 * @returns The root layout element.
 */
export function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        href={`#${MAIN_ID}`}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:outline-3 focus:outline-blue-700"
      >
        Skip to main content
      </a>
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <p className="text-xl font-bold">Saans</p>
      </header>
      <main id={MAIN_ID} tabIndex={-1} className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold">Breathe easier through winter smog</h1>
      </main>
      <footer className="px-4 py-6 text-sm text-slate-700">
        Air quality data: Open-Meteo. Figures shown are estimates.
      </footer>
    </div>
  );
}
