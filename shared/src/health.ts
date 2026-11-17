import { z } from 'zod';

/** Response contract for `GET /api/health`, used by the container healthcheck and uptime pings. */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

/** Body returned by `GET /api/health`. */
export type HealthResponse = z.infer<typeof healthResponseSchema>;
