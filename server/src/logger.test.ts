import { describe, expect, it } from 'vitest';

import { createLogger } from './logger.js';

describe('createLogger', () => {
  it('honours the configured level', () => {
    expect(createLogger('warn').level).toBe('warn');
  });
});
