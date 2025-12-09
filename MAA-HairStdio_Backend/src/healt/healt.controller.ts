import { Controller, Get } from '@nestjs/common';
import { HealthService } from './healt.service';
import { HealthCheckResponse } from './healt.interface';


@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  getHealth(): HealthCheckResponse {
    return this.healthService.getHealth();
  }

  @Get('api/health')
  getApiHealth(): HealthCheckResponse {
    return this.healthService.getApiHealth();
  }

  @Get('health/ready')
  async getReadiness() {
    return this.healthService.checkReadiness();
  }

  @Get('health/live')
  getLiveness(): HealthCheckResponse {
    return this.healthService.checkLiveness();
  }
}
