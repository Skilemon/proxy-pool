"""
ProxyPool Python Backend
代理池管理后端服务
"""
import os
import sys
import threading
import asyncio
from flask import Flask, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from database import init_database, close_database
from middleware import request_logger, error_handler, not_found_handler
from middleware.auth import auth_middleware
from routes.auth_routes import create_auth_routes
from routes.proxy_routes import create_proxy_routes
from routes.source_routes import create_source_routes
from routes.settings_routes import create_settings_routes
from routes.stats_routes import create_stats_routes
from routes.socks_account_routes import create_socks_account_routes
from services.proxy_service import ProxyService
from services.source_service import SourceService
from services.validator_service import ValidatorService
from services.fetcher_service import FetcherService
from services.settings_service import SettingsService
from services.scheduler_service import SchedulerService
from services.socks_account_service import SocksAccountService
from services.socks_server_service import SocksServerService


def create_app():
    """创建 Flask 应用"""
    app = Flask(__name__, static_folder='public')
    CORS(app)
    
    request_logger(app)
    app.register_error_handler(Exception, error_handler)
    app.register_error_handler(404, not_found_handler)
    
    proxy_service = ProxyService()
    source_service = SourceService()
    validator_service = ValidatorService()
    fetcher_service = FetcherService(proxy_service, source_service)
    settings_service = SettingsService()
    scheduler_service = SchedulerService(
        proxy_service, validator_service, fetcher_service, settings_service
    )
    socks_account_service = SocksAccountService()
    socks_port = int(os.getenv('SOCKS_PORT', '1080'))
    socks_server_service = SocksServerService(
        proxy_service, socks_account_service, settings_service, socks_port
    )
    
    app.register_blueprint(create_auth_routes(settings_service), url_prefix='/api/auth')
    app.register_blueprint(create_proxy_routes(proxy_service), url_prefix='/api/proxies')
    app.register_blueprint(create_source_routes(source_service, fetcher_service), url_prefix='/api/sources')
    app.register_blueprint(create_settings_routes(settings_service, scheduler_service, validator_service), url_prefix='/api/settings')
    app.register_blueprint(create_stats_routes(proxy_service), url_prefix='/api/stats')
    app.register_blueprint(create_socks_account_routes(socks_account_service), url_prefix='/api/socks-accounts')
    
    @app.route('/getProxies', methods=['GET'])
    def get_proxies():
        try:
            protocol = request.args.get('protocol')
            delay = request.args.get('delay', type=int)
            count = min(100, max(1, request.args.get('count', 1, type=int)))
            country = request.args.get('country')
            country_mode = 'exclude' if request.args.get('countryMode') == 'exclude' else 'include'
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                proxies = loop.run_until_complete(proxy_service.get_valid_proxy(
                    protocol, delay, count, country, country_mode
                ))
            finally:
                loop.close()
            
            if not proxies:
                from flask import jsonify
                return jsonify({'success': False, 'error': '没有可用的代理'}), 404
            
            data = []
            for proxy in proxies:
                auth = ''
                if proxy.get('username') and proxy.get('password'):
                    auth = f"{proxy['username']}:{proxy['password']}@"
                data.append({
                    'proxy': f"{proxy['protocol']}://{auth}{proxy['host']}:{proxy['port']}",
                    'protocol': proxy['protocol'],
                    'host': proxy['host'],
                    'port': proxy['port'],
                    'responseTime': proxy.get('responseTime')
                })
            
            from flask import jsonify
            return jsonify({'success': True, 'data': data})
        except Exception as e:
            from flask import jsonify
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/validate', methods=['POST'])
    @auth_middleware
    def validate_proxies():
        try:
            if scheduler_service.is_validating:
                from flask import jsonify, request
                return jsonify({'success': False, 'message': '验证任务已在运行中'})
            
            data = request.get_json() or {}
            ids = data.get('ids', [])
            
            scheduler_service.is_validating = True
            
            def run_validation():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(scheduler_service.run_validation(ids if ids else None))
            
            thread = threading.Thread(target=run_validation)
            thread.daemon = True
            thread.start()
            
            from flask import jsonify
            return jsonify({'success': True, 'message': '验证任务已启动'})
        except Exception as e:
            from flask import jsonify
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/api/fetch', methods=['POST'])
    @auth_middleware
    def fetch_proxies():
        try:
            if scheduler_service.is_fetching:
                from flask import jsonify
                return jsonify({'success': False, 'message': '获取任务已在运行中'})
            
            scheduler_service.is_fetching = True
            
            def run_fetch():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(scheduler_service.run_fetch())
            
            thread = threading.Thread(target=run_fetch)
            thread.daemon = True
            thread.start()
            
            from flask import jsonify
            return jsonify({'success': True, 'message': '获取任务已启动'})
        except Exception as e:
            from flask import jsonify
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_static(path):
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')
    
    @app.after_request
    def after_request(response):
        if request.path.startswith('/api'):
            print(f'{request.method} {request.path} {response.status_code}')
        return response
    
    app.proxy_service = proxy_service
    app.scheduler_service = scheduler_service
    app.socks_server_service = socks_server_service
    
    return app


def start_services():
    """启动服务"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    init_database()
    print('数据库初始化完成')
    
    loop.run_until_complete(app.scheduler_service.start())
    print('调度器启动完成')
    
    socks_thread = threading.Thread(target=lambda: loop.run_until_complete(app.socks_server_service.start()))
    socks_thread.daemon = True
    socks_thread.start()
    



from flask import request

app = create_app()


if __name__ == '__main__':
    port = int(os.getenv('PORT', '8416'))
    
    start_services()
    
    print(f'服务器运行在 http://localhost:{port}')
    
    try:
        app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
    except KeyboardInterrupt:
        print('\n正在关闭服务器...')
        app.scheduler_service.stop()
        app.socks_server_service.stop()
        close_database()
        print('服务器已关闭')
