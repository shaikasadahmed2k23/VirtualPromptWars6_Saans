import path from 'node:path';

import express, { Router } from 'express';

const HASHED_ASSET_MAX_AGE = '1y';

/**
 * Serves the built single-page web app. Vite emits content-hashed files under
 * `/assets`, so those are cached immutably; `index.html` is always revalidated.
 * @param webDistDir - Directory containing the Vite build output.
 * @returns A router that serves static files and falls back to `index.html` for client routes.
 */
export function createWebAppRouter(webDistDir: string): Router {
  const root = path.resolve(webDistDir);
  const router = Router();

  router.use(
    '/assets',
    express.static(path.join(root, 'assets'), {
      immutable: true,
      maxAge: HASHED_ASSET_MAX_AGE,
      fallthrough: false,
    }),
  );
  router.use(express.static(root, { index: false }));
  // Mounted after the /api router, which answers every /api path itself.
  router.get(/.*/, (_req, res) => {
    // Passing `root` keeps dot-directories in the install path from being rejected by `send`.
    res.set('Cache-Control', 'no-cache').sendFile('index.html', { root });
  });

  return router;
}
