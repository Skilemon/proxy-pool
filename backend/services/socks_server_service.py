import socket
import threading
import asyncio
from typing import Dict, Any


class SocksServerService:
    """SOCKS5 代理服务器服务"""
    
    def __init__(self, proxy_service, socks_account_service, settings_service, port: int = 1080):
        self.proxy_service = proxy_service
        self.socks_account_service = socks_account_service
        self.settings_service = settings_service
        self.port = port
        self.server_socket = None
        self.running = False
        self.sticky_map: Dict[str, Any] = {}
    
    async def start(self):
        """启动 SOCKS 服务器"""
        self.running = True
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.server_socket.bind(('0.0.0.0', self.port))
        self.server_socket.listen(50)
        
        print(f'[SOCKS5] 代理服务器运行在 0.0.0.0:{self.port}')
        
        while self.running:
            try:
                client_socket, addr = self.server_socket.accept()
                thread = threading.Thread(target=self._handle_connection, args=(client_socket, addr))
                thread.daemon = True
                thread.start()
            except Exception as e:
                if self.running:
                    print(f'SOCKS 服务器错误：{e}')
                break
    
    def stop(self):
        """停止 SOCKS 服务器"""
        self.running = False
        if self.server_socket:
            try:
                self.server_socket.close()
            except:
                pass
    
    def _handle_connection(self, client_socket, addr):
        """处理客户端连接"""
        print(f'[SOCKS5] 新连接 来自={addr[0]}:{addr[1]}')
        
        try:
            greeting = client_socket.recv(2)
            if not greeting or greeting[0] != 0x05:
                client_socket.close()
                return
            
            n_methods = greeting[1]
            methods = client_socket.recv(n_methods)
            
            if 0x02 not in methods:
                client_socket.sendall(bytes([0x05, 0xFF]))
                client_socket.close()
                return
            
            client_socket.sendall(bytes([0x05, 0x02]))
            
            auth_ver = client_socket.recv(1)
            if not auth_ver or auth_ver[0] != 0x01:
                client_socket.close()
                return
            
            u_len = client_socket.recv(1)[0]
            username = client_socket.recv(u_len).decode('utf-8')
            p_len = client_socket.recv(1)[0]
            password = client_socket.recv(p_len).decode('utf-8')
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            account = loop.run_until_complete(self.socks_account_service.get_by_username(username))
            
            if not account or account['password'] != password:
                client_socket.sendall(bytes([0x01, 0x01]))
                client_socket.close()
                return
            
            client_socket.sendall(bytes([0x01, 0x00]))
            print(f'[SOCKS5] 认证成功: 用户={username}')
            
            request_data = client_socket.recv(4)
            if not request_data or request_data[0] != 0x05 or request_data[1] != 0x01:
                client_socket.close()
                return
            
            atyp = request_data[3]
            
            if atyp == 0x01:
                dest_host_bytes = client_socket.recv(4)
                dest_host = '.'.join(str(b) for b in dest_host_bytes)
            elif atyp == 0x03:
                domain_len = client_socket.recv(1)[0]
                dest_host = client_socket.recv(domain_len).decode('utf-8')
            elif atyp == 0x04:
                dest_host_bytes = client_socket.recv(16)
                dest_host = ':'.join(f'{b:02x}' for b in dest_host_bytes)
            else:
                client_socket.close()
                return
            
            dest_port_bytes = client_socket.recv(2)
            dest_port = int.from_bytes(dest_port_bytes, 'big')
            
            loop.run_until_complete(self._connect_via_upstream(
                client_socket, username, account, dest_host, dest_port
            ))
            
        except Exception as e:
            print(f'[SOCKS5] 处理连接错误：{e}')
            try:
                client_socket.close()
            except:
                pass
    
    async def _connect_via_upstream(self, client_socket, username: str, account: Dict,
                                   dest_host: str, dest_port: int):
        """通过上游代理连接目标"""
        settings = await self.settings_service.get_settings()
        timeout_ms = settings.get('validationTimeout', 5000)
        
        tried = set()
        connected = False
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        while True:
            batch = await self.proxy_service.get_valid_proxy_candidates(
                max_response_time=account.get('maxDelay'),
                limit=10,
                exclude_ids=list(tried),
                country_filter=account.get('countryFilter'),
                country_filter_mode=account.get('countryFilterMode', 'include')
            )
            
            if not batch:
                break
            
            for upstream in batch:
                tried.add(upstream['id'])
                
                try:
                    print(f'[SOCKS5] 用户={username} 模式={account["mode"]} '
                          f'上游={upstream["protocol"]}://{upstream["host"]}:{upstream["port"]} '
                          f'目标={dest_host}:{dest_port}')
                    
                    remote = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    remote.settimeout(timeout_ms / 1000.0)
                    
                    remote.connect((upstream['host'], upstream['port']))
                    
                    client_socket.sendall(bytes([0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))
                    
                    if account['mode'] == 'sticky':
                        self.sticky_map[username] = upstream
                    
                    self._relay_data(client_socket, remote)
                    connected = True
                    break
                    
                except Exception as e:
                    print(f'[SOCKS5] 上游连接失败：{upstream["protocol"]}://{upstream["host"]}:{upstream["port"]} 错误={e}')
                    if account['mode'] == 'sticky':
                        self.sticky_map.pop(username, None)
                    try:
                        remote.close()
                    except:
                        pass
                    continue
            
            if connected:
                break
            if len(tried) >= 100:
                break
        
        if not connected:
            client_socket.sendall(bytes([0x05, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))
            client_socket.close()
    
    def _relay_data(self, client_socket, remote_socket):
        """中继数据"""
        def relay(src, dst):
            try:
                while True:
                    data = src.recv(4096)
                    if not data:
                        break
                    dst.sendall(data)
            except:
                pass
            finally:
                try:
                    src.close()
                except:
                    pass
                try:
                    dst.close()
                except:
                    pass
        
        t1 = threading.Thread(target=relay, args=(client_socket, remote_socket))
        t2 = threading.Thread(target=relay, args=(remote_socket, client_socket))
        t1.daemon = True
        t2.daemon = True
        t1.start()
        t2.start()
        t1.join()
        t2.join()
