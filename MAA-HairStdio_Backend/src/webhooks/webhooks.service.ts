import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from '../payments/payments.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  // ✅ VALIDAR FIRMA DEL WEBHOOK
  async validateWebhookSignature(
    payload: any,
    signature: string,
    requestId: string,
  ): Promise<boolean> {
    try {
      const webhookSecret = this.configService.get<string>(
        'MERCADO_PAGO_WEBHOOK_SECRET',
      );

      if (!webhookSecret) {
        this.logger.error('❌ MERCADO_PAGO_WEBHOOK_SECRET no configurado');
        return false;
      }

      // Nota: La validación exacta depende del formato que use Mercado Pago
      // Este es un ejemplo genérico

      // Crear hash del payload
      const payloadString = JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadString)
        .digest('hex');

      // Comparar firmas
      const isValid = signature === expectedSignature;

      if (isValid) {
        this.logger.log(`✅ Firma de webhook validada`);
      } else {
        this.logger.warn(`⚠️ Firma de webhook no coincide`);
      }

      return isValid;
    } catch (error) {
      this.logger.error(
        `❌ Error validando firma: ${error.message}`,
      );
      return false;
    }
  }

  // ✅ PROCESAR WEBHOOK DE PAGO
  async processPaymentWebhook(paymentId: string): Promise<void> {
    try {
      this.logger.log(`🔔 Procesando webhook de pago: ${paymentId}`);
      await this.paymentsService.processPaymentWebhook(paymentId);
    } catch (error) {
      this.logger.error(
        `❌ Error procesando webhook de pago: ${error.message}`,
      );
      throw error;
    }
  }

  // ✅ PROCESAR WEBHOOK DE MERCHANT ORDER
  async processMerchantOrderWebhook(orderId: string): Promise<void> {
    try {
      this.logger.log(
        `🔔 Procesando webhook de merchant order: ${orderId}`,
      );
      // TODO: Implementar lógica específica para merchant orders
    } catch (error) {
      this.logger.error(
        `❌ Error procesando webhook de merchant order: ${error.message}`,
      );
      throw error;
    }
  }
}
