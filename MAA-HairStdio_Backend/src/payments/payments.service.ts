import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentMethodEnum } from './entities/payment.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Order, OrderStatus } from '../orders/orders.entity';
import { CreatePaymentDto, PaymentResponseDto } from './dto/create-payment.dto';
import { MercadoPagoPreferenceItem } from './interfaces/mercado-pago.interface';
import {
  MercadoPagoConfig,
  Preference,
  Payment as MPPayment,
} from 'mercadopago';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private mercadoPagoClient: MercadoPagoConfig;
  private accessToken: string;
  private publicKey: string;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly configService: ConfigService,
  ) {
    this.accessToken =
      this.configService.get<string>('MERCADO_PAGO_ACCESS_TOKEN') || '';
    this.publicKey =
      this.configService.get<string>('MERCADO_PAGO_PUBLIC_KEY') || '';

    if (!this.accessToken || !this.publicKey) {
      this.logger.error('❌ Variables de Mercado Pago no configuradas en .env');
    } else {
      // ✅ Inicializar el cliente de Mercado Pago
      this.mercadoPagoClient = new MercadoPagoConfig({
        accessToken: this.accessToken,
        options: {
          timeout: 5000,
          idempotencyKey: 'unique_key',
        },
      });
      this.logger.log('✅ Cliente de Mercado Pago inicializado correctamente');
    }
  }

  // ✅ CREAR PREFERENCE DE PAGO
  async createPaymentPreference(
    createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    try {
      // 1. Obtener orden
      const order = await this.orderRepository.findOne({
        where: { id: createPaymentDto.orderId },
        relations: ['items', 'items.product', 'user', 'user.addresses'],
      });

      if (!order) {
        throw new NotFoundException('Orden no encontrada');
      }

      // 2. Validar que la orden está lista para pagar
      if (order.total <= 0) {
        throw new BadRequestException('El total de la orden es inválido');
      }

      // 3. Generar idempotency key
      const idempotencyKey = `mp-${order.id}-${Date.now()}`;

      // 4. Preparar items para Mercado Pago
      const items = order.items.map((item) => ({
        title: item.productName,
        quantity: item.quantity,
        unit_price: Math.round(Number(item.unitPrice)),
        description: `${item.productBrand || ''} - ${item.productVolume || ''}`,
        picture_url: item.productImage || '',
        category_id: 'beauty', // ✅ Categoría para productos de belleza/cuidado del cabello
      }));

      // 6. Construir preference
      const preference: MercadoPagoPreference = {
        items,
        payer: {
          name: order.user.name,
          email: order.user.email,
          phone:
            order.user.addresses &&
            order.user.addresses.length > 0 &&
            order.user.addresses[0].phone
              ? {
                  number: order.user.addresses[0].phone,
                }
              : undefined,
        },
        back_urls: {
          success: `https://www.maahairstudio.com/payment/success?order_id=${order.id}`,
          failure: `https://www.maahairstudio.com/payment/failure?order_id=${order.id}`,
          pending: `https://www.maahairstudio.com/payment/pending?order_id=${order.id}`,
        },
        /* back_urls: {
          success: `${this.configService.get<string>('FRONTEND_URL')}/order/${order.id}/success?order_id=${order.id}`,
          failure: `${this.configService.get<string>('FRONTEND_URL')}/order/${order.id}/failure?order_id=${order.id}`,
          pending: `${this.configService.get<string>('FRONTEND_URL')}/order/${order.id}/pending?order_id=${order.id}`,
        }, */
        // ❌ ELIMINAR: auto_return: 'approved' as any,
        external_reference: order.id,
        notification_url: `${this.configService.get<string>('API_URL')}/api/v1/webhooks/mercado-pago`,
        metadata: {
          order_id: order.id,
          order_number: order.orderNumber,
          user_id: order.user.id,
          created_at: new Date().toISOString(),
        },
      };

      this.logger.log(`📦 Creando preference para orden: ${order.orderNumber}`);

      // 7. Llamar a Mercado Pago API (usando axios o el SDK)
      const preferenceResponse = await this.createMercadoPagoPreference(
        preference,
        idempotencyKey,
      );

      // 8. Guardar registro de pago
      const payment = this.paymentRepository.create({
        order,
        user: order.user,
        mercadoPagoPaymentId: preferenceResponse.id,
        idempotencyKey,
        amount: order.total,
        currency: 'ARS',
        paymentMethod: PaymentMethodEnum.OTHER,
        status: 'pending',
        mercadoPagoMetadata: preferenceResponse,
        notes: createPaymentDto.notes,
      });

      await this.paymentRepository.save(payment);

      // ✅ ACTUALIZAR LA ORDEN CON EL ID DEL PAGO
      order.mercadoPagoPaymentId = preferenceResponse.id;
      await this.orderRepository.save(order);

      this.logger.log(
        `✅ Preference creada: ${preferenceResponse.id} para orden ${order.orderNumber}`,
      );

      return {
        success: true,
        message: 'Preference de pago creada exitosamente',
        data: {
          paymentId: payment.id,
          preferenceId: preferenceResponse.id,
          initPoint: preferenceResponse.init_point,
          sandboxInitPoint: preferenceResponse.init_point,
          orderId: order.id,
          amount: order.total,
          currency: 'ARS',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        },
      };
    } catch (error) {
      this.logger.error(`❌ Error al crear preference: ${error.message}`);
      throw error;
    }
  }

  // ✅ PROCESAR WEBHOOK DE MERCADO PAGO
  async processPaymentWebhook(mercadoPagoPaymentId: string): Promise<void> {
    try {
      this.logger.log(
        `🔔 Procesando webhook para pago MP: ${mercadoPagoPaymentId}`,
      );

      // 1. Obtener datos del pago desde Mercado Pago
      const paymentData =
        await this.getMercadoPagoPaymentData(mercadoPagoPaymentId);

      if (!paymentData) {
        throw new NotFoundException('Pago no encontrado en Mercado Pago');
      }

      this.logger.log(
        `📋 Datos de MP - Status: ${paymentData.status}, External Ref: ${paymentData.external_reference}`,
      );

      // 2. Buscar registro de pago local por external_reference (orderId)
      // El external_reference es el orderId que enviamos cuando creamos la preference
      let payment = await this.paymentRepository.findOne({
        where: { order: { id: paymentData.external_reference } },
        relations: ['order', 'user'],
      });

      // Si no encuentra por order, intentar buscar por mercadoPagoPaymentId (preference id)
      if (!payment) {
        payment = await this.paymentRepository.findOne({
          where: { mercadoPagoPaymentId },
          relations: ['order', 'user'],
        });
      }

      if (!payment) {
        this.logger.warn(
          `⚠️ Pago no encontrado localmente para order: ${paymentData.external_reference} ni MP ID: ${mercadoPagoPaymentId}`,
        );
        return;
      }

      // ✅ Actualizar el mercadoPagoPaymentId con el ID real del pago (no el de la preference)
      if (payment.mercadoPagoPaymentId !== mercadoPagoPaymentId) {
        this.logger.log(
          `🔄 Actualizando mercadoPagoPaymentId: ${payment.mercadoPagoPaymentId} → ${mercadoPagoPaymentId}`,
        );
        payment.mercadoPagoPaymentId = mercadoPagoPaymentId;
      }

      // 3. Validar idempotencia (ya fue procesado)
      if (payment.webhookProcessed) {
        this.logger.warn(
          `⚠️ Webhook ya procesado para pago: ${mercadoPagoPaymentId}`,
        );
        return;
      }

      // 4. Actualizar información del pago
      payment.status = paymentData.status;
      payment.statusDetail = paymentData.status_detail;
      payment.webhookReceivedAt = new Date();
      payment.paymentMethod = this.mapPaymentMethod(
        paymentData.payment_method_id,
      );
      payment.mercadoPagoMetadata = paymentData;

      // 5. Procesar según estado
      if (paymentData.status === 'approved') {
        await this.handleApprovedPayment(payment);
      } else if (paymentData.status === 'rejected') {
        await this.handleRejectedPayment(payment, paymentData.status_detail);
      } else if (paymentData.status === 'pending') {
        await this.handlePendingPayment(payment);
      }

      // 6. Marcar como procesado
      payment.webhookProcessed = true;
      payment.approvedAt = new Date();
      payment.approvedBy = mercadoPagoPaymentId;

      await this.paymentRepository.save(payment);

      this.logger.log(
        `✅ Webhook procesado: ${mercadoPagoPaymentId} - Status: ${paymentData.status}`,
      );
    } catch (error) {
      this.logger.error(`❌ Error procesando webhook: ${error.message}`);
      throw error;
    }
  }

  // ✅ MANEJAR PAGO APROBADO
  private async handleApprovedPayment(payment: Payment): Promise<void> {
    try {
      this.logger.log(`💰 Pago aprobado: ${payment.mercadoPagoPaymentId}`);

      // 1. Actualizar estado de la orden
      const order = payment.order;
      order.status = OrderStatus.PAID;
      order.paymentStatus = 'paid' as any;
      order.updatedAt = new Date();

      await this.orderRepository.save(order);

      // 2. Crear transacción de registro
      const transaction = this.transactionRepository.create({
        payment,
        type: 'charge',
        amount: payment.amount,
        status: 'completed',
        description: `Pago aprobado por Mercado Pago`,
        externalTransactionId: payment.mercadoPagoPaymentId,
      });

      await this.transactionRepository.save(transaction);

      // 3. Enviar notificación (implementar más adelante)
      await this.sendPaymentApprovedNotification(order, payment);

      this.logger.log(`✅ Orden ${order.orderNumber} marcada como pagada`);
    } catch (error) {
      this.logger.error(`❌ Error al manejar pago aprobado: ${error.message}`);
      throw error;
    }
  }

  // ✅ MANEJAR PAGO RECHAZADO
  private async handleRejectedPayment(
    payment: Payment,
    reason: string,
  ): Promise<void> {
    try {
      this.logger.warn(`❌ Pago rechazado: ${payment.mercadoPagoPaymentId}`);

      payment.status = 'rejected';
      payment.failureReason = reason;
      payment.retryCount += 1;
      payment.lastRetryAt = new Date();

      await this.paymentRepository.save(payment);

      // Enviar notificación de rechazo (implementar más adelante)
      await this.sendPaymentRejectedNotification(payment.order, payment);

      this.logger.log(
        `⚠️ Pago rechazado para orden ${payment.order.orderNumber}`,
      );
    } catch (error) {
      this.logger.error(`❌ Error al manejar pago rechazado: ${error.message}`);
      throw error;
    }
  }

  // ✅ MANEJAR PAGO PENDIENTE
  private async handlePendingPayment(payment: Payment): Promise<void> {
    try {
      this.logger.log(`⏳ Pago pendiente: ${payment.mercadoPagoPaymentId}`);

      payment.status = 'in_process';

      await this.paymentRepository.save(payment);

      this.logger.log(
        `⏳ Pago en proceso para orden ${payment.order.orderNumber}`,
      );
    } catch (error) {
      this.logger.error(`❌ Error al manejar pago pendiente: ${error.message}`);
      throw error;
    }
  }

  // ✅ MÉTODOS AUXILIARES PARA MERCADO PAGO API - IMPLEMENTACIÓN REAL

  private async createMercadoPagoPreference(
    preference: MercadoPagoPreference,
    idempotencyKey: string,
  ): Promise<any> {
    try {
      this.logger.log(`📮 Enviando preference a Mercado Pago con SDK oficial`);

      // ✅ Crear instancia de Preference con el cliente configurado
      const preferenceClient = new Preference(this.mercadoPagoClient);

      // ✅ Crear el body de la preference según el SDK de MP
      const preferenceBody = {
        body: {
          items: preference.items.map((item, index) => ({
            id: item.id || `item-${index + 1}`, // ✅ Agregar ID requerido por SDK
            title: item.title,
            quantity: item.quantity,
            unit_price: item.unit_price,
            description: item.description,
            picture_url: item.picture_url,
            currency_id: 'ARS',
          })),
          payer: {
            name: preference.payer.name,
            email: preference.payer.email,
            phone: preference.payer.phone
              ? {
                  area_code: preference.payer.phone.area_code || '',
                  number: preference.payer.phone.number || '',
                }
              : undefined,
            address: preference.payer.address,
          },
          back_urls: preference.back_urls,
          auto_return: preference.auto_return,
          external_reference: preference.external_reference,
          notification_url: preference.notification_url,
          metadata: preference.metadata,
          statement_descriptor: 'MAA Hair Studio',
          /* expires: true,
          expiration_date_from: new Date().toISOString(),
          expiration_date_to: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(), */ // 24 horas
        },
        requestOptions: {
          idempotencyKey: idempotencyKey,
        },
      };

      // ✅ Crear la preference usando el SDK
      const response = await preferenceClient.create(preferenceBody);

      this.logger.log(`✅ Preference creada exitosamente: ${response.id}`);

      return {
        id: response.id,
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point,
        date_created: response.date_created,
        items: response.items,
        payer: response.payer,
        client_id: response.client_id,
      };
    } catch (error) {
      this.logger.error(
        `❌ Error creando preference en Mercado Pago: ${error.message}`,
      );
      this.logger.error(`Stack: ${error.stack}`);

      // Loggear el error completo de Mercado Pago
      if (error.cause) {
        this.logger.error(`Causa: ${JSON.stringify(error.cause)}`);
      }

      throw new BadRequestException(
        `Error al crear preference de pago: ${error.message}`,
      );
    }
  }

  private async getMercadoPagoPaymentData(
    mercadoPagoPaymentId: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `🔍 Obteniendo datos de pago de Mercado Pago (ID: ${mercadoPagoPaymentId})`,
      );

      // ✅ Crear instancia del cliente de Payment
      const paymentClient = new MPPayment(this.mercadoPagoClient);

      // ✅ Obtener el pago usando el SDK
      const payment = await paymentClient.get({
        id: mercadoPagoPaymentId,
      });

      this.logger.log(`✅ Datos de pago obtenidos: Status ${payment.status}`);

      return {
        id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
        amount: payment.transaction_amount,
        currency_id: payment.currency_id,
        payment_method_id: payment.payment_method_id,
        payment_type_id: payment.payment_type_id,
        transaction_amount: payment.transaction_amount,
        external_reference: payment.external_reference,
        date_created: payment.date_created,
        date_approved: payment.date_approved,
        payer: payment.payer,
        transaction_details: payment.transaction_details,
        fee_details: payment.fee_details,
      };
    } catch (error) {
      this.logger.error(`❌ Error obteniendo datos de pago: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);

      if (error.cause) {
        this.logger.error(`Causa: ${JSON.stringify(error.cause)}`);
      }

      throw new BadRequestException(
        `Error al obtener información del pago: ${error.message}`,
      );
    }
  }

  // ✅ OBTENER DATOS DE PAGO CON REINTENTOS
  async getMercadoPagoPaymentDataWithRetry(
    mercadoPagoPaymentId: string,
    maxRetries = 3,
    delayMs = 1000,
  ): Promise<any> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `🔍 Intento ${attempt}/${maxRetries} de obtener datos de pago: ${mercadoPagoPaymentId}`,
        );

        const paymentData =
          await this.getMercadoPagoPaymentData(mercadoPagoPaymentId);
        return paymentData;
      } catch (error) {
        lastError = error;
        this.logger.warn(`⚠️ Intento ${attempt} falló: ${error.message}`);

        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, delayMs * attempt),
          );
        }
      }
    }

    throw lastError || new Error('No se pudo obtener datos de pago');
  }

  private mapPaymentMethod(paymentMethodId: string): PaymentMethodEnum {
    const mapping = {
      credit_card: PaymentMethodEnum.CREDIT_CARD,
      debit_card: PaymentMethodEnum.DEBIT_CARD,
      account_money: PaymentMethodEnum.WALLET, // Dinero en cuenta de Mercado Pago
      bank_transfer: PaymentMethodEnum.BANK_TRANSFER,
      atm: PaymentMethodEnum.BANK_TRANSFER, // Cajeros automáticos
      ticket: PaymentMethodEnum.OTHER, // Efectivo en puntos de pago
      wallet_purchase: PaymentMethodEnum.WALLET,
    };

    return mapping[paymentMethodId] || PaymentMethodEnum.OTHER;
  }

  // ✅ BUSCAR PAGO POR EXTERNAL REFERENCE (Order ID)
  async findPaymentByOrderId(orderId: string): Promise<Payment | null> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { order: { id: orderId } },
        relations: ['order', 'user', 'transactions'],
        order: { createdAt: 'DESC' },
      });

      return payment;
    } catch (error) {
      this.logger.error(
        `❌ Error buscando pago por order ID: ${error.message}`,
      );
      return null;
    }
  }

  // ✅ BUSCAR PAGOS DE MERCADO PAGO POR FILTROS
  async searchMercadoPagoPayments(externalReference: string): Promise<any[]> {
    try {
      this.logger.log(
        `🔍 Buscando pagos en Mercado Pago por external_reference: ${externalReference}`,
      );

      const paymentClient = new MPPayment(this.mercadoPagoClient);

      // Buscar pagos por external_reference
      const response = await paymentClient.search({
        options: {
          criteria: 'desc',
          external_reference: externalReference,
        },
      });

      this.logger.log(
        `✅ Encontrados ${response.results?.length || 0} pagos en Mercado Pago`,
      );

      return response.results || [];
    } catch (error) {
      this.logger.error(
        `❌ Error buscando pagos en Mercado Pago: ${error.message}`,
      );
      return [];
    }
  }

  // ✅ SINCRONIZAR PAGO CON MERCADO PAGO (útil para casos de desincronización)
  async syncPaymentWithMercadoPago(
    paymentId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
        relations: ['order', 'user'],
      });

      if (!payment) {
        throw new NotFoundException('Pago no encontrado');
      }

      // Obtener datos actualizados de Mercado Pago
      const mpPaymentData = await this.getMercadoPagoPaymentData(
        payment.mercadoPagoPaymentId,
      );

      // Actualizar el pago local con los datos de MP
      payment.status = mpPaymentData.status;
      payment.statusDetail = mpPaymentData.status_detail;
      payment.paymentMethod = this.mapPaymentMethod(
        mpPaymentData.payment_method_id,
      );
      payment.mercadoPagoMetadata = mpPaymentData;

      await this.paymentRepository.save(payment);

      this.logger.log(`✅ Pago ${paymentId} sincronizado con Mercado Pago`);

      return {
        success: true,
        message: 'Pago sincronizado exitosamente',
      };
    } catch (error) {
      this.logger.error(`❌ Error sincronizando pago: ${error.message}`);
      throw new BadRequestException(
        `Error al sincronizar pago: ${error.message}`,
      );
    }
  }

  // ✅ CANCELAR PAGO EN MERCADO PAGO
  async cancelPayment(
    paymentId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
        relations: ['order'],
      });

      if (!payment) {
        throw new NotFoundException('Pago no encontrado');
      }

      if (payment.status === 'approved') {
        throw new BadRequestException(
          'No se puede cancelar un pago ya aprobado. Debe solicitar un reembolso.',
        );
      }

      // Actualizar estado local
      payment.status = 'cancelled';
      await this.paymentRepository.save(payment);

      this.logger.log(`✅ Pago ${paymentId} cancelado`);

      return {
        success: true,
        message: 'Pago cancelado exitosamente',
      };
    } catch (error) {
      this.logger.error(`❌ Error cancelando pago: ${error.message}`);
      throw error;
    }
  }

  // ✅ NOTIFICACIONES (placeholder - implementar con EmailService)
  private async sendPaymentApprovedNotification(
    order: any,
    payment: Payment,
  ): Promise<void> {
    this.logger.log(
      `📧 Enviando notificación de pago aprobado a ${order.user.email}`,
    );
    // TODO: Implementar con servicio de email
  }

  private async sendPaymentRejectedNotification(
    order: any,
    payment: Payment,
  ): Promise<void> {
    this.logger.log(
      `📧 Enviando notificación de pago rechazado a ${order.user.email}`,
    );
    // TODO: Implementar con servicio de email
  }

  // ✅ OBTENER HISTORIAL DE PAGOS
  async getPaymentHistory(userId: string, page = 1, limit = 10): Promise<any> {
    const [payments, total] = await this.paymentRepository.findAndCount({
      where: { user: { id: userId } },
      relations: ['order', 'transactions'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      success: true,
      message: 'Historial de pagos obtenido',
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ✅ OBTENER DETALLES DE PAGO
  async getPaymentDetails(paymentId: string, userId: string): Promise<any> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, user: { id: userId } },
      relations: ['order', 'transactions'],
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    return {
      success: true,
      message: 'Detalles del pago obtenidos',
      data: payment,
    };
  }
}

// ✅ ACTUALIZAR INTERFACE

export interface MercadoPagoPreference {
  items: MercadoPagoPreferenceItem[];
  payer: {
    name?: string;
    email: string;
    phone?: {
      area_code?: string;
      number?: string;
    };
    address?: {
      street_name?: string;
      street_number?: string;
      zip_code?: string;
    };
  };
  back_urls?: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return?: 'approved' | 'all'; // ✅ Mantener como optional
  external_reference: string;
  notification_url?: string;
  metadata?: Record<string, any>;
}
