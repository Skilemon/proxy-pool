import { ProxyProtocol } from './types';
import { PORT_RANGE, SUPPORTED_PROTOCOLS } from './constants';
import { randomUUID } from 'crypto';

// 生成UUID
export function generateId(): string {
  return randomUUID();
}

// 验证IP地址或主机名格式（支持 IPv4、IPv6、域名）
export function isValidIP(ip: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  // IPv6（简化校验：包含冒号且长度合理）
  if (ip.includes(':')) {
    return /^[0-9a-fA-F:]{2,39}$/.test(ip);
  }

  // 主机名 / 域名（字母、数字、连字符、点号）
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
  return hostnameRegex.test(ip);
}

// 验证端口号
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= PORT_RANGE.MIN && port <= PORT_RANGE.MAX;
}

// 验证协议类型
export function isValidProtocol(protocol: string): protocol is ProxyProtocol {
  return SUPPORTED_PROTOCOLS.includes(protocol as any);
}

// 格式化代理为字符串
export function formatProxy(protocol: string, host: string, port: number): string {
  return `${protocol}://${host}:${port}`;
}

// 解析代理字符串
export function parseProxy(proxyStr: string): { protocol: string; host: string; port: number } | null {
  try {
    // 支持格式: protocol://host:port 或 host:port
    const withProtocol = /^(https?|socks[45]):\/\/([^:]+):(\d+)$/;
    const withoutProtocol = /^([^:]+):(\d+)$/;
    
    let match = proxyStr.match(withProtocol);
    if (match) {
      return {
        protocol: match[1],
        host: match[2],
        port: parseInt(match[3], 10),
      };
    }
    
    match = proxyStr.match(withoutProtocol);
    if (match) {
      return {
        protocol: 'http', // 默认协议
        host: match[1],
        port: parseInt(match[2], 10),
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

// 格式化时间戳
export function formatTimestamp(date: Date): string {
  return date.toISOString();
}

// 计算运行时间（秒）
export function getUptime(startTime: number): number {
  return Math.floor((Date.now() - startTime) / 1000);
}
