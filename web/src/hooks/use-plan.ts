import { useCallback, useRef } from 'react';

import type { PlanResponse, UserProfile } from '@saans/shared';

import { useApi } from '../api/api-context.js';

import { useAsyncTask, type AsyncState } from './use-async-task.js';

/** The plan request and how to (re)send it. */
export interface PlanRequestState {
  readonly state: AsyncState<PlanResponse>;
  readonly submit: (profile: UserProfile) => void;
  /** Re-sends the last submitted profile. */
  readonly retry: () => void;
}

/**
 * Sends `POST /api/plan` on demand.
 * @returns The request state plus `submit` and `retry`.
 */
export function usePlan(): PlanRequestState {
  const api = useApi();
  const { state, run } = useAsyncTask<PlanResponse>();
  const lastProfile = useRef<UserProfile | null>(null);

  const submit = useCallback(
    (profile: UserProfile) => {
      lastProfile.current = profile;
      run((signal) => api.createPlan(profile, signal));
    },
    [api, run],
  );

  const retry = useCallback(() => {
    if (lastProfile.current !== null) submit(lastProfile.current);
  }, [submit]);

  return { state, submit, retry };
}
