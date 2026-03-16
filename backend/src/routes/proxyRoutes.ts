import { Router } from 'express';
import { ProxyService } from '../services/ProxyService';

export function createProxyRoutes(proxyService: ProxyService): Router {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1')));
      const pageSize = Math.min(200, Math.max(1, parseInt(String(req.query.pageSize || '20'))));
      const protocol = String(req.query.protocol || 'all');
      const status = String(req.query.status || 'all') as 'valid' | 'invalid' | 'all';
      const maxResponseTime = req.query.maxResponseTime ? parseInt(String(req.query.maxResponseTime)) : undefined;

      const result = await proxyService.getProxiesPaged({ page, pageSize, protocol, status, maxResponseTime });
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const proxy = await proxyService.addProxy(req.body);
      res.json({ success: true, data: proxy });
    } catch (error) {
      next(error);
    }
  });

  router.post('/batch', async (req, res, next) => {
    try {
      const result = await proxyService.addProxies(req.body.proxies || []);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  router.post('/import', async (req, res, next) => {
    try {
      const { content } = req.body;
      const result = await proxyService.importFromText(content || '');
      res.json({ success: true, data: { added: result.added.length, duplicates: result.duplicates } });
    } catch (error) {
      next(error);
    }
  });

  router.get('/export', async (req, res, next) => {
    try {
      const ids = req.query.ids ? String(req.query.ids).split(',') : undefined;
      const content = await proxyService.exportToText(ids);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="proxies.txt"');
      res.send(content);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/invalid', async (req, res, next) => {
    try {
      const count = await proxyService.deleteInvalidProxies();
      res.json({ success: true, data: { count } });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await proxyService.deleteProxy(req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/', async (req, res, next) => {
    try {
      const { ids } = req.body;
      await proxyService.deleteProxies(ids || []);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
