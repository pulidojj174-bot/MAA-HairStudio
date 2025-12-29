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

  // ✅ VALIDAR FIRMA DEL WEBHOOK - FORMATO CORRECTO DE MERCADO PAGO
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
        this.logger.warn(
          `⚠️ DESARROLLO: Validación de firma deshabilitada`,
        );
        return true;
      }

      if (!signature) {
        this.logger.error('❌ x-signature header no proporcionado');
        return false;
      }

      // ✅ PARSEAR FIRMA: "id=...,ts=...,v1=..."
      const signatureParts = signature.split(',');
      const signatureData: any = {};

      for (const part of signatureParts) {
        const [key, value] = part.split('=');
        if (key && value) {
          signatureData[key.trim()] = value.trim();
        }
      }

      const { id: signId, ts: timestamp, v1: receivedHash } = signatureData;

      if (!signId || !timestamp || !receivedHash) {
        this.logger.error(
          `❌ Firma incompleta. Recibida: ${signature}`,
        );
        return false;
      }

      // ✅ RECALCULAR HASH SEGÚN FORMATO DE MERCADO PAGO
      // Formato: id={id},ts={timestamp}
      const stringToSign = `id=${signId},ts=${timestamp}`;
      const expectedHash = crypto
        .createHmac('sha256', webhookSecret)
        .update(stringToSign)
        .digest('hex');

      const isValid = expectedHash === receivedHash;

      if (isValid) {
        this.logger.log(`✅ Firma validada correctamente`);
      } else {
        this.logger.warn(
          `⚠️ Firma NO coincide.\n  Esperada: ${expectedHash}\n  Recibida: ${receivedHash}`,
        );
      }

      return isValid;
    } catch (error) {
      this.logger.error(`❌ Error validando firma: ${error.message}`);
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
}
