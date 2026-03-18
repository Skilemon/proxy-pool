from flask import Blueprint, request, jsonify
from middleware.auth import auth_middleware
import jwt
import os
import asyncio
import time

JWT_SECRET = os.getenv('JWT_SECRET', 'proxypool-secret-key')
DEFAULT_PASSWORD = 'admin'


def create_auth_routes(settings_service):
    """创建认证路由"""
    bp = Blueprint('auth', __name__)
    
    @bp.route('/login', methods=['POST'])
    def login():
        data = request.get_json()
        password = data.get('password') if data else None
        
        if not password:
            return jsonify({'success': False, 'error': '请输入密码'}), 400
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        stored_password = loop.run_until_complete(settings_service.get_setting('adminPassword')) or DEFAULT_PASSWORD
        
        if password != stored_password:
            return jsonify({'success': False, 'error': '密码错误'}), 401
        
        token = jwt.encode({'role': 'admin', 'exp': time.time() + 86400}, JWT_SECRET, algorithm='HS256')
        
        return jsonify({'success': True, 'data': {'token': token}})
    
    @bp.route('/change-password', methods=['POST'])
    @auth_middleware
    def change_password():
        data = request.get_json()
        old_password = data.get('oldPassword') if data else None
        new_password = data.get('newPassword') if data else None
        
        if not old_password or not new_password:
            return jsonify({'success': False, 'error': '请填写旧密码和新密码'}), 400
        
        if len(new_password) < 4:
            return jsonify({'success': False, 'error': '新密码至少 4 位'}), 400
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        stored_password = loop.run_until_complete(settings_service.get_setting('adminPassword')) or DEFAULT_PASSWORD
        
        if old_password != stored_password:
            return jsonify({'success': False, 'error': '旧密码错误'}), 401
        
        loop.run_until_complete(settings_service.set_setting('adminPassword', new_password))
        return jsonify({'success': True})
    
    return bp
