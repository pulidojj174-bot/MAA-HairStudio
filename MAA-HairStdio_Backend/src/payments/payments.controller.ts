import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  Query,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, PaymentResponseDto } from './dto/create-payment.dto';
import { User } from '../users/user.entity';

interface AuthRequest extends Request {
  user: User;
}

@UseGuards(AuthGuard('jwt'))
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ✅ CREAR PREFERENCE DE PAGO
  @Post('create-preference')
  async createPaymentPreference(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: AuthRequest,
  ): Promise<PaymentResponseDto> {
    // Validar que el usuario es el dueño de la orden
    if (!createPaymentDto.orderId) {
      throw new BadRequestException('Order ID es requerido');
    }

    return await this.paymentsService.createPaymentPreference(
      createPaymentDto,
    );
  }

  // ✅ OBTENER HISTORIAL DE PAGOS DEL USUARIO
  @Get('history')
  async getPaymentHistory(
    @Request() req: AuthRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.paymentsService.getPaymentHistory(
      req.user.id,
      page,
      limit,
    );
  }

  // ✅ BUSCAR PAGO POR ORDER ID
  @Get('order/:orderId')
  async getPaymentByOrderId(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Request() req: AuthRequest,
  ) {
    const payment = await this.paymentsService.findPaymentByOrderId(orderId);
    
    if (!payment) {
      throw new BadRequestException('No se encontró pago para esta orden');
    }

    // Verificar que el pago pertenece al usuario
    if (payment.user.id !== req.user.id) {
      throw new BadRequestException('No tienes acceso a este pago');
    }

    return {
      success: true,
      message: 'Pago obtenido exitosamente',
      data: payment,
    };
  }

  // ✅ SINCRONIZAR PAGO CON MERCADO PAGO
  @Patch(':paymentId/sync')
  async syncPayment(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Request() req: AuthRequest,
  ) {
    // Verificar que el pago pertenece al usuario
    const payment = await this.paymentsService.getPaymentDetails(
      paymentId,
      req.user.id,
    );

    if (!payment) {
      throw new BadRequestException('Pago no encontrado o no autorizado');
    }

    return await this.paymentsService.syncPaymentWithMercadoPago(paymentId);
  }

  // ✅ CANCELAR PAGO (antes de ser aprobado)
  @Patch(':paymentId/cancel')
  async cancelPayment(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Request() req: AuthRequest,
  ) {
    // Verificar que el pago pertenece al usuario
    const payment = await this.paymentsService.getPaymentDetails(
      paymentId,
      req.user.id,
    );

    if (!payment) {
      throw new BadRequestException('Pago no encontrado o no autorizado');
    }

    return await this.paymentsService.cancelPayment(paymentId);
  }

  // ✅ ADMIN: BUSCAR PAGOS EN MERCADO PAGO
  @Get('admin/search/:externalReference')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async searchMercadoPagoPayments(
    @Param('externalReference') externalReference: string,
  ) {
    const payments = await this.paymentsService.searchMercadoPagoPayments(
      externalReference,
    );

    return {
      success: true,
      message: 'Búsqueda completada',
      data: payments,
      count: payments.length,
    };
  }

  // ✅ OBTENER DETALLES DE UN PAGO (debe ir al final para no interferir con rutas específicas)
  @Get(':paymentId')
  async getPaymentDetails(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Request() req: AuthRequest,
  ) {
    return await this.paymentsService.getPaymentDetails(paymentId, req.user.id);
  }
}
