import threading
import time
import schedule
from typing import Optional
from datetime import datetime


class SchedulerService:
    """调度器服务"""
    
    def __init__(self, proxy_service, validator_service, fetcher_service, settings_service):
        self.proxy_service = proxy_service
        self.validator_service = validator_service
        self.fetcher_service = fetcher_service
        self.settings_service = settings_service
        
        self.is_validating = False
        self.is_fetching = False
        self._stop_event = threading.Event()
        self._scheduler_thread: Optional[threading.Thread] = None
    
    async def start(self):
        """启动调度器"""
        settings = await self.settings_service.get_settings()
        
        self.validator_service.set_test_url(settings['testUrl'])
        self.validator_service.set_timeout(settings['validationTimeout'])
        
        self._schedule_validation(settings['validationInterval'])
        self._schedule_fetch(settings['fetchInterval'])
        
        print('调度器已启动')
    
    def stop(self):
        """停止调度器"""
        self._stop_event.set()
        schedule.clear()
        print('调度器已停止')
    
    async def restart(self):
        """重启调度器"""
        self.stop()
        await self.start()
    
    def _schedule_validation(self, interval_minutes: int):
        """安排验证任务"""
        def job():
            if not self._try_lock_validation():
                print('验证任务已在运行中，跳过本次定时触发')
                return
            
            import asyncio
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            loop.run_until_complete(self.run_validation())
        
        schedule.every(interval_minutes).minutes.do(job)
        print(f'验证调度已设置：每 {interval_minutes} 分钟')
    
    def _schedule_fetch(self, interval_minutes: int):
        """安排获取任务"""
        def job():
            if not self._try_lock_fetch():
                print('获取任务已在运行中，跳过本次定时触发')
                return
            
            import asyncio
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            loop.run_until_complete(self.run_fetch())
        
        schedule.every(interval_minutes).minutes.do(job)
        print(f'获取调度已设置：每 {interval_minutes} 分钟')
    
    def _try_lock_validation(self) -> bool:
        """尝试锁定验证任务"""
        if self.is_validating:
            return False
        self.is_validating = True
        return True
    
    async def run_validation(self, ids: Optional[list] = None):
        """运行验证任务"""
        try:
            from services.geoip_service import lookup_country
            
            all_proxies = await self.proxy_service.get_all_proxies()
            proxies = all_proxies
            if ids and len(ids) > 0:
                proxies = [p for p in all_proxies if p['id'] in ids]
            
            if not proxies:
                print('没有代理需要验证')
                return
            
            settings = await self.settings_service.get_settings()
            self.validator_service.set_test_url(settings['testUrl'])
            self.validator_service.set_timeout(settings['validationTimeout'])
            
            valid_count = 0
            
            def on_result(result):
                nonlocal valid_count
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(
                    self.proxy_service.update_proxy_validation(
                        result['proxyId'], result['isValid'], result.get('responseTime')
                    )
                )
                if result['isValid']:
                    valid_count += 1
                    proxy = next((p for p in proxies if p['id'] == result['proxyId']), None)
                    if proxy and not proxy.get('country'):
                        country = loop.run_until_complete(lookup_country(proxy['host']))
                        if country:
                            loop.run_until_complete(
                                self.proxy_service.update_proxy_country(result['proxyId'], country)
                            )
            
            self.validator_service.validate_proxies(
                proxies, settings['validationConcurrency'], on_result
            )
            
            print(f'验证完成：{valid_count}/{len(proxies)} 个代理有效')
        except Exception as e:
            print(f'验证失败：{e}')
        finally:
            self.is_validating = False
    
    def _try_lock_fetch(self) -> bool:
        """尝试锁定获取任务"""
        if self.is_fetching:
            return False
        self.is_fetching = True
        return True
    
    async def run_fetch(self):
        """运行获取任务"""
        try:
            settings = await self.settings_service.get_settings()
            if settings['clearInvalidOnFetch']:
                deleted = await self.proxy_service.delete_invalid_proxies()
                if deleted > 0:
                    print(f'已清除 {deleted} 个无效代理')
            
            result = await self.fetcher_service.fetch_from_all_sources()
            print(f"获取完成：从 {result['total']} 个来源添加了 {result['added']} 个代理，跳过 {result['duplicates']} 个重复")
        except Exception as e:
            print(f'获取失败：{e}')
        finally:
            self.is_fetching = False
    
    def run_scheduler(self):
        """运行调度器循环"""
        while not self._stop_event.is_set():
            schedule.run_pending()
            time.sleep(1)
