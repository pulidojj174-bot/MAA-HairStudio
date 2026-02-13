import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import {
  Shipment,
  ShippingStatus as ShippingStatusEnum,
  ShippingCarrier as ShippingCarrierEnum,
  ShippingService as ShippingServiceEnum,
} from './entities/shipment.entity';
import { Order } from '../orders/orders.entity';
import { Address } from '../address/address.entity';
import {
  ZipnovaQuoteRequest,
  ZipnovaQuoteResponse,
  ZipnovaShipmentRequest,
  ZipnovaShipmentResponse,
} from './interfaces/zipnova.interface';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly zipnovaApiUrl: string;
  private readonly zipnovaApiToken: string;
  private readonly zipnovaApiSecret: string;
  private readonly zipnovaAccountId: string;
  private readonly zipnovaOriginId: string;

  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly configService: ConfigService,
  ) {
    // ✅ OBTENER CREDENCIALES DE ZIPNOVA DEL .env
    const country = this.configService.get<string>('ZIPNOVA_COUNTRY', 'ar'); // ar, cl, mx
    const baseUrl = `https://api.zipnova.com.${country}/v2`;

    this.zipnovaApiUrl = baseUrl;
    this.zipnovaApiToken = this.configService.get<string>('ZIPNOVA_API_TOKEN', '');
    this.zipnovaApiSecret = this.configService.get<string>('ZIPNOVA_API_SECRET', '');
    this.zipnovaAccountId = this.configService.get<string>('ZIPNOVA_ACCOUNT_ID', '');
    this.zipnovaOriginId = this.configService.get<string>('ZIPNOVA_ORIGIN_ID', '');

    if (!this.zipnovaApiToken || !this.zipnovaApiSecret) {
      this.logger.error('⚠️ Credenciales de Zipnova no configuradas');
    }
  }

  // ✅ OBTENER HEADER DE AUTENTICACIÓN
  private getAuthHeader(): string {
    const credentials = `${this.zipnovaApiToken}:${this.zipnovaApiSecret}`;
    const encoded = Buffer.from(credentials).toString('base64');
    return `Basic ${encoded}`;
  }

  // ✅ COTIZAR ENVÍO
  async quoteShipping(orderId: string, destinationAddressId: string): Promise<any> {
    try {
      this.logger.log(`📦 Cotizando envío para orden: ${orderId}`);

      // Obtener orden con items
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['items'],
      });

      if (!order) {
        throw new NotFoundException('Orden no encontrada');
      }

      // Obtener dirección de destino
      const destAddress = await this.addressRepository.findOne({
        where: { id: destinationAddressId },
      });

      if (!destAddress) {
        throw new NotFoundException('Dirección de destino no encontrada');
      }

      // ✅ PREPARAR ITEMS PARA ZIPNOVA
      const zipnovaItems = order.items.map((item: any) => ({
        sku: item.id || item.productId,
        weight: item.weight || 100, // Peso por defecto en gramos
        height: item.height || 10,
        width: item.width || 10,
        length: item.length || 10,
        description: item.productName,
        quantity: item.quantity,
        classification_id: 1, // Clasificación para productos cosméticos
      }));

      // ✅ PREPARAR REQUEST A ZIPNOVA
      const quoteRequest: ZipnovaQuoteRequest = {
        account_id: this.zipnovaAccountId,
        origin_id: this.zipnovaOriginId,
        declared_value: order.total,
        items: zipnovaItems,
        destination: {
          city: destAddress.city,
          state: destAddress.province,
          zipcode: destAddress.postalCode,
        },
        delivery_type: 'delivery',
      };

      this.logger.log(`🚀 Enviando cotización a Zipnova: ${JSON.stringify(quoteRequest)}`);

      // ✅ LLAMAR A ZIPNOVA API
      const response = await axios.post<{ data: ZipnovaQuoteResponse[] }>(
        `${this.zipnovaApiUrl}/shipments/quote`,
        quoteRequest,
        {
          headers: {
            Authorization: this.getAuthHeader(),
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      const quotes = response.data.data;

      if (!quotes || quotes.length === 0) {
        throw new BadRequestException('No hay opciones de envío disponibles');
      }

      this.logger.log(`✅ Cotizaciones obtenidas: ${quotes.length} opciones`);

      // ✅ GUARDAR COTIZACIÓN EN BD (si es necesario)
      // Se puede guardar como caché temporal

      return {
        success: true,
        message: 'Cotizaciones obtenidas exitosamente',
        data: {
          options: quotes.map((q: ZipnovaQuoteResponse) => ({
            id: q.id,
            carrier: q.carrier,
            service: q.service,
            price: q.price,
            estimatedDays: q.estimated_days,
            observations: q.observations,
          })),
        },
      };
    } catch (error) {
      this.logger.error(`❌ Error cotizando envío: ${error.message}`);
      throw error;
    }
  }

  // ✅ CREAR ENVÍO
  async createShipment(
    orderId: string,
    destinationAddressId: string,
    zipnovaQuoteId: string,
  ): Promise<any> {
    try {
      this.logger.log(`📮 Creando envío para orden: ${orderId} con quote: ${zipnovaQuoteId}`);

      // Obtener orden y dirección
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['items', 'user'],
      });

      if (!order) {
        throw new NotFoundException('Orden no encontrada');
      }

      const destAddress = await this.addressRepository.findOne({
        where: { id: destinationAddressId },
      });

      if (!destAddress) {
        throw new NotFoundException('Dirección de destino no encontrada');
      }

      // ✅ PREPARAR REQUEST
      const shipmentRequest: ZipnovaShipmentRequest = {
        account_id: this.zipnovaAccountId,
        origin_id: this.zipnovaOriginId,
        quote_id: zipnovaQuoteId,
        declared_value: order.total,
        items: order.items.map((item: any) => ({
          sku: item.id || item.productId,
          weight: item.weight || 100,
          height: item.height || 10,
          width: item.width || 10,
          length: item.length || 10,
          description: item.productName,
          quantity: item.quantity,
        })),
        destination: {
          city: destAddress.city,
          state: destAddress.province,
          zipcode: destAddress.postalCode,
          full_name: destAddress.recipientName,
          phone: destAddress.phone,
          email: destAddress.email || order.user.email,
          address: destAddress.streetAddress,
          number: destAddress.neighborhood || '0',
          floor: destAddress.addressLine2 || undefined,
          instructions: destAddress.deliveryInstructions,
        },
        reference: order.orderNumber,
        delivery_type: 'delivery',
      };

      // ✅ CREAR ENVÍO EN ZIPNOVA
      const response = await axios.post<ZipnovaShipmentResponse>(
        `${this.zipnovaApiUrl}/shipments`,
        shipmentRequest,
        {
          headers: {
            Authorization: this.getAuthHeader(),
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      const zipnovaShipment = response.data;

      // ✅ GUARDAR EN BD
      const shipment = new Shipment();
      shipment.order = order;
      shipment.destinationAddress = destAddress;
      shipment.zipnovaShipmentId = zipnovaShipment.id;
      shipment.zipnovaQuoteId = zipnovaQuoteId;
      shipment.trackingNumber = zipnovaShipment.tracking_number;
      shipment.carrier = this.mapCarrier(zipnovaShipment.carrier);
      shipment.service = this.mapService(zipnovaShipment.service);
      shipment.status = ShippingStatusEnum.CONFIRMED;
      shipment.statusDescription = 'Envío confirmado y listo para retirar';
      shipment.labelUrl = zipnovaShipment.label_url;
      shipment.estimatedDays = 5; // Por defecto
      shipment.zipnovaMetadata = zipnovaShipment;
      shipment.totalWeight = (order.items.length * 100) / 1000; // En kg

      const savedShipment = await this.shipmentRepository.save(shipment);

      this.logger.log(`✅ Envío creado: ${savedShipment.id} - Tracking: ${shipment.trackingNumber}`);

      return {
        success: true,
        message: 'Envío creado exitosamente',
        data: {
          id: savedShipment.id,
          status: savedShipment.status,
          trackingNumber: savedShipment.trackingNumber,
          carrier: savedShipment.carrier,
          service: savedShipment.service,
          shippingCost: savedShipment.shippingCost,
          labelUrl: savedShipment.labelUrl,
        },
      };
    } catch (error) {
      this.logger.error(`❌ Error creando envío: ${error.message}`);
      throw error;
    }
  }

  // ✅ OBTENER ESTADO DEL ENVÍO
  async getShipmentStatus(shipmentId: string): Promise<any> {
    try {
      const shipment = await this.shipmentRepository.findOne({
        where: { id: shipmentId },
      });

      if (!shipment) {
        throw new NotFoundException('Envío no encontrado');
      }

      // ✅ CONSULTAR ESTADO EN ZIPNOVA
      const response = await axios.get(
        `${this.zipnovaApiUrl}/shipments/${shipment.zipnovaShipmentId}`,
        {
          headers: {
            Authorization: this.getAuthHeader(),
            'Accept': 'application/json',
          },
        }
      );

      const status = response.data;

      // ✅ ACTUALIZAR EN BD
      shipment.status = this.mapZipnovaStatusToLocal(status.status);
      shipment.statusDescription = status.status;
      shipment.zipnovaMetadata = status;

      if (status.status === 'delivered') {
        shipment.deliveredAt = new Date();
      }

      await this.shipmentRepository.save(shipment);

      return {
        success: true,
        data: {
          id: shipment.id,
          status: shipment.status,
          trackingNumber: shipment.trackingNumber,
          carrier: shipment.carrier,
          estimatedDeliveryDate: shipment.estimatedDeliveryDate,
          deliveredAt: shipment.deliveredAt,
          events: status.events || [],
        },
      };
    } catch (error) {
      this.logger.error(`❌ Error obteniendo estado: ${error.message}`);
      throw error;
    }
  }

  // ✅ OBTENER ENVÍO DE ORDEN
  async getShipmentByOrder(orderId: string): Promise<Shipment | null> {
    return this.shipmentRepository.findOne({
      where: { order: { id: orderId } },
      relations: ['order', 'destinationAddress'],
    });
  }

  // ✅ MAPEAR TRANSPORTISTA
  private mapCarrier(zipnovaCarrier: string): ShippingCarrierEnum {
    const mapping: { [key: string]: ShippingCarrierEnum } = {
      oca: ShippingCarrierEnum.OCA,
      andreani: ShippingCarrierEnum.ANDREANI,
      correo_argentino: ShippingCarrierEnum.CORREO_ARGENTINO,
      fedex: ShippingCarrierEnum.FEDEX,
      dhl: ShippingCarrierEnum.DHL,
    };
    return mapping[zipnovaCarrier.toLowerCase()] || ShippingCarrierEnum.OTHER;
  }

  // ✅ MAPEAR SERVICIO
  private mapService(zipnovaService: string): ShippingServiceEnum {
    const mapping: { [key: string]: ShippingServiceEnum } = {
      express: ShippingServiceEnum.EXPRESS,
      standard: ShippingServiceEnum.STANDARD,
      economy: ShippingServiceEnum.ECONOMY,
      pickup: ShippingServiceEnum.PICKUP,
    };
    return mapping[zipnovaService.toLowerCase()] || ShippingServiceEnum.STANDARD;
  }

  // ✅ MAPEAR ESTADO LOCAL
  private mapZipnovaStatusToLocal(zipnovaStatus: string): ShippingStatusEnum {
    const mapping: { [key: string]: ShippingStatusEnum } = {
      pending: ShippingStatusEnum.PENDING,
      in_transit: ShippingStatusEnum.IN_TRANSIT,
      delivered: ShippingStatusEnum.DELIVERED,
      failed: ShippingStatusEnum.FAILED,
    };
    return mapping[zipnovaStatus.toLowerCase()] || ShippingStatusEnum.PENDING;
  }
}
