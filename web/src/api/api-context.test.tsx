import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useApi } from './api-context.js';

describe('useApi', () => {
  it('refuses to work outside the provider', () => {
    expect(() => renderHook(() => useApi())).toThrow('inside <ApiProvider>');
  });
});
