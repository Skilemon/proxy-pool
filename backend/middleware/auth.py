import jwt
import os
from functools import wraps
from flask import request, jsonify

JWT_SECRET = os.getenv('JWT_SECRET', 'proxypool-secret-key')


def auth_middleware(f):
    """认证中间件"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        token = None
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header[7:]
        
        if not token:
            return jsonify({'success': False, 'error': '未授权，请先登录'}), 401
        
        try:
            jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            return f(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'error': 'token 已过期，请重新登录'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': 'token 无效，请重新登录'}), 401
    
    return decorated
