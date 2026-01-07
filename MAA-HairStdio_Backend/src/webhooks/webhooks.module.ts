import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { PaymentsModule } from '../payments/payments.module';
import { Payment } from '../payments/entities/payment.entity';
import { Order } from '../orders/orders.entity';

@Module({
  imports: [
    forwardRef(() => PaymentsModule),
    TypeOrmModule.forFeature([Payment, Order]),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
