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
  ForbiddenException,
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RUTAS ESPECÍFICAS PRIMERO (sin parámetros dinámicos)
  // ═══════════════════════════════════════════════════════════════════════════

  // ✅ 1. CREAR PREFERENCE DE PAGO
  @Post('create-preference')
  async createPaymentPreference(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: AuthRequest,
  ): Promise<PaymentResponseDto> {
    if (!createPaymentDto.orderId) {
      throw new BadRequestException('Order ID es requerido');
    }

    return await this.paymentsService.createPaymentPreference(
      createPaymentDto,
    );
  }

  // ✅ 2. OBTENER HISTORIAL DE PAGOS DEL USUARIO
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RUTAS CON PREFIJO ESPECÍFICO + PARÁMETRO
  // ═══════════════════════════════════════════════════════════════════════════

  // ✅ 3. ADMIN: BUSCAR PAGOS EN MERCADO PAGO
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

  // ✅ 4. BUSCAR PAGO POR ORDER ID
  @Get('order/:orderId')
  async getPaymentByOrderId(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Request() req: AuthRequest,
  ) {
    const payment = await this.paymentsService.findPaymentByOrderId(orderId);
    
    if (!payment) {
      throw new BadRequestException('No se encontró pago para esta orden');
    }

    if (payment.user.id !== req.user.id) {
      throw new BadRequestException('No tienes acceso a este pago');
    }

    return {
      success: true,
      message: 'Pago obtenido exitosamente',
      data: payment,
    };
  }

  // ✅ 5. VERIFICAR ESTADO DEL PAGO (DEBE IR ANTES DE :paymentId)
  @Get('verify/:orderId')
  async verifyPayment(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Request() req: AuthRequest,
  ) {
    const payment = await this.paymentsService.findPaymentByOrderId(orderId);
    
    if (!payment) {
      return {
        success: false,
        message: 'Pago no encontrado',
        status: null,
      };
    }

    if (payment.user.id !== req.user.id) {
      throw new ForbiddenException('No tienes acceso a este pago');
    }

    return {
      success: true,
      message: 'Pago verificado',
      status: payment.status,
      order: payment.order,
      data: payment,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RUTAS CON PARÁMETRO DINÁMICO (deben ir al final)
  // ═══════════════════════════════════════════════════════════════════════════

  // ✅ 6. SINCRONIZAR PAGO CON MERCADO PAGO
  @Patch(':paymentId/sync')
  async syncPayment(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Request() req: AuthRequest,
  ) {
    const payment = await this.paymentsService.getPaymentDetails(
      paymentId,
      req.user.id,
    );

    if (!payment) {
      throw new BadRequestException('Pago no encontrado o no autorizado');
    }

    return await this.paymentsService.syncPaymentWithMercadoPago(paymentId);
  }

  // ✅ 7. CANCELAR PAGO (antes de ser aprobado)
  @Patch(':paymentId/cancel')
  async cancelPayment(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Request() req: AuthRequest,
  ) {
    const payment = await this.paymentsService.getPaymentDetails(
      paymentId,
      req.user.id,
    );

    if (!payment) {
      throw new BadRequestException('Pago no encontrado o no autorizado');
    }

    return await this.paymentsService.cancelPayment(paymentId);
  }

  // ✅ 8. OBTENER DETALLES DE UN PAGO (RUTA GENÉRICA - SIEMPRE AL FINAL)
  @Get(':paymentId')
  async getPaymentDetails(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Request() req: AuthRequest,
  ) {
    return await this.paymentsService.getPaymentDetails(paymentId, req.user.id);
  }
}
