import type { Language } from '@saans/shared';

import { EN_COPY } from './en.js';
import { HI_COPY } from './hi.js';
import type { PlanCopy } from './plan-copy.js';

/** Planner copy for every supported language. */
export const PLAN_COPY: Readonly<Record<Language, PlanCopy>> = { en: EN_COPY, hi: HI_COPY };
