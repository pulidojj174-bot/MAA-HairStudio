import {
  Controller,
  Post,
  Body,
  Logger,
  BadRequestException,
  Headers,
  Get,
  Param,
  ParseUUIDPipe,
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
      this.logger.debug(`📦 Payload: ${JSON.stringify(payload)}`);
      this.logger.debug(`🔐 Signature: ${signature}`);

      // 1. Validar firma del webhook
      const isValid = await this.webhooksService.validateWebhookSignature(
        payload,
        signature,
        requestId,
      );

      if (!isValid) {
        this.logger.error(`❌ Firma de webhook inválida: ${requestId}`);
        // ⚠️ En desarrollo, permitir webhook aunque falle la firma
        if (process.env.NODE_ENV !== 'development') {
          throw new BadRequestException('Firma de webhook no válida');
        }
      }

      // 2. Procesar webhook según topic
      const topic = payload.topic || payload.type;

      if (topic === 'payment') {
        const paymentId =
          payload.data?.id || this.extractPaymentId(payload.resource);

        if (!paymentId) {
          this.logger.error('❌ No se pudo extraer Payment ID del webhook');
          throw new BadRequestException('Payment ID no encontrado');
        }

        this.logger.log(`💳 Procesando webhook de pago: ${paymentId}`);
        await this.webhooksService.processPaymentWebhook(paymentId);
      } else if (topic === 'merchant_order') {
        const orderId =
          payload.data?.id || (payload.resource ? this.extractOrderId(payload.resource) : null);

        if (!orderId) {
          this.logger.error('❌ No se pudo extraer Order ID del webhook');
          throw new BadRequestException('Order ID no encontrado');
        }

        this.logger.log(`📦 Procesando webhook de merchant order: ${orderId}`);
        await this.webhooksService.processMerchantOrderWebhook(orderId);
      }

      this.logger.log(`✅ Webhook procesado exitosamente: ${requestId}`);

      return {
        success: true,
        message: 'Webhook procesado exitosamente',
        requestId,
      };
    } catch (error) {
      this.logger.error(`❌ Error procesando webhook: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
      throw error;
    }
  }

  // ✅ HEALTH CHECK PARA WEBHOOK
  @Post('mercado-pago/health')
  async webhookHealth() {
    this.logger.log('🏥 Health check webhook recibido');
    return {
      success: true,
      message: 'Webhook endpoint está operativo',
      timestamp: new Date(),
      ngrokUrl: process.env.WEBHOOK_URL,
      nodeEnv: process.env.NODE_ENV,
    };
  }

  // ✅ VERIFICAR ESTADO DE PAGO (Frontend lo usa para verificar después de pagar)
  @Get('mercado-pago/verify/:orderId')
  async verifyPaymentStatus(
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    try {
      this.logger.log(`🔍 Verificando estado de pago para orden: ${orderId}`);
      const result = await this.webhooksService.verifyPaymentStatus(orderId);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error verificando pago: ${error.message}`);
      throw error;
    }
  }

  // ✅ DEBUG: SIMULAR WEBHOOK (SOLO PARA TESTING)
  @Post('mercado-pago/debug')
  async debugWebhook(
    @Body() payload: any,
  ) {
    try {
      this.logger.log(`🔧 DEBUG: Webhook manual simulado`);
      this.logger.log(`📦 Payload: ${JSON.stringify(payload)}`);

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

  private extractPaymentId(resource: string | undefined): string | null {
    if (!resource) return null;
    const matches = resource.match(/\/payments\/(\d+)/);
    return matches ? matches[1] : resource;
  }

  private extractOrderId(resource: string | undefined): string | null {
    if (!resource) return null;
    const matches = resource.match(/\/merchant_orders\/(\d+)/);
    return matches ? matches[1] : resource;
  }
}
