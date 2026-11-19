import { describe, expect, it, vi } from 'vitest';

import {
  SHUTDOWN_GRACE_MS,
  createShutdownHandler,
  type ClosableServer,
  type ShutdownRuntime,
} from './shutdown.js';

const setup = (closeError?: Error) => {
  let closeCallback: ((error?: Error) => void) | undefined;
  let timerCallback: (() => void) | undefined;
  const server: ClosableServer = {
    close: vi.fn((callback: (error?: Error) => void) => {
      closeCallback = callback;
    }),
  };
  const unref = vi.fn();
  const runtime = {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    exit: vi.fn<(code: number) => void>(),
    setTimer: vi.fn((callback: () => void) => {
      timerCallback = callback;
      return { unref };
    }),
  } satisfies ShutdownRuntime;
  createShutdownHandler(server, runtime)('SIGTERM');
  return {
    server,
    runtime,
    unref,
    finishClose: () => {
      closeCallback?.(closeError);
    },
    fireTimer: () => {
      timerCallback?.();
    },
  };
};

describe('createShutdownHandler', () => {
  it('stops accepting connections and logs the signal', () => {
    const { server, runtime } = setup();

    expect(server.close).toHaveBeenCalledOnce();
    expect(runtime.logger.info).toHaveBeenCalledWith({ signal: 'SIGTERM' }, 'shutting down');
    expect(runtime.exit).not.toHaveBeenCalled();
  });

  it('exits 0 once in-flight requests have finished', () => {
    const { runtime, finishClose } = setup();

    finishClose();

    expect(runtime.exit).toHaveBeenCalledWith(0);
  });

  it('exits 1 and logs when closing fails', () => {
    const { runtime, finishClose } = setup(new Error('not running'));

    finishClose();

    expect(runtime.logger.error).toHaveBeenCalledOnce();
    expect(runtime.exit).toHaveBeenCalledWith(1);
  });

  it('forces exit 1 after the grace period without keeping the process alive', () => {
    const { runtime, unref, fireTimer } = setup();

    expect(runtime.setTimer).toHaveBeenCalledWith(expect.any(Function), SHUTDOWN_GRACE_MS);
    expect(unref).toHaveBeenCalledOnce();
    fireTimer();

    expect(runtime.exit).toHaveBeenCalledWith(1);
  });
});
