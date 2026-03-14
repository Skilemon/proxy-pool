import * as net from 'net';
import * as http from 'http';
import { SocksClient } from 'socks';
import { ProxyService } from './ProxyService';
import { ProxyEntry } from '../types';

// SOCKS5 认证方法
const NO_AUTH = 0x00;
const NO_ACCEPTABLE = 0xFF;

// SOCKS5 命令
const CMD_CONNECT = 0x01;

// SOCKS5 地址类型
const ATYP_IPV4 = 0x01;
const ATYP_DOMAIN = 0x03;
const ATYP_IPV6 = 0x04;

// SOCKS5 应答
const REP_SUCCESS = 0x00;
const REP_GENERAL_FAILURE = 0x01;
const REP_CMD_NOT_SUPPORTED = 0x07;

export class SocksServerService {
  private server: net.Server;
  private proxyService: ProxyService;
  private port: number;

  constructor(proxyService: ProxyService, port: number = 1080) {
    this.proxyService = proxyService;
    this.port = port;
    this.server = net.createServer((socket) => this.handleConnection(socket));
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, '0.0.0.0', () => {
        console.log(`SOCKS5 代理服务器运行在 0.0.0.0:${this.port}`);
        resolve();
      });
      this.server.once('error', reject);
    });
  }

  stop(): void {
    this.server.close();
  }

  private async handleConnection(socket: net.Socket): Promise<void> {
    socket.on('error', () => socket.destroy());

    try {
      // --- 握手阶段 ---
      const greeting = await this.readBytes(socket, 2);
      if (greeting[0] !== 0x05) {
        socket.destroy();
        return;
      }
      const nMethods = greeting[1];
      await this.readBytes(socket, nMethods); // 读取并忽略认证方法列表
      // 回复：使用无认证方式
      socket.write(Buffer.from([0x05, NO_AUTH]));

      // --- 请求阶段 ---
      const reqHeader = await this.readBytes(socket, 4);
      if (reqHeader[0] !== 0x05) { socket.destroy(); return; }
      if (reqHeader[1] !== CMD_CONNECT) {
        socket.write(Buffer.from([0x05, REP_CMD_NOT_SUPPORTED, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
        socket.destroy();
        return;
      }

      const atyp = reqHeader[3];
      let destHost: string;
      let destPort: number;

      if (atyp === ATYP_IPV4) {
        const addrBuf = await this.readBytes(socket, 4);
        destHost = Array.from(addrBuf).join('.');
      } else if (atyp === ATYP_DOMAIN) {
        const lenBuf = await this.readBytes(socket, 1);
        const domainBuf = await this.readBytes(socket, lenBuf[0]);
        destHost = domainBuf.toString('utf8');
      } else if (atyp === ATYP_IPV6) {
        const addrBuf = await this.readBytes(socket, 16);
        const parts: string[] = [];
        for (let i = 0; i < 16; i += 2) {
          parts.push(addrBuf.readUInt16BE(i).toString(16));
        }
        destHost = parts.join(':');
      } else {
        socket.write(Buffer.from([0x05, REP_GENERAL_FAILURE, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
        socket.destroy();
        return;
      }

      const portBuf = await this.readBytes(socket, 2);
      destPort = portBuf.readUInt16BE(0);

      // --- 从代理池获取上游代理 ---
      const upstream = await this.proxyService.getValidProxy();
      if (!upstream) {
        socket.write(Buffer.from([0x05, REP_GENERAL_FAILURE, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
        socket.destroy();
        return;
      }

      // --- 建立上游连接 ---
      try {
        await this.connectViaUpstream(socket, upstream, destHost, destPort);
      } catch {
        socket.write(Buffer.from([0x05, REP_GENERAL_FAILURE, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
        socket.destroy();
      }
    } catch {
      socket.destroy();
    }
  }

  private async connectViaUpstream(
    clientSocket: net.Socket,
    upstream: ProxyEntry,
    destHost: string,
    destPort: number
  ): Promise<void> {
    const proto = upstream.protocol;

    if (proto === 'socks4' || proto === 'socks5') {
      const socksType = proto === 'socks5' ? 5 : 4;
      const { socket: upstreamSocket } = await SocksClient.createConnection({
        proxy: {
          host: upstream.host,
          port: upstream.port,
          type: socksType as 4 | 5,
          ...(upstream.username && upstream.password
            ? { userId: upstream.username, password: upstream.password }
            : {})
        },
        command: 'connect',
        destination: { host: destHost, port: destPort }
      });
      this.pipeToClient(clientSocket, upstreamSocket);
    } else {
      // http / https 上游：使用 HTTP CONNECT 隧道
      await this.connectViaHttpProxy(clientSocket, upstream, destHost, destPort);
    }
  }

  private connectViaHttpProxy(
    clientSocket: net.Socket,
    upstream: ProxyEntry,
    destHost: string,
    destPort: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const authHeader = upstream.username && upstream.password
        ? `\r\nProxy-Authorization: Basic ${Buffer.from(`${upstream.username}:${upstream.password}`).toString('base64')}`
        : '';

      const upstreamSocket = net.createConnection(upstream.port, upstream.host, () => {
        upstreamSocket.write(
          `CONNECT ${destHost}:${destPort} HTTP/1.1\r\nHost: ${destHost}:${destPort}${authHeader}\r\n\r\n`
        );
      });

      upstreamSocket.once('error', reject);

      let buf = Buffer.alloc(0);
      const onData = (chunk: Buffer) => {
        buf = Buffer.concat([buf, chunk]);
        const headerEnd = buf.indexOf('\r\n\r\n');
        if (headerEnd === -1) return;

        upstreamSocket.removeListener('data', onData);
        const statusLine = buf.toString('ascii', 0, buf.indexOf('\r\n'));
        if (!statusLine.includes('200')) {
          upstreamSocket.destroy();
          reject(new Error(`HTTP 代理 CONNECT 失败: ${statusLine}`));
          return;
        }

        // 将 CONNECT 后的残余数据推回管道
        const leftover = buf.slice(headerEnd + 4);
        this.pipeToClient(clientSocket, upstreamSocket, leftover);
        resolve();
      };

      upstreamSocket.on('data', onData);
    });
  }

  private pipeToClient(clientSocket: net.Socket, upstreamSocket: net.Socket, leftover?: Buffer): void {
    // 告诉客户端连接已建立
    clientSocket.write(Buffer.from([0x05, REP_SUCCESS, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));

    if (leftover && leftover.length > 0) {
      clientSocket.write(leftover);
    }

    clientSocket.pipe(upstreamSocket);
    upstreamSocket.pipe(clientSocket);

    const cleanup = () => {
      clientSocket.destroy();
      upstreamSocket.destroy();
    };
    clientSocket.on('error', cleanup);
    upstreamSocket.on('error', cleanup);
    clientSocket.on('close', () => upstreamSocket.destroy());
    upstreamSocket.on('close', () => clientSocket.destroy());
  }

  private readBytes(socket: net.Socket, n: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let received = 0;

      const onData = (chunk: Buffer) => {
        chunks.push(chunk);
        received += chunk.length;
        if (received >= n) {
          socket.removeListener('data', onData);
          socket.removeListener('error', onError);
          socket.removeListener('close', onClose);
          const full = Buffer.concat(chunks);
          // 若读多了，把多余部分退回到 socket
          if (full.length > n) {
            socket.unshift(full.slice(n));
          }
          resolve(full.slice(0, n));
        }
      };

      const onError = (err: Error) => reject(err);
      const onClose = () => reject(new Error('socket closed'));

      socket.on('data', onData);
      socket.once('error', onError);
      socket.once('close', onClose);
    });
  }
}
