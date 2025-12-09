import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Roles } from '../auth/roles/roles.decorator';
import { UserRole } from 'src/users/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';


interface AuthRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: UserRole.ADMIN | UserRole.USER | UserRole.CUSTOM;
  };
}


@Controller('cart')
@UseGuards(AuthGuard('jwt')) // ✅ Todos los endpoints requieren autenticación
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ✅ OBTENER CARRITO CON PAGINACIÓN
  @Get()
  async getCart(
    @Request() req: AuthRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    // Validar parámetros de paginación
    if (page < 1) {
      throw new BadRequestException('El número de página debe ser mayor a 0');
    }
    if (limit < 1 || limit > 50) {
      throw new BadRequestException('El límite debe estar entre 1 y 50');
    }

    return await this.cartService.getCart(req.user.userId, page, limit);
  }

  // ✅ AGREGAR PRODUCTO AL CARRITO
  @Post('add')
  async addToCart(
    @Request() req: AuthRequest,
    @Body() addToCartDto: AddToCartDto,
  ) {
    return await this.cartService.addToCart(req.user.userId, addToCartDto);
  }

  // ✅ ACTUALIZAR ITEM DEL CARRITO
  @Patch('update')
  async updateCartItem(
    @Request() req: AuthRequest,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return await this.cartService.updateCartItem(req.user.userId, updateCartItemDto);
  }

  // ✅ ELIMINAR PRODUCTO DEL CARRITO
  @Delete('remove/:productId')
  async removeFromCart(
    @Request() req: AuthRequest,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return await this.cartService.removeFromCart(req.user.userId, productId);
  }

  // ✅ LIMPIAR CARRITO COMPLETO
  @Delete('clear')
  async clearCart(@Request() req: AuthRequest) {
    return await this.cartService.clearCart(req.user.userId);
  }

  // ✅ OBTENER SOLO EL RESUMEN DEL CARRITO
  @Get('summary')
  async getCartSummary(@Request() req: AuthRequest) {
    const summary = await this.cartService.getCartSummary(req.user.userId);
    return {
      success: true,
      message: 'Resumen obtenido exitosamente',
      data: summary,
    };
  }

  // ✅ VALIDAR DISPONIBILIDAD DE TODOS LOS ITEMS
  @Get('validate')
  async validateCartAvailability(@Request() req: AuthRequest) {
    return await this.cartService.validateCartAvailability(req.user.userId);
  }

  // ✅ OBTENER CANTIDAD DE ITEMS (endpoint rápido para badges)
  @Get('count')
  async getCartCount(@Request() req: AuthRequest) {
    const summary = await this.cartService.getCartSummary(req.user.userId);
    return {
      success: true,
      message: 'Cantidad obtenida exitosamente',
      data: {
        totalItems: summary.totalItems,
        totalQuantity: summary.totalQuantity,
        totalAmount: summary.totalAmount,
      },
    };
  }

  // ✅ ENDPOINT PARA ADMINS - Ver carritos abandonados
  @Get('abandoned')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAbandonedCarts(
    @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    // Este método se implementaría en el service
    return {
      success: true,
      message: 'Funcionalidad en desarrollo',
      data: {
        note: 'Este endpoint estará disponible en la próxima versión',
      },
    };
  }
}
