import { Router } from 'express';

import { planRequestSchema } from '@saans/shared';

import type { PlanService } from '../services/plan-service.js';

import { parseRequest } from './validate.js';

/**
 * `POST /plan` — the personalised daily plan.
 * @param plans - Plan service.
 * @returns The router.
 */
export function createPlanRouter(plans: PlanService): Router {
  const router = Router();
  router.post('/plan', async (req, res) => {
    const { profile } = parseRequest(planRequestSchema, req.body);
    const plan = await plans.createPlan(profile);
    // Personal data: never store in shared caches.
    res.set('Cache-Control', 'private, no-store').json(plan);
  });
  return router;
}
