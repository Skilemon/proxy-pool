import { ProxyEntry, ProxyProtocol } from '../../shared/types';
import { isValidIP, isValidPort, isValidProtocol } from '../../shared/utils';

export interface ValidationError {
  field: string;
  message: string;
}

export class ProxyValidator {
  /**
   * 验证代理条目
   */
  static validate(proxy: Omit<ProxyEntry, 'id' | 'createdAt'>): ValidationError[] {
    const errors: ValidationError[] = [];

    // 验证协议
    if (!proxy.protocol) {
      errors.push({
        field: 'protocol',
        message: '协议类型不能为空',
      });
    } else if (!isValidProtocol(proxy.protocol)) {
      errors.push({
        field: 'protocol',
        message: `不支持的协议类型：${proxy.protocol}。支持的协议：http, https, socks4, socks5`,
      });
    }

    // 验证IP地址
    if (!proxy.host) {
      errors.push({
        field: 'host',
        message: 'IP地址不能为空',
      });
    } else if (!isValidIP(proxy.host)) {
      errors.push({
        field: 'host',
        message: `主机地址格式不正确：${proxy.host}。请输入有效的 IPv4、IPv6 地址或域名`,
      });
    }

    // 验证端口号
    if (proxy.port === undefined || proxy.port === null) {
      errors.push({
        field: 'port',
        message: '端口号不能为空',
      });
    } else if (!isValidPort(proxy.port)) {
      errors.push({
        field: 'port',
        message: `端口号超出范围：${proxy.port}。端口号必须在1-65535之间`,
      });
    }

    // 验证响应时间（如果提供）
    if (proxy.responseTime !== undefined && proxy.responseTime < 0) {
      errors.push({
        field: 'responseTime',
        message: '响应时间不能为负数',
      });
    }

    return errors;
  }

  /**
   * 验证并抛出错误
   */
  static validateAndThrow(proxy: Omit<ProxyEntry, 'id' | 'createdAt'>): void {
    const errors = this.validate(proxy);
    if (errors.length > 0) {
      const errorMessages = errors.map(e => `${e.field}: ${e.message}`).join('; ');
      throw new Error(`代理验证失败：${errorMessages}`);
    }
  }

  /**
   * 检查代理是否有效（已通过验证）
   */
  static isValid(proxy: Omit<ProxyEntry, 'id' | 'createdAt'>): boolean {
    return this.validate(proxy).length === 0;
  }

  /**
   * 批量验证代理
   */
  static validateBatch(proxies: Omit<ProxyEntry, 'id' | 'createdAt'>[]): Map<number, ValidationError[]> {
    const errorMap = new Map<number, ValidationError[]>();
    
    proxies.forEach((proxy, index) => {
      const errors = this.validate(proxy);
      if (errors.length > 0) {
        errorMap.set(index, errors);
      }
    });

    return errorMap;
  }
}
