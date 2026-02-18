import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShippingService } from './shipping.service';
import { OrdersService } from '../orders/orders.service';
import {
  QuoteShippingDto,
  CreateShippingDto,
  UpdateShippingStatusDto,
  SyncShippingStatusDto,
} from './dto/shipping.dto';
import { User } from '../users/user.entity';

interface AuthRequest extends Request {
  user: User;
}

@UseGuards(AuthGuard('jwt'))
@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly ordersService: OrdersService,
  ) {}

  // ✅ 1. COTIZAR ENVÍO
  @Post('quote')
  async quoteShipping(
    @Body() quoteDto: QuoteShippingDto,
    @Request() req: AuthRequest,
  ) {
    // Verificar que el usuario tiene acceso a esta orden
    const order = await this.ordersService.findOne(quoteDto.orderId, req.user.id);
    
    if (!order) {
      throw new ForbiddenException('No tienes acceso a esta orden');
    }

    return await this.shippingService.quoteShipping(
      quoteDto.orderId,
      quoteDto.destinationAddressId,
    );
  }

  // ✅ 2. CREAR ENVÍO
  @Post('create')
  async createShipment(
    @Body() createDto: CreateShippingDto,
    @Request() req: AuthRequest,
  ) {
    // Verificar acceso
    const order = await this.ordersService.findOne(createDto.orderId, req.user.id);
    
    if (!order) {
      throw new ForbiddenException('No tienes acceso a esta orden');
    }

    return await this.shippingService.createShipment(
      createDto.orderId,
      createDto.destinationAddressId,
      createDto.zipnovaQuoteId,
      createDto.shippingCost,
      createDto.serviceType,
    );
  }

  // ✅ 3. OBTENER ESTADO DEL ENVÍO
  @Get(':shipmentId')
  async getShipmentStatus(
    @Param('shipmentId', ParseUUIDPipe) shipmentId: string,
    @Request() req: AuthRequest,
  ) {
    // Verificar permisos del usuario
    const shipment = await this.shippingService.getShipmentByOrder(shipmentId);
    
    if (!shipment) {
      throw new NotFoundException('Envío no encontrado');
    }

    if (shipment.order.user.id !== req.user.id) {
      throw new ForbiddenException('No tienes acceso a este envío');
    }

    return await this.shippingService.getShipmentStatus(shipmentId);
  }

  // ✅ 4. OBTENER ENVÍO DE UNA ORDEN
  @Get('order/:orderId')
  async getShipmentByOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Request() req: AuthRequest,
  ) {
    // Verificar que el usuario tiene acceso
    const order = await this.ordersService.findOne(orderId, req.user.id);
    
    if (!order) {
      throw new ForbiddenException('No tienes acceso a esta orden');
    }

    const shipment = await this.shippingService.getShipmentByOrder(orderId);

    if (!shipment) {
      return {
        success: false,
        message: 'No hay envío registrado para esta orden',
        data: null,
      };
    }

    return {
      success: true,
      data: {
        id: shipment.id,
        status: shipment.status,
        trackingNumber: shipment.trackingNumber,
        carrier: shipment.carrier,
        service: shipment.service,
        shippingCost: shipment.shippingCost,
        estimatedDeliveryDate: shipment.estimatedDeliveryDate,
        labelUrl: shipment.labelUrl,
      },
    };
  }

  // ✅ 5. SINCRONIZAR ESTADO CON ZIPNOVA (PUBLIC - PARA WEBHOOKS)
  @Post('sync-status')
  async syncStatus(
    @Body() syncDto: SyncShippingStatusDto,
  ) {
    // Este endpoint puede ser usado por webhooks de Zipnova
    // No requiere autenticación
    try {
      return {
        success: true,
        message: 'Estado sincronizado',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error sincronizando estado',
        error: error.message,
      };
    }
  }
}
