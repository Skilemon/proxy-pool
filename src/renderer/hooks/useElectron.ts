import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { electronAPI } from '../api/electron';

export function useElectron() {
  const { setProxies, setSources, setSettings, setError, updateProxy, setInitialized } = useStore();

  useEffect(() => {
    // 加载初始数据
    const loadData = async () => {
      try {
        const [proxies, sources, settings] = await Promise.all([
          electronAPI.proxy.getAll(),
          electronAPI.source.getAll(),
          electronAPI.settings.get(),
        ]);

        setProxies(proxies);
        setSources(sources);
        setSettings(settings);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : '加载数据失败';
        setError(msg);
      } finally {
        setInitialized(true);
      }
    };

    loadData();

    // 注册事件监听，并保存取消订阅函数
    const unsubProxyUpdated = electronAPI.events.onProxyUpdated((proxies) => {
      setProxies(proxies);
    });

    const unsubProxyStatusChanged = electronAPI.events.onProxyStatusChanged((id, status) => {
      updateProxy(id, {
        isValid: status.isValid,
        responseTime: status.responseTime,
        lastChecked: status.timestamp,
      });
    });

    const unsubAPIError = electronAPI.events.onAPIError((error) => {
      setError(error);
    });

    // 清理函数：组件卸载时移除所有监听器
    return () => {
      unsubProxyUpdated();
      unsubProxyStatusChanged();
      unsubAPIError();
    };
  }, []);

  return electronAPI;
}
