import time
from flask import request, g


def request_logger(app):
    """请求日志中间件"""
    
    @app.before_request
    def before_request():
        g.start_time = time.time()
    
    @app.after_request
    def after_request(response):
        duration = int((time.time() - g.get('start_time', time.time())) * 1000)
        print(f'{time.strftime("%Y-%m-%dT%H:%M:%S")} {request.method} {request.path} {response.status_code} {duration}ms')
        return response


def error_handler(error):
    """错误处理中间件"""
    print(f'API 错误：{error}')
    
    from flask import jsonify
    status_code = getattr(error, 'status_code', 500)
    message = str(error) if hasattr(error, 'message') else '服务器内部错误'
    
    return jsonify({'success': False, 'error': message}), status_code


def not_found_handler(error):
    """404 错误处理"""
    from flask import jsonify
    return jsonify({'success': False, 'error': '接口不存在'}), 404
