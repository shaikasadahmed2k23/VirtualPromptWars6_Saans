import { createContext, useContext, type JSX, type ReactNode } from 'react';

import type { ApiClient } from './api-client.js';

const ApiContext = createContext<ApiClient | null>(null);

/** Props for {@link ApiProvider}. */
export interface ApiProviderProps {
  readonly client: ApiClient;
  readonly children: ReactNode;
}

/**
 * Makes an {@link ApiClient} available to hooks; tests inject a fake one.
 * @param props - The client and the subtree that may use it.
 * @returns The provider element.
 */
export function ApiProvider({ client, children }: ApiProviderProps): JSX.Element {
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

/**
 * Reads the injected API client.
 * @returns The client.
 * @throws {Error} When used outside an {@link ApiProvider}.
 */
export function useApi(): ApiClient {
  const client = useContext(ApiContext);
  if (client === null) {
    throw new Error('useApi must be used inside <ApiProvider>');
  }
  return client;
}
