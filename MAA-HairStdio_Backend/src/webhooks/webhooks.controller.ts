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
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // RUTAS ESPECÍFICAS PRIMERO (deben ir antes de las genéricas)
  // ═══════════════════════════════════════════════════════════════════════════

  // ✅ 1. HEALTH CHECK - Ruta más específica
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

  // ✅ 2. DEBUG - Simular webhook manualmente
  @Post('mercado-pago/debug')
  @HttpCode(HttpStatus.OK)
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

  // ✅ 3. VERIFICAR ESTADO DE PAGO - Ruta con parámetro
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RUTA GENÉRICA AL FINAL (captura todos los webhooks de MP)
  // ═══════════════════════════════════════════════════════════════════════════

  // ✅ 4. WEBHOOK PRINCIPAL DE MERCADO PAGO - Ruta genérica al final
  @Post('mercado-pago')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: false, whitelist: false, forbidNonWhitelisted: false }))
  async handleMercadoPagoWebhook(
    @Body() payload: any,
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
        this.logger.warn(`⚠️ Procesando webhook a pesar de firma inválida`);
      }

      // 2. Procesar webhook según topic, type o action
      const topic = payload.topic || payload.type;
      const action = payload.action;

      this.logger.log(`🔍 Analizando webhook - Topic: ${topic}, Action: ${action}`);

      // Detectar tipo de evento
      const isPaymentEvent = topic === 'payment' || 
                             (action && action.startsWith('payment.')) ||
                             topic?.includes('payment');
      
      const isMerchantOrderEvent = topic === 'merchant_order' || 
                                   topic?.includes('merchant_order') ||
                                   (action && action.startsWith('merchant_order.'));

      if (isPaymentEvent) {
        // Para payment: el ID está en data.id o en resource
        const paymentId = payload.data?.id || this.extractPaymentId(payload.resource);

        if (!paymentId) {
          this.logger.error('❌ No se pudo extraer Payment ID del webhook');
          return {
            success: false,
            message: 'Payment ID no encontrado en el payload',
            requestId,
          };
        }

        this.logger.log(`💳 Procesando webhook de pago (${action || topic}): ${paymentId}`);
        await this.webhooksService.processPaymentWebhook(paymentId);
        
      } else if (isMerchantOrderEvent) {
        // Para merchant_order: el ID puede estar en:
        // - payload.id (nuevo formato topic_merchant_order_wh)
        // - payload.data.id (formato antiguo)
        // - payload.resource (formato IPN antiguo)
        const merchantOrderId = payload.id || payload.data?.id || this.extractOrderId(payload.resource);

        if (!merchantOrderId) {
          this.logger.error('❌ No se pudo extraer Merchant Order ID del webhook');
          this.logger.debug(`📦 Payload keys: ${Object.keys(payload).join(', ')}`);
          return {
            success: false,
            message: 'Merchant Order ID no encontrado en el payload',
            requestId,
          };
        }

        this.logger.log(`📦 Procesando webhook de merchant order: ${merchantOrderId}`);
        await this.webhooksService.processMerchantOrderWebhook(String(merchantOrderId));
        
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
      // Siempre devolver 200 OK a Mercado Pago
      this.logger.error(`❌ Error procesando webhook: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
      
      return {
        success: false,
        message: `Error procesado: ${error.message}`,
        requestId,
        error: error.message,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════

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
