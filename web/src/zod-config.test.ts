import { describe, expect, it, vi } from 'vitest';
import { core, z } from 'zod';

describe('zod-config', () => {
  it('turns off zod’s eval-based JIT so a strict CSP sees no violation', async () => {
    await import('./zod-config.js');
    expect(core.globalConfig.jitless).toBe(true);
  });

  it('parses without ever calling new Function once the JIT is off', async () => {
    await import('./zod-config.js');
    const spy = vi.spyOn(globalThis, 'Function');
    const schema = z.object({ id: z.number(), tags: z.array(z.string()) });
    expect(schema.parse({ id: 1, tags: ['a'] })).toEqual({ id: 1, tags: ['a'] });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
