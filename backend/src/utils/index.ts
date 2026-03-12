import { randomBytes } from 'crypto';

export function generateId(): string {
  return randomBytes(16).toString('hex');
}

export function parseProxyUrl(url: string): { protocol: string; host: string; port: number; username?: string; password?: string } | null {
  try {
    const regex = /^(https?|socks[45]):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/;
    const match = url.match(regex);

    if (!match) return null;

    return {
      protocol: match[1],
      username: match[2],
      password: match[3],
      host: match[4],
      port: parseInt(match[5], 10)
    };
  } catch {
    return null;
  }
}

export function formatProxyUrl(proxy: { protocol: string; host: string; port: number; username?: string; password?: string }): string {
  const auth = proxy.username && proxy.password ? `${proxy.username}:${proxy.password}@` : '';
  return `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isValidIp(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  if (ipv4Regex.test(ip)) {
    return ip.split('.').every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  return ipv6Regex.test(ip);
}

export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port > 0 && port <= 65535;
}
