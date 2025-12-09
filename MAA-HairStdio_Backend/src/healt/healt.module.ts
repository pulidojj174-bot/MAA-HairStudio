import { Module } from '@nestjs/common';
import { HealthController } from './healt.controller';
import { HealthService } from './healt.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
