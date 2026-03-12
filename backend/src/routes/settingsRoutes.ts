import { Router } from 'express';
import { SettingsService } from '../services/SettingsService';
import { SchedulerService } from '../services/SchedulerService';
import { ValidatorService } from '../services/ValidatorService';

export function createSettingsRoutes(
  settingsService: SettingsService,
  schedulerService: SchedulerService,
  validatorService: ValidatorService
): Router {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const settings = await settingsService.getSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  });

  router.put('/', async (req, res, next) => {
    try {
      await settingsService.updateSettings(req.body || {});

      if (req.body?.testUrl) {
        validatorService.setTestUrl(req.body.testUrl);
      }

      if (req.body?.validationTimeout) {
        validatorService.setTimeout(Number(req.body.validationTimeout));
      }

      await schedulerService.restart();

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
