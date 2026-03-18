from flask import Blueprint, request, jsonify
from middleware.auth import auth_middleware


def create_socks_account_routes(socks_account_service):
    """创建 SOCKS 账号路由"""
    bp = Blueprint('socks_accounts', __name__)
    
    @bp.route('/', methods=['GET'])
    @auth_middleware
    async def get_accounts():
        try:
            accounts = await socks_account_service.get_all()
            return jsonify({'success': True, 'data': accounts})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/', methods=['POST'])
    @auth_middleware
    async def create_account():
        try:
            data = request.get_json()
            username = data.get('username')
            password = data.get('password')
            mode = data.get('mode', 'rotate')
            
            if not username or not password or mode not in ['rotate', 'sticky']:
                return jsonify({'success': False, 'error': '参数无效'}), 400
            
            max_delay = data.get('maxDelay')
            if max_delay is not None and max_delay != '':
                max_delay = int(max_delay)
            else:
                max_delay = None
            
            country_filter = data.get('countryFilter')
            if country_filter:
                country_filter = str(country_filter).strip()
            else:
                country_filter = None
            
            country_filter_mode = data.get('countryFilterMode', 'include')
            if country_filter_mode not in ['include', 'exclude']:
                country_filter_mode = 'include'
            
            account = await socks_account_service.create(
                username, password, mode, max_delay, country_filter, country_filter_mode
            )
            return jsonify({'success': True, 'data': account})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/<account_id>', methods=['PUT'])
    @auth_middleware
    async def update_account(account_id):
        try:
            updates = request.get_json() or {}
            
            if 'mode' in updates and updates['mode'] not in ['rotate', 'sticky']:
                return jsonify({'success': False, 'error': '模式无效'}), 400
            
            if 'maxDelay' in updates:
                val = updates['maxDelay']
                updates['maxDelay'] = int(val) if val is not None and val != '' else None
            
            if 'countryFilter' in updates:
                val = updates['countryFilter']
                updates['countryFilter'] = str(val).strip() if val else None
            
            if 'countryFilterMode' in updates:
                mode = updates['countryFilterMode']
                updates['countryFilterMode'] = mode if mode in ['include', 'exclude'] else 'include'
            
            await socks_account_service.update(account_id, updates)
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/<account_id>', methods=['DELETE'])
    @auth_middleware
    async def delete_account(account_id):
        try:
            await socks_account_service.delete(account_id)
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    return bp
