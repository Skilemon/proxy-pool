import asyncio
from utils_async import async_route
from flask import Blueprint
from middleware.auth import auth_middleware


def create_stats_routes(proxy_service):
    """创建统计路由"""
    bp = Blueprint('stats', __name__)
    
    @bp.route('/', methods=['GET'])
    @auth_middleware
    @async_route
    async def get_stats():
        try:
            from flask import jsonify
            stats = await proxy_service.get_stats()
            return jsonify({'success': True, 'data': stats})
        except Exception as e:
            from flask import jsonify
            return jsonify({'success': False, 'error': str(e)}), 500
    
    return bp
