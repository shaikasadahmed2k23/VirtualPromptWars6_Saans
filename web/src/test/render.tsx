import {
  render,
  renderHook,
  type RenderHookResult,
  type RenderResult,
} from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

import type { Language } from '@saans/shared';

import type { ApiClient } from '../api/api-client.js';
import { ApiProvider } from '../api/api-context.js';
import { I18nProvider } from '../i18n/i18n-context.js';

import { fakeApi } from './fixtures.js';

// Render helpers that supply the app's providers with an injectable fake API.

export interface ProviderOptions {
  readonly api?: ApiClient;
  readonly language?: Language;
}

const wrapperFor =
  ({ api = fakeApi(), language = 'en' }: ProviderOptions) =>
  ({ children }: { children: ReactNode }) => (
    <ApiProvider client={api}>
      <I18nProvider initialLanguage={language}>{children}</I18nProvider>
    </ApiProvider>
  );

export const renderWithProviders = (
  ui: ReactElement,
  options: ProviderOptions = {},
): RenderResult => render(ui, { wrapper: wrapperFor(options) });

export const renderHookWithProviders = <T,>(
  hook: () => T,
  options: ProviderOptions = {},
): RenderHookResult<T, unknown> => renderHook(hook, { wrapper: wrapperFor(options) });
