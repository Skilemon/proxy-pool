from flask import Blueprint, request, jsonify
from middleware.auth import auth_middleware


def create_settings_routes(settings_service, scheduler_service, validator_service):
    """创建设置路由"""
    bp = Blueprint('settings', __name__)
    
    @bp.route('/defaults', methods=['GET'])
    @auth_middleware
    def get_defaults():
        defaults = settings_service.get_default_settings()
        return jsonify({'success': True, 'data': defaults})
    
    @bp.route('/', methods=['GET'])
    @auth_middleware
    async def get_settings():
        try:
            settings = await settings_service.get_settings()
            return jsonify({'success': True, 'data': settings})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/', methods=['PUT'])
    @auth_middleware
    async def update_settings():
        try:
            updates = request.get_json() or {}
            await settings_service.update_settings(updates)
            
            if 'testUrl' in updates:
                validator_service.set_test_url(updates['testUrl'])
            
            if 'validationTimeout' in updates:
                validator_service.set_timeout(int(updates['validationTimeout']))
            
            await scheduler_service.restart()
            
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    return bp
