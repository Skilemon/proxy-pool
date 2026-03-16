import { getDatabase } from '../database/connection';
import { AppSettings } from '../types';

export class SettingsService {
  getDefaultSettings(): AppSettings {
    return {
      validationInterval: 30,
      fetchInterval: 60,
      validationTimeout: 5000,
      validationConcurrency: 10,
      testUrl: 'http://www.apple.com/library/test/success.html',
      clearInvalidOnFetch: false,
      geoipProxyUrl: ''
    };
  }

  async getSettings(): Promise<AppSettings> {
    const db = getDatabase();
    const rows = await db.all('SELECT key, value FROM settings');

    const settings: any = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });

    return {
      validationInterval: parseInt(settings.validationInterval || '30', 10),
      fetchInterval: parseInt(settings.fetchInterval || '60', 10),
      validationTimeout: parseInt(settings.validationTimeout || '5000', 10),
      validationConcurrency: parseInt(settings.validationConcurrency || '10', 10),
      testUrl: settings.testUrl || 'http://www.apple.com/library/test/success.html',
      clearInvalidOnFetch: settings.clearInvalidOnFetch === 'true',
      geoipProxyUrl: settings.geoipProxyUrl || ''
    };
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    const db = getDatabase();

    for (const [key, value] of Object.entries(updates)) {
      await db.run(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [key, String(value)]
      );
    }
  }

  async getSetting(key: string): Promise<string | null> {
    const db = getDatabase();
    const row = await db.get('SELECT value FROM settings WHERE key = ?', key);
    return row ? row.value : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const db = getDatabase();
    await db.run(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }
}
