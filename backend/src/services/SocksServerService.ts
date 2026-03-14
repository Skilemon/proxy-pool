import * as net from 'net';
import { SocksClient } from 'socks';
import { ProxyService } from './ProxyService';
import { SocksAccountService } from './SocksAccountService';
import { SettingsService } from './SettingsService';
import { ProxyEntry } from '../types';

const USER_PASS_AUTH = 0x02;
const NO_ACCEPTABLE = 0xFF;
const CMD_CONNECT = 0x01;
const ATYP_IPV4 = 0x01;
const ATYP_DOMAIN = 0x03;
const ATYP_IPV6 = 0x04;
const REP_SUCCESS = 0x00;
const REP_GENERAL_FAILURE = 0x01;
const REP_CMD_NOT_SUPPORTED = 0x07;

/** 基于 Buffer 队列的可靠读取器，避免 unshift/事件竞争问题 */
class SocketReader {
  private buf: Buffer = Buffer.alloc(0);
  private waiters: Array<{ n: number; resolve: (b: Buffer) => void; reject: (e: Error) => void }> = [];
  private closed = false;

  constructor(private socket: net.Socket) {
    socket.on('data', (chunk: Buffer) => {
      this.buf = Buffer.concat([this.buf, chunk]);
      this.flush();
    });
    socket.on('error', (err) => this.fail(err));
    socket.on('close', () => this.fail(new Error('socket closed')));
    socket.on('end', () => this.fail(new Error('socket ended')));
    // 确保 socket 处于 flowing 模式
    socket.resume();
  }

  private flush() {
    while (this.waiters.length > 0 && this.buf.length >= this.waiters[0].n) {
      const { n, resolve } = this.waiters.shift()!;
      const slice = this.buf.slice(0, n);
      this.buf = this.buf.slice(n);
      resolve(slice);
    }
  }

  private fail(err: Error) {
    if (this.closed) return;
    this.closed = true;
    for (const w of this.waiters) w.reject(err);
    this.waiters = [];
  }

  read(n: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      if (this.closed) return reject(new Error('socket closed'));
      this.waiters.push({ n, resolve, reject });
      this.flush();
    });
  }
}

export class SocksServerService {
  private server: net.Server;
  private proxyService: ProxyService;
  private accountService: SocksAccountService;
  private settingsService: SettingsService;
  private port: number;
  private stickyMap = new Map<string, ProxyEntry>();

