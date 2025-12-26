import {
  Controller,
  Post,
  Body,
  Logger,
  BadRequestException,
  Headers,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { ProcessWebhookDto } from '../payments/dto/process-webhook.dto';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  // ✅ WEBHOOK DE MERCADO PAGO (SIN AUTENTICACIÓN JWT)
  @Post('mercado-pago')
  async handleMercadoPagoWebhook(
    @Body() payload: ProcessWebhookDto,
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
  ) {
    try {
      this.logger.log(`📨 Webhook recibido de Mercado Pago: ${requestId}`);

      // 1. Validar firma del webhook
      const isValid = await this.webhooksService.validateWebhookSignature(
        payload,
        signature,
        requestId,
      );

      if (!isValid) {
        this.logger.error(`❌ Firma de webhook inválida: ${requestId}`);
        throw new BadRequestException('Firma de webhook no válida');
      }

      // 2. Procesar webhook según topic
      if (payload.topic === 'payment') {
        if (!payload.resource) {
          throw new BadRequestException('Resource no proporcionado en el webhook');
        }
        const paymentId = this.extractPaymentId(payload.resource);
        await this.webhooksService.processPaymentWebhook(paymentId);
      } else if (payload.topic === 'merchant_order') {
        if (!payload.resource) {
          throw new BadRequestException('Resource no proporcionado en el webhook');
        }
        const orderId = this.extractOrderId(payload.resource);
        await this.webhooksService.processMerchantOrderWebhook(orderId);
      }

      return {
        success: true,
        message: 'Webhook procesado exitosamente',
      };
    } catch (error) {
      this.logger.error(`❌ Error procesando webhook: ${error.message}`);
      throw error;
    }
  }

  // ✅ HEALTH CHECK PARA WEBHOOK
  @Post('mercado-pago/health')
  async webhookHealth() {
    return {
      success: true,
      message: 'Webhook endpoint está operativo',
      timestamp: new Date(),
    };
  }

  private extractPaymentId(resource: string): string {
    // Extrae ID del formato "/v1/payments/12345"
    const matches = resource.match(/\/payments\/(\d+)/);
    return matches ? matches[1] : resource;
  }

  private extractOrderId(resource: string): string {
    // Extrae ID del formato "/v1/merchant_orders/12345"
    const matches = resource.match(/\/merchant_orders\/(\d+)/);
    return matches ? matches[1] : resource;
  }

  // ✅ DEBUG: SIMULAR WEBHOOK (SOLO PARA TESTING)
  @Post('mercado-pago/debug/:paymentId')
  async debugWebhook(
    @Body() payload: any,
  ) {
    try {
      this.logger.log(`🔧 DEBUG: Simulando webhook para pago`);
      
      // El payload debe contener el paymentId de Mercado Pago
      if (!payload.mercadoPagoPaymentId) {
        throw new BadRequestException('Falta mercadoPagoPaymentId en el payload');
      }

      await this.webhooksService.processPaymentWebhook(payload.mercadoPagoPaymentId);
      
      return {
        success: true,
        message: 'Webhook simulado exitosamente',
        paymentId: payload.mercadoPagoPaymentId,
      };
    } catch (error) {
      this.logger.error(`❌ Error en debug webhook: ${error.message}`);
      throw error;
    }
  }
}
