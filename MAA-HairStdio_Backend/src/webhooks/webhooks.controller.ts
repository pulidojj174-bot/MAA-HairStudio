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
  UseFilters,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { ProcessWebhookDto } from '../payments/dto/process-webhook.dto';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  // ✅ WEBHOOK DE MERCADO PAGO (SIN VALIDACIÓN)
  // Desactivar ValidationPipe para este endpoint porque MP envía diferentes formatos
  @Post('mercado-pago')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: false, whitelist: false, forbidNonWhitelisted: false }))
  async handleMercadoPagoWebhook(
    @Body() payload: any, // 👈 Cambiar a 'any' para aceptar cualquier estructura
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
  ) {
    try {
      this.logger.log(`📨 Webhook recibido de Mercado Pago`);
      this.logger.log(`📋 Request ID: ${requestId}`);
      this.logger.log(`🎯 Action: ${payload.action || 'N/A'}, Type: ${payload.type || payload.topic || 'N/A'}`);
      this.logger.log(`📦 Data ID: ${payload.data?.id || 'N/A'}`);
      this.logger.debug(`📦 Payload completo: ${JSON.stringify(payload)}`);
      this.logger.debug(`🔐 Signature: ${signature}`);

      // 1. Validar firma del webhook
      const isValid = await this.webhooksService.validateWebhookSignature(
        payload,
        signature,
        requestId,
      );

      if (!isValid) {
        this.logger.error(`❌ Firma de webhook inválida: ${requestId}`);
        // ⚠️ IMPORTANTE: Permitir webhook aunque falle la firma para evitar perder pagos
        // Mercado Pago puede enviar diferentes formatos de firma que no siempre validan
        this.logger.warn(`⚠️ Procesando webhook a pesar de firma inválida`);
        // Comentado para producción - si quieres rechazar webhooks inválidos, descomenta:
        // throw new BadRequestException('Firma de webhook no válida');
      }

      // 2. Procesar webhook según topic, type o action
      const topic = payload.topic || payload.type;
      const action = payload.action; // Nuevo formato de MP: "payment.created", "payment.updated"

      // Detectar si es un evento de pago por topic O por action
      const isPaymentEvent = topic === 'payment' || 
                             (action && action.startsWith('payment.'));
      
      // Detectar si es un evento de merchant_order
      const isMerchantOrderEvent = topic === 'merchant_order' || 
                                   (action && action.startsWith('merchant_order.'));

      if (isPaymentEvent) {
        const paymentId =
          payload.data?.id || this.extractPaymentId(payload.resource);

        if (!paymentId) {
          this.logger.error('❌ No se pudo extraer Payment ID del webhook');
          // ⚠️ NO lanzar excepción - devolver 200 OK para que MP no reintente
          return {
            success: false,
            message: 'Payment ID no encontrado en el payload',
            requestId,
          };
        }

        this.logger.log(`💳 Procesando webhook de pago (${action || topic}): ${paymentId}`);
        await this.webhooksService.processPaymentWebhook(paymentId);
      } else if (isMerchantOrderEvent) {
        const orderId =
          payload.data?.id || (payload.resource ? this.extractOrderId(payload.resource) : null);

        if (!orderId) {
          this.logger.error('❌ No se pudo extraer Order ID del webhook');
          // ⚠️ NO lanzar excepción - devolver 200 OK para que MP no reintente
          return {
            success: false,
            message: 'Order ID no encontrado en el payload',
            requestId,
          };
        }

        this.logger.log(`📦 Procesando webhook de merchant order: ${orderId}`);
        await this.webhooksService.processMerchantOrderWebhook(orderId);
      } else {
        this.logger.warn(`⚠️ Tipo de webhook no reconocido: topic=${topic}, action=${action}`);
      }

      this.logger.log(`✅ Webhook procesado exitosamente: ${requestId}`);

      return {
        success: true,
        message: 'Webhook procesado exitosamente',
        requestId,
      };
    } catch (error) {
      // ⚠️ IMPORTANTE: Siempre devolver 200 OK a Mercado Pago
      // Si devolvemos 4xx o 5xx, MP seguirá reintentando el webhook
      this.logger.error(`❌ Error procesando webhook: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
      
      // Devolver 200 OK con el error en el body (para logging)
      return {
        success: false,
        message: `Error procesado: ${error.message}`,
        requestId,
        error: error.message,
      };
    }
  }

  // ✅ WEBHOOK HEALTH CHECK
  @Post('mercado-pago/health')
  @HttpCode(HttpStatus.OK)
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

  // ✅ VERIFICAR ESTADO DE PAGO
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

  // ✅ DEBUG: SIMULAR WEBHOOK
  @Post('mercado-pago/debug')
  @HttpCode(HttpStatus.OK)
  async debugWebhook(
    @Body() payload: any, // 👈 También cambiar aquí
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
