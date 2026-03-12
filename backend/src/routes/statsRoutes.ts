import { Router } from 'express';
import { ProxyService } from '../services/ProxyService';

export function createStatsRoutes(proxyService: ProxyService): Router {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const stats = await proxyService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
