import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, type ApiFailure } from '../api/api-client.js';

/** Lifecycle of one asynchronous request. */
export type AsyncState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: ApiFailure };

/** A cancellable unit of work. */
export type Task<T> = (signal: AbortSignal) => Promise<T>;

/** What {@link useAsyncTask} returns. */
export interface AsyncTask<T> {
  readonly state: AsyncState<T>;
  /** Starts `task`, cancelling any request still in flight. */
  readonly run: (task: Task<T>) => void;
  /** Cancels any request and returns to idle. */
  readonly reset: () => void;
}

const IDLE = { status: 'idle' } as const;

const failureOf = (error: unknown): ApiFailure =>
  error instanceof ApiError ? error.code : 'BAD_RESPONSE';

/**
 * Runs one request at a time: starting a new one aborts the previous, results from an
 * aborted request are ignored, and everything is cancelled on unmount.
 * @returns The current state plus `run` and `reset`.
 */
export function useAsyncTask<T>(): AsyncTask<T> {
  const [state, setState] = useState<AsyncState<T>>(IDLE);
  const controller = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setState(IDLE);
  }, []);

  const run = useCallback((task: Task<T>) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState({ status: 'loading' });
    task(current.signal).then(
      (data) => {
        if (!current.signal.aborted) setState({ status: 'success', data });
      },
      (error: unknown) => {
        if (!current.signal.aborted) setState({ status: 'error', error: failureOf(error) });
      },
    );
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  return { state, run, reset };
}
