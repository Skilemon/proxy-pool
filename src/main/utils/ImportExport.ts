import * as fs from 'fs/promises';
import * as path from 'path';
import { ProxyEntry } from '../../shared/types';
import { parseProxy } from '../../shared/utils';

export class ImportExport {
  /**
   * 从TXT文件导入代理
   * 格式：每行一个代理，支持 protocol://host:port 或 host:port
   */
  static async importFromTxt(filePath: string): Promise<Omit<ProxyEntry, 'id' | 'createdAt'>[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    
    const proxies: Omit<ProxyEntry, 'id' | 'createdAt'>[] = [];
    
    for (const line of lines) {
      const parsed = parseProxy(line.trim());
      if (parsed) {
        proxies.push({
          protocol: parsed.protocol as any,
          host: parsed.host,
          port: parsed.port,
          isValid: false,
        });
      }
    }
    
    return proxies;
  }

  /**
   * 从CSV文件导入代理
   * 格式：protocol,host,port,region
   * 第一行为表头（可选）
   */
  static async importFromCsv(filePath: string): Promise<Omit<ProxyEntry, 'id' | 'createdAt'>[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    
    const proxies: Omit<ProxyEntry, 'id' | 'createdAt'>[] = [];
    
    // 跳过表头（如果第一行包含"protocol"或"host"）
    let startIndex = 0;
    if (lines.length > 0 && (lines[0].toLowerCase().includes('protocol') || lines[0].toLowerCase().includes('host'))) {
      startIndex = 1;
    }
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        const protocol = parts[0];
        const host = parts[1];
        const port = parseInt(parts[2], 10);
        const region = parts[3] || undefined;
        
        if (protocol && host && !isNaN(port)) {
          proxies.push({
            protocol: protocol as any,
            host,
            port,
            region,
            isValid: false,
          });
        }
      }
    }
    
    return proxies;
  }

  /**
   * 根据文件扩展名自动选择导入方法
   */
  static async importProxies(filePath: string): Promise<Omit<ProxyEntry, 'id' | 'createdAt'>[]> {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.txt':
        return this.importFromTxt(filePath);
      case '.csv':
        return this.importFromCsv(filePath);
      default:
        throw new Error(`不支持的文件格式：${ext}。支持的格式：.txt, .csv`);
    }
  }

  /**
   * 导出代理到TXT文件
   * 格式：每行一个代理 protocol://host:port
   */
  static async exportToTxt(proxies: ProxyEntry[], filePath: string): Promise<void> {
    const lines = proxies.map(proxy => 
      `${proxy.protocol}://${proxy.host}:${proxy.port}`
    );
    
    await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
  }

  /**
   * 导出代理到CSV文件
   * 格式：protocol,host,port,status,responseTime,region
   */
  static async exportToCsv(proxies: ProxyEntry[], filePath: string): Promise<void> {
    const header = 'protocol,host,port,status,responseTime,region';
    const lines = proxies.map(proxy => {
      const status = proxy.isValid ? 'valid' : 'invalid';
      const responseTime = proxy.responseTime !== undefined ? proxy.responseTime.toString() : '';
      const region = proxy.region || '';
      return `${proxy.protocol},${proxy.host},${proxy.port},${status},${responseTime},${region}`;
    });
    
    const content = [header, ...lines].join('\n');
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * 导出代理为字符串（不写入文件）
   */
  static exportToString(proxies: ProxyEntry[], format: 'txt' | 'csv'): string {
    if (format === 'txt') {
      return proxies.map(proxy => 
        `${proxy.protocol}://${proxy.host}:${proxy.port}`
      ).join('\n');
    } else {
      const header = 'protocol,host,port,status,responseTime,region';
      const lines = proxies.map(proxy => {
        const status = proxy.isValid ? 'valid' : 'invalid';
        const responseTime = proxy.responseTime !== undefined ? proxy.responseTime.toString() : '';
        const region = proxy.region || '';
        return `${proxy.protocol},${proxy.host},${proxy.port},${status},${responseTime},${region}`;
      });
      return [header, ...lines].join('\n');
    }
  }
}
