import './zod-config.js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createApiClient } from './api/api-client.js';
import { ApiProvider } from './api/api-context.js';
import { App } from './app.js';
import { I18nProvider } from './i18n/i18n-context.js';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root is missing from index.html');
}

// Composition root: the real fetch is bound here and injected everywhere else.
const api = createApiClient((url, init) => fetch(url, init));

createRoot(container).render(
  <StrictMode>
    <ApiProvider client={api}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ApiProvider>
  </StrictMode>,
);
