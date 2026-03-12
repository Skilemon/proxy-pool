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

  router.post('/:id/fetch', async (req, res, next) => {
    try {
      const result = await fetcherService.fetchFromSource(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  router.post('/fetch-all', async (req, res, next) => {
    try {
      const result = await fetcherService.fetchFromAllSources();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