  constructor(proxyService: ProxyService, accountService: SocksAccountService, settingsService: SettingsService, port: number = 1080) {
    this.proxyService = proxyService;
    this.accountService = accountService;
    this.settingsService = settingsService;
    this.port = port;
    this.server = net.createServer((socket) => this.handleConnection(socket));
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, '0.0.0.0', () => {
        console.log(`[SOCKS5] 代理服务器运行在 0.0.0.0:${this.port}`);
        resolve();
      });
      this.server.once('error', reject);
    });
  }

  stop(): void {
    this.server.close();
  }

  private async handleConnection(socket: net.Socket): Promise<void> {
    console.log(`[SOCKS5] 新连接 来自=${socket.remoteAddress}:${socket.remotePort}`);
    const reader = new SocketReader(socket);
    socket.on('error', () => socket.destroy());

    try {
      // --- 握手 ---
      const greeting = await reader.read(2);
      if (greeting[0] !== 0x05) {
        console.log(`[SOCKS5] 非 SOCKS5 连接，丢弃`);
        socket.destroy(); return;
      }
      const nMethods = greeting[1];
      const methods = await reader.read(nMethods);
      const supportsUserPass = Array.from(methods).includes(USER_PASS_AUTH);
      if (!supportsUserPass) {
        socket.write(Buffer.from([0x05, NO_ACCEPTABLE]));
        socket.destroy(); return;
      }
      socket.write(Buffer.from([0x05, USER_PASS_AUTH]));

      // --- 用户名/密码认证 ---
      const authVer = await reader.read(1);
      if (authVer[0] !== 0x01) { socket.destroy(); return; }
      const ulen = (await reader.read(1))[0];
      const username = (await reader.read(ulen)).toString('utf8');
      const plen = (await reader.read(1))[0];
      const password = (await reader.read(plen)).toString('utf8');

      const account = await this.accountService.getByUsername(username);
      if (!account || account.password !== password) {
        console.log(`[SOCKS5] 认证失败: 用户名=${username} 来自=${socket.remoteAddress}`);
        socket.write(Buffer.from([0x01, 0x01]));
        socket.destroy(); return;
      }
      socket.write(Buffer.from([0x01, 0x00]));
      console.log(`[SOCKS5] 认证成功: 用户=${username}`);

      // --- SOCKS5 请求 ---
      const req = await reader.read(4);
      if (req[0] !== 0x05) { socket.destroy(); return; }
      const cmd = req[1];
      const atyp = req[3];

      if (cmd !== CMD_CONNECT) {
        socket.write(Buffer.from([0x05, REP_CMD_NOT_SUPPORTED, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
        socket.destroy(); return;
      }

      let destHost: string;
      if (atyp === ATYP_IPV4) {
        const b = await reader.read(4);
        destHost = Array.from(b).join('.');
      } else if (atyp === ATYP_DOMAIN) {
        const len = (await reader.read(1))[0];
        destHost = (await reader.read(len)).toString('utf8');
      } else if (atyp === ATYP_IPV6) {
        const b = await reader.read(16);
        const parts: string[] = [];
        for (let i = 0; i < 16; i += 2) parts.push(b.readUInt16BE(i).toString(16));
        destHost = parts.join(':');
      } else {
        socket.write(Buffer.from([0x05, REP_GENERAL_FAILURE, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
        socket.destroy(); return;
      }
      const portBuf = await reader.read(2);
      const destPort = portBuf.readUInt16BE(0);

      // --- 选择上游代理并重试 ---
      const candidates = await this.pickCandidates(username, account.mode);
      if (candidates.length === 0) {
        console.log(`[SOCKS5] 无可用代理: 用户=${username} 目标=${destHost}:${destPort}`);
        socket.write(Buffer.from([0x05, REP_GENERAL_FAILURE, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
        socket.destroy(); return;
      }

      const { validationTimeout } = await this.settingsService.getSettings();
      let connected = false;
      for (const upstream of candidates) {
        console.log(`[SOCKS5] 用户=${username} 模式=${account.mode} 上游=${upstream.protocol}://${upstream.host}:${upstream.port} 目标=${destHost}:${destPort}`);
        try {
          await this.connectViaUpstream(socket, reader, upstream, destHost, destPort, validationTimeout);
          if (account.mode === 'sticky') this.stickyMap.set(username, upstream);
          connected = true;
          break;
        } catch (err: any) {
          console.log(`[SOCKS5] 上游连接失败: 上游=${upstream.protocol}://${upstream.host}:${upstream.port} 错误=${err.message}，尝试下一个...`);
          if (account.mode === 'sticky') this.stickyMap.delete(username);
        }
      }

      if (!connected) {
        console.log(`[SOCKS5] 所有候选代理均失败: 用户=${username} 目标=${destHost}:${destPort}`);
        socket.write(Buffer.from([0x05, REP_GENERAL_FAILURE, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
        socket.destroy();
      }
    } catch (err: any) {
      socket.destroy();
    }
  }

  private async pickCandidates(username: string, mode: 'rotate' | 'sticky'): Promise<ProxyEntry[]> {
    if (mode === 'sticky') {
      const current = this.stickyMap.get(username);
      if (current) return [current];
    }
    return this.proxyService.getValidProxyCandidates(undefined, undefined, 5);
  }

  private async connectViaUpstream(
    clientSocket: net.Socket,
    reader: SocketReader,
    upstream: ProxyEntry,
    destHost: string,
    destPort: number,
    timeoutMs: number = 10000
  ): Promise<void> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`连接超时 (${timeoutMs}ms)`)), timeoutMs)
    );
    return Promise.race([this._doConnect(clientSocket, reader, upstream, destHost, destPort), timeout]);
  }

  private async _doConnect(
    clientSocket: net.Socket,
    reader: SocketReader,
    upstream: ProxyEntry,
    destHost: string,
    destPort: number
  ): Promise<void> {
    const proto = upstream.protocol;
    let upstreamSocket: net.Socket;

    if (proto === 'socks4' || proto === 'socks5') {
      const result = await SocksClient.createConnection({
        proxy: {
          host: upstream.host,
          port: upstream.port,
          type: (proto === 'socks5' ? 5 : 4) as 4 | 5,
          ...(upstream.username && upstream.password
            ? { userId: upstream.username, password: upstream.password }
            : {})
        },
        command: 'connect',
        destination: { host: destHost, port: destPort }
      });
      upstreamSocket = result.socket;
    } else {
      // HTTP/HTTPS 上游：发 CONNECT 隧道
      upstreamSocket = await new Promise<net.Socket>((resolve, reject) => {
        const s = net.createConnection({ host: upstream.host, port: upstream.port }, () => {
          const auth = upstream.username && upstream.password
            ? `Proxy-Authorization: Basic ${Buffer.from(`${upstream.username}:${upstream.password}`).toString('base64')}\r\n`
            : '';
          s.write(`CONNECT ${destHost}:${destPort} HTTP/1.1\r\nHost: ${destHost}:${destPort}\r\n${auth}\r\n`);
        });
        let resp = '';
        const onData = (chunk: Buffer) => {
          resp += chunk.toString();
          if (resp.includes('\r\n\r\n')) {
            s.removeListener('data', onData);
            if (/^HTTP\/1\.[01] 200/.test(resp)) resolve(s);
            else reject(new Error(`HTTP CONNECT 失败: ${resp.split('\r\n')[0]}`));
          }
        };
        s.on('data', onData);
        s.on('error', reject);
      });
    }

    // 告知客户端连接成功
    clientSocket.write(Buffer.from([0x05, REP_SUCCESS, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));

    // 将 reader 中已缓冲的数据先发给上游，再开始双向 pipe
    if (reader['buf'] && reader['buf'].length > 0) {
      upstreamSocket.write(reader['buf']);
      reader['buf'] = Buffer.alloc(0);
    }

    clientSocket.pipe(upstreamSocket);
    upstreamSocket.pipe(clientSocket);
    const cleanup = () => { clientSocket.destroy(); upstreamSocket.destroy(); };
    clientSocket.on('error', cleanup);
    upstreamSocket.on('error', cleanup);
    clientSocket.on('close', () => upstreamSocket.destroy());
    upstreamSocket.on('close', () => clientSocket.destroy());
  }
}
