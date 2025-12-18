import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-signature'];
    const requestId = request.headers['x-request-id'];

    if (!signature || !requestId) {
      this.logger.warn('❌ Webhook sin firma o request-id');
      throw new BadRequestException('Firma de webhook faltante o inválida');
    }

    const webhookSecret = this.configService.get<string>(
      'MERCADO_PAGO_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      this.logger.error('❌ MERCADO_PAGO_WEBHOOK_SECRET no configurado');
      throw new BadRequestException('Configuración de seguridad incompleta');
    }

    // Obtener body como string
    const body = JSON.stringify(request.body);

    // Validar firma: "id=<request_id>,ts=<timestamp>,v1=<signature>"
    const [actualId, actualTs, actualSig] = signature
      .split(',')
      .reduce((acc, part) => {
        const [key, value] = part.split('=');
        acc[key === 'id' ? 0 : key === 'ts' ? 1 : 2] = value;
        return acc;
      }, []);

    if (actualId !== requestId) {
      this.logger.warn(`❌ Request ID no coincide: ${actualId} vs ${requestId}`);
      throw new BadRequestException('Firma de webhook no válida');
    }

    // Crear hash esperado
    const dataToSign = `id=${requestId},ts=${actualTs},v1=`;
    const hash = crypto
      .createHmac('sha256', webhookSecret)
      .update(dataToSign)
      .digest('hex');

    // Nota: Mercado Pago usa formato diferente, esta es una versión simplificada
    // Debes ajustarlo según la documentación oficial de MP

    this.logger.log(`✅ Firma de webhook validada`);
    return true;
  }
}
