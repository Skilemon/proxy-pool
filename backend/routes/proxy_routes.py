from flask import Blueprint, request, jsonify
from middleware.auth import auth_middleware


def create_proxy_routes(proxy_service):
    """创建代理路由"""
    bp = Blueprint('proxies', __name__)
    
    @bp.route('/countries', methods=['GET'])
    @auth_middleware
    async def get_countries():
        try:
            countries = await proxy_service.get_countries()
            return jsonify({'success': True, 'data': countries})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/', methods=['GET'])
    @auth_middleware
    async def get_proxies():
        try:
            page = int(request.args.get('page', 1))
            page_size = min(200, max(1, int(request.args.get('pageSize', 20))))
            protocol = request.args.get('protocol', 'all')
            status = request.args.get('status', 'all')
            max_response_time = request.args.get('maxResponseTime', type=int)
            country = request.args.get('country', 'all')
            
            result = await proxy_service.get_proxies_paged(
                page, page_size, protocol, status, max_response_time, country
            )
            
            return jsonify({'success': True, 'data': result['data'], 'total': result['total']})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/', methods=['POST'])
    @auth_middleware
    async def add_proxy():
        try:
            proxy = request.get_json()
            result = await proxy_service.add_proxy(proxy)
            return jsonify({'success': True, 'data': result})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/batch', methods=['POST'])
    @auth_middleware
    async def add_batch_proxies():
        try:
            data = request.get_json()
            proxies = data.get('proxies', [])
            result = await proxy_service.add_proxies(proxies)
            return jsonify({'success': True, 'data': result})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/import', methods=['POST'])
    @auth_middleware
    async def import_proxies():
        try:
            data = request.get_json()
            content = data.get('content', '')
            result = await proxy_service.import_from_text(content)
            return jsonify({
                'success': True,
                'data': {
                    'added': len(result['added']),
                    'duplicates': result['duplicates']
                }
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/export', methods=['GET'])
    @auth_middleware
    async def export_proxies():
        try:
            ids = request.args.get('ids', '').split(',') if request.args.get('ids') else None
            content = await proxy_service.export_to_text(ids)
            
            from flask import make_response
            response = make_response(content)
            response.headers['Content-Type'] = 'text/plain; charset=utf-8'
            response.headers['Content-Disposition'] = 'attachment; filename="proxies.txt"'
            return response
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/invalid', methods=['DELETE'])
    @auth_middleware
    async def delete_invalid():
        try:
            count = await proxy_service.delete_invalid_proxies()
            return jsonify({'success': True, 'data': {'count': count}})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/<proxy_id>', methods=['DELETE'])
    @auth_middleware
    async def delete_proxy(proxy_id):
        try:
            await proxy_service.delete_proxy(proxy_id)
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/', methods=['DELETE'])
    @auth_middleware
    async def delete_batch_proxies():
        try:
            data = request.get_json()
            ids = data.get('ids', [])
            await proxy_service.delete_proxies(ids)
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    return bp
