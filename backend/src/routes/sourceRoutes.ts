import { Router } from 'express';
import { SourceService } from '../services/SourceService';
import { FetcherService } from '../services/FetcherService';

export function createSourceRoutes(sourceService: SourceService, fetcherService: FetcherService): Router {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const sources = await sourceService.getAllSources();
      res.json({ success: true, data: sources });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const source = await sourceService.addSource(req.body);
      res.json({ success: true, data: source });
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      await sourceService.updateSource(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await sourceService.deleteSource(req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/fetch', (req, res) => {
    fetcherService.fetchFromSource(req.params.id).catch(err => {
      console.error(`后台获取来源 ${req.params.id} 失败:`, err);
    });
    res.json({ success: true, data: { message: '已开始在后台获取' } });
  });

  router.post('/fetch-all', (_req, res) => {
    fetcherService.fetchFromAllSources().catch(err => {
      console.error('后台全量获取失败:', err);
    });
    res.json({ success: true, data: { message: '已开始在后台获取全部来源' } });
  });

  return router;
}
