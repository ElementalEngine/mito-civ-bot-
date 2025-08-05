import { Router } from 'express';

// sub‐routers (once you have them):
// import usersRouter from './users';
// import reportsRouter from './reports';

export default function routes() {
  const router = Router();

  // root health/status
  router.get('/', (_req, res) => res.json({ status: 'ok' }));

  // mount sub‐routers
  // router.use('/users', usersRouter);
  // router.use('/reports', reportsRouter);

  return router;
}