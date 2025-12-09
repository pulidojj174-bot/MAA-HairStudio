import { Injectable } from '@nestjs/common';
import { HealthCheckResponse } from './healt.interface';

@Injectable()
export class HealthService {
  private readonly startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  getHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      environment: process.env.NODE_ENV || 'development',
      service: 'maa-hair-studio-backend',
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  getApiHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      environment: process.env.NODE_ENV || 'development',
      service: 'maa-hair-studio-api',
      version: process.env.npm_package_version || '1.0.0',
      api: {
        version: 'v1',
        endpoints: [
          '/api/v1/auth',
          '/api/v1/users',
          '/api/v1/products',
          '/api/v1/categories',
          '/api/v1/orders',
          '/api/v1/cart',
          '/api/v1/wishlist',
        ],
      },
    };
  }

  async checkReadiness(): Promise<HealthCheckResponse> {
    // Aquí puedes agregar checks de dependencias
    // Por ejemplo: verificar conexión a base de datos
    const isReady = await this.checkDependencies();

    return {
      status: isReady ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      environment: process.env.NODE_ENV || 'development',
      ready: isReady,
      checks: {
        database: 'ok', // Implementar check real
        memory: this.checkMemory(),
      },
    };
  }

  checkLiveness(): HealthCheckResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      alive: true,
    };
  }

  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  private async checkDependencies(): Promise<boolean> {
    // TODO: Implementar checks reales de dependencias
    // Por ejemplo: verificar conexión a PostgreSQL
    return true;
  }

  private checkMemory(): string {
    const used = process.memoryUsage();
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
    
    return `${heapUsedMB}MB / ${heapTotalMB}MB`;
  }
}
