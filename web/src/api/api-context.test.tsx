import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useApi } from './api-context.js';

describe('useApi', () => {
  it('refuses to work outside the provider', () => {
    // React logs the error it is about to rethrow; keep the test output clean.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useApi())).toThrow('inside <ApiProvider>');
    consoleError.mockRestore();
  });
});
