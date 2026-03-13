import axios, { AxiosInstance } from 'axios';
import type { ApiResponse, ProxyEntry, ProxySource, AppSettings, StatsData } from '@/types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        const message = error.response?.data?.error || error.message || '请求失败';
        return Promise.reject(new Error(message));
      }
    );
  }

  async login(password: string): Promise<string> {
    const { data } = await this.client.post<ApiResponse<{ token: string }>>('/auth/login', { password });
    return data.data!.token;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await this.client.post('/auth/change-password', { oldPassword, newPassword });
  }

  async getProxies(): Promise<ProxyEntry[]> {
    const { data } = await this.client.get<ApiResponse<ProxyEntry[]>>('/proxies');
    return data.data || [];
  }

  async addProxy(proxy: Omit<ProxyEntry, 'id' | 'createdAt'>): Promise<ProxyEntry> {
    const { data } = await this.client.post<ApiResponse<ProxyEntry>>('/proxies', proxy);
    return data.data!;
  }

  async deleteProxies(ids: string[]): Promise<void> {
    await this.client.delete('/proxies', { data: { ids } });
  }

  async importProxies(content: string): Promise<{ added: number; duplicates: number }> {
    const { data } = await this.client.post<ApiResponse<{ added: number; duplicates: number }>>('/proxies/import', { content });
    return data.data!;
  }

  async exportProxies(ids?: string[]): Promise<Blob> {
    const params = ids && ids.length > 0 ? { ids: ids.join(',') } : {};
    const { data } = await this.client.get('/proxies/export', { params, responseType: 'blob' });
    return data;
  }

  async getSources(): Promise<ProxySource[]> {
    const { data } = await this.client.get<ApiResponse<ProxySource[]>>('/sources');
    return data.data || [];
  }

  async addSource(source: Omit<ProxySource, 'id' | 'createdAt'>): Promise<ProxySource> {
    const { data } = await this.client.post<ApiResponse<ProxySource>>('/sources', source);
    return data.data!;
  }

  async updateSource(id: string, updates: Partial<Omit<ProxySource, 'id' | 'createdAt'>>): Promise<void> {
    await this.client.put(`/sources/${id}`, updates);
  }

  async deleteSource(id: string): Promise<void> {
    await this.client.delete(`/sources/${id}`);
  }

  async fetchFromSource(id: string): Promise<{ added: number; duplicates: number }> {
    const { data } = await this.client.post<ApiResponse<{ added: number; duplicates: number }>>(`/sources/${id}/fetch`);
    return data.data!;
  }

  async fetchFromAllSources(): Promise<{ total: number; added: number; duplicates: number }> {
    const { data } = await this.client.post<ApiResponse<{ total: number; added: number; duplicates: number }>>('/sources/fetch-all');
    return data.data!;
  }

  async getStats(): Promise<StatsData> {
    const { data } = await this.client.get<ApiResponse<StatsData>>('/stats');
    return data.data!;
  }

  async getSettings(): Promise<AppSettings> {
    const { data } = await this.client.get<ApiResponse<AppSettings>>('/settings');
    return data.data!;
  }

  async getDefaultSettings(): Promise<AppSettings> {
    const { data } = await this.client.get<ApiResponse<AppSettings>>('/settings/defaults');
    return data.data!;
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    await this.client.put('/settings', settings);
  }

  async deleteInvalidProxies(): Promise<{ count: number }> {
    const { data } = await this.client.delete<ApiResponse<{ count: number }>>('/proxies/invalid');
    return data.data!;
  }

  async validateProxies(): Promise<void> {
    await this.client.post('/validate');
  }

  async fetchProxies(): Promise<void> {
    await this.client.post('/fetch');
  }
}

export const api = new ApiClient();
