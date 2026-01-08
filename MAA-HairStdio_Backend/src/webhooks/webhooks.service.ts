import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentsService } from '../payments/payments.service';
import { Payment } from '../payments/entities/payment.entity';
import { Order } from '../orders/orders.entity';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly configService: ConfigService,
  ) {}

  // ✅ VALIDAR FIRMA DEL WEBHOOK - FORMATO CORRECTO MERCADO PAGO v2
  async validateWebhookSignature(
    payload: any,
    signature: string,
    requestId: string,
  ): Promise<boolean> {
    try {
      const webhookSecret = this.configService.get<string>(
        'MERCADO_PAGO_WEBHOOK_SECRET',
      );
      const nodeEnv = this.configService.get<string>('NODE_ENV');

      if (!webhookSecret) {
        this.logger.error('❌ MERCADO_PAGO_WEBHOOK_SECRET no configurado');
        return false;
      }

      // ✅ EN DESARROLLO, BYPASS PARA TESTING
      if (nodeEnv === 'development') {
        this.logger.warn(`⚠️ DESARROLLO: Validación de firma deshabilitada`);
        return true;
      }

      if (!signature) {
        this.logger.error('❌ x-signature header no proporcionado');
        return false;
      }

      // ✅ PARSEAR FIRMA: "ts=...,v1=..."
      const signatureParts = signature.split(',');
      const signatureData: any = {};

      for (const part of signatureParts) {
        const [key, value] = part.split('=');
        if (key && value) {
          signatureData[key.trim()] = value.trim();
        }
      }

      const { ts: timestamp, v1: receivedHash } = signatureData;

      if (!timestamp || !receivedHash) {
        this.logger.error(
          `❌ Firma incompleta. Esperado: ts y v1. Recibida: ${signature}`,
        );
        return false;
      }

      // ✅ OBTENER data.id DEL PAYLOAD
      const dataId = payload.data?.id || payload.id;

      if (!dataId) {
        this.logger.warn(
          `⚠️ No se encontró data.id en el payload, usando solo timestamp`,
        );
      }

      // ✅ CONSTRUIR STRING A FIRMAR SEGÚN MERCADO PAGO
      // Template: id:[data.id];request-id:[x-request-id];ts:[ts];
      let stringToSign = '';
      if (dataId) {
        stringToSign = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
      } else {
        // Si no hay data.id, intentar con solo timestamp
        stringToSign = `request-id:${requestId};ts:${timestamp};`;
      }

      this.logger.debug(`🔍 String a firmar: ${stringToSign}`);
      this.logger.debug(`🔐 Secret: ${webhookSecret.substring(0, 10)}...`);

      // ✅ CALCULAR HMAC-SHA256
      const expectedHash = crypto
        .createHmac('sha256', webhookSecret)
        .update(stringToSign)
        .digest('hex');

      const isValid = expectedHash === receivedHash;

      if (isValid) {
        this.logger.log(
          `✅ Firma validada correctamente para data.id: ${dataId}`,
        );
      } else {
        this.logger.warn(
          `⚠️ Firma NO coincide.\n  Data ID: ${dataId}\n  Request ID: ${requestId}\n  TS: ${timestamp}\n  String: ${stringToSign}\n  Esperada: ${expectedHash}\n  Recibida: ${receivedHash}`,
        );
      }

      return isValid;
    } catch (error) {
      this.logger.error(`❌ Error validando firma: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);
      return false;
    }
  }

  // ✅ PROCESAR WEBHOOK DE PAGO - CON REINTENTOS
  async processPaymentWebhook(paymentId: string): Promise<void> {
    try {
      this.logger.log(`🔔 Procesando webhook de pago: ${paymentId}`);

      // Reintentar obtener datos con espera exponencial
      let lastError: Error = new Error('Failed to process payment webhook');
      const maxRetries = 3;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          this.logger.log(
            `🔄 Intento ${attempt}/${maxRetries} de procesar pago`,
          );
          await this.paymentsService.processPaymentWebhook(paymentId);
          return; // ✅ Éxito
        } catch (error) {
          lastError = error;
          this.logger.warn(
            `⚠️ Intento ${attempt} falló: ${error.message}`,
          );

          if (attempt < maxRetries) {
            // Espera exponencial: 1s, 2s, 4s
            const delayMs = Math.pow(2, attempt - 1) * 1000;
            this.logger.log(
              `⏳ Esperando ${delayMs}ms antes de reintentar...`,
            );
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }

      // ❌ Falló después de todos los reintentos
      this.logger.error(
        `❌ Falló procesar pago después de ${maxRetries} intentos`,
      );
      throw lastError;
    } catch (error) {
      this.logger.error(`❌ Error procesando webhook de pago: ${error.message}`);
      throw error;
    }
  }

  // ✅ PROCESAR WEBHOOK DE MERCHANT ORDER
  async processMerchantOrderWebhook(orderId: string): Promise<void> {
    try {
      this.logger.log(`🔔 Procesando webhook de merchant order: ${orderId}`);
      // TODO: Implementar lógica específica para merchant orders
    } catch (error) {
      this.logger.error(
        `❌ Error procesando webhook de merchant order: ${error.message}`,
      );
      throw error;
    }
  }

  // ✅ VERIFICAR ESTADO DE PAGO (Para que el frontend verifique después de pagar)
  async verifyPaymentStatus(orderId: string): Promise<any> {
    try {
      this.logger.log(`🔍 Verificando estado de pago para orden: ${orderId}`);

      // Buscar el pago por order ID
      const payment = await this.paymentsService.findPaymentByOrderId(orderId);

      if (!payment) {
        this.logger.warn(`⚠️ No hay pago para la orden: ${orderId}`);
        return {
          success: false,
          message: 'No se encontró pago para esta orden',
          status: 'not_found',
          paymentStatus: null,
        };
      }

      this.logger.log(`✅ Pago encontrado para orden ${orderId}: ${payment.status}`);

      return {
        success: true,
        message: 'Estado de pago obtenido',
        status: payment.status,
        paymentStatus: payment.status,
        paymentId: payment.id,
        orderId: orderId,
        amount: payment.amount,
        currency: payment.currency,
        webhookProcessed: payment.webhookProcessed,
        approvedAt: payment.approvedAt,
        data: payment,
      };
    } catch (error) {
      this.logger.error(`❌ Error verificando estado: ${error.message}`);
      throw error;
    }
  }
}
