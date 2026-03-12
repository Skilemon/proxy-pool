import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { SettingsService } from '../services/SettingsService';
import { JWT_SECRET, authMiddleware } from '../middleware/auth';

const DEFAULT_PASSWORD = 'admin';

export function createAuthRoutes(settingsService: SettingsService): Router {
  const router = Router();

  router.post('/login', async (req, res) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: '请输入密码' });
    }

    const storedPassword = await settingsService.getSetting('adminPassword') || DEFAULT_PASSWORD;

    if (password !== storedPassword) {
      return res.status(401).json({ success: false, error: '密码错误' });
    }

    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, data: { token } });
  });

  router.post('/change-password', authMiddleware, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: '请填写旧密码和新密码' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ success: false, error: '新密码至少4位' });
    }

    const storedPassword = await settingsService.getSetting('adminPassword') || DEFAULT_PASSWORD;
    if (oldPassword !== storedPassword) {
      return res.status(401).json({ success: false, error: '旧密码错误' });
    }

    await settingsService.setSetting('adminPassword', newPassword);
    res.json({ success: true });
  });

  return router;
}
