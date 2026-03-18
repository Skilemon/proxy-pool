from flask import Blueprint, request, jsonify
from middleware.auth import auth_middleware


def create_source_routes(source_service, fetcher_service):
    """创建代理源路由"""
    bp = Blueprint('sources', __name__)
    
    @bp.route('/', methods=['GET'])
    @auth_middleware
    async def get_sources():
        try:
            sources = await source_service.get_all_sources()
            return jsonify({'success': True, 'data': sources})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/', methods=['POST'])
    @auth_middleware
    async def add_source():
        try:
            source = request.get_json()
            result = await source_service.add_source(source)
            return jsonify({'success': True, 'data': result})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/<source_id>', methods=['PUT'])
    @auth_middleware
    async def update_source(source_id):
        try:
            updates = request.get_json()
            await source_service.update_source(source_id, updates)
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/<source_id>', methods=['DELETE'])
    @auth_middleware
    async def delete_source(source_id):
        try:
            await source_service.delete_source(source_id)
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/<source_id>/fetch', methods=['POST'])
    @auth_middleware
    def fetch_from_source(source_id):
        try:
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(fetcher_service.fetch_from_source(source_id))
            return jsonify({'success': True, 'data': {'message': '已开始在后台获取'}})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    @bp.route('/fetch-all', methods=['POST'])
    @auth_middleware
    def fetch_all_sources():
        try:
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(fetcher_service.fetch_from_all_sources())
            return jsonify({'success': True, 'data': {'message': '已开始在后台获取全部来源'}})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    return bp
