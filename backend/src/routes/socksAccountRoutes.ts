import { Router } from 'express';
import { SocksAccountService } from '../services/SocksAccountService';

export function createSocksAccountRoutes(socksAccountService: SocksAccountService): Router {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const accounts = await socksAccountService.getAll();
      res.json({ success: true, data: accounts });
    } catch (e) { next(e); }
  });

  router.post('/', async (req, res, next) => {
    try {
      const { username, password, mode } = req.body;
      if (!username || !password || !['rotate', 'sticky'].includes(mode)) {
        return res.status(400).json({ success: false, error: '参数无效' });
      }
      const account = await socksAccountService.create(username, password, mode);
      res.json({ success: true, data: account });
    } catch (e: any) { next(e); }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const { password, mode, enabled } = req.body;
      const updates: any = {};
      if (password !== undefined) updates.password = password;
      if (mode !== undefined) {
        if (!['rotate', 'sticky'].includes(mode)) return res.status(400).json({ success: false, error: '模式无效' });
        updates.mode = mode;
      }
      if (enabled !== undefined) updates.enabled = Boolean(enabled);
      await socksAccountService.update(req.params.id, updates);
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await socksAccountService.delete(req.params.id);
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  return router;
}
