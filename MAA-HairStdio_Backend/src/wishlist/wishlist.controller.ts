import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  HttpStatus,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { MoveToCartDto } from './dto/move-to-cart.dto';
import { UserRole } from 'src/users/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: UserRole.ADMIN | UserRole.USER | UserRole.CUSTOM;
  };
}

@Controller('wishlist')
@UseGuards(AuthGuard('jwt')) // ✅ Todos los endpoints requieren autenticació
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  // ✅ OBTENER WISHLIST CON PAGINACIÓN
  @Get()
  async getWishlist(
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

    return await this.wishlistService.getWishlist(req.user.id, page, limit);
  }

  // ✅ AGREGAR PRODUCTO A LA WISHLIST
  @Post('add')
  async addToWishlist(
    @Request() req: AuthRequest,
    @Body() addToWishlistDto: AddToWishlistDto,
  ) {
    return await this.wishlistService.addToWishlist(req.user.id, addToWishlistDto);
  }

  // ✅ ELIMINAR PRODUCTO DE LA WISHLIST
  @Delete('remove/:productId')
  async removeFromWishlist(
    @Request() req: AuthRequest,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return await this.wishlistService.removeFromWishlist(req.user.id, productId);
  }

  // ✅ MOVER PRODUCTO AL CARRITO
  @Post('move-to-cart')
  async moveToCart(
    @Request() req: AuthRequest,
    @Body() moveToCartDto: MoveToCartDto,
  ) {
    return await this.wishlistService.moveToCart(req.user.id, moveToCartDto);
  }

  // ✅ LIMPIAR TODA LA WISHLIST
  @Delete('clear')
  async clearWishlist(@Request() req: AuthRequest) {
    return await this.wishlistService.clearWishlist(req.user.id);
  }

  // ✅ VERIFICAR SI UN PRODUCTO ESTÁ EN LA WISHLIST
  @Get('check/:productId')
  async checkInWishlist(
    @Request() req: AuthRequest,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const result = await this.wishlistService.isInWishlist(req.user.id, productId);
    return {
      success: true,
      message: 'Verificación completada',
      data: result,
    };
  }

  // ✅ OBTENER PRODUCTOS CON CAMBIOS DE PRECIO
  @Get('price-changes')
  async getPriceChanges(@Request() req: AuthRequest) {
    return await this.wishlistService.getItemsWithPriceChanges(req.user.id);
  }

  // ✅ ENDPOINT ESPECÍFICO PARA CONTEO (sin paginación)
  @Get('count')
  async getWishlistCount(@Request() req: AuthRequest) {
    const count = await this.wishlistService.getWishlistCount(req.user.id);
    return {
      success: true,
      message: 'Conteo de wishlist obtenido exitosamente',
      data: count,
    };
  }

  // ✅ ENDPOINT DE DEBUGGING (solo para desarrollo)
  @Get('debug/states')
  async debugWishlistStates(@Request() req: AuthRequest) {
    const states = await this.wishlistService.debugWishlistStates(req.user.id);
    return {
      success: true,
      message: 'Estados de wishlist obtenidos exitosamente',
      data: states,
    };
  }

  // ✅ NUEVO: INCREMENTAR CONTADOR DE VISTAS
  @Post('view/:productId')
  async incrementViewCount(
    @Request() req: AuthRequest,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    await this.wishlistService.incrementViewCount(req.user.id, productId);
    return {
      success: true,
      message: 'Vista registrada exitosamente',
      data: {
        productId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // ✅ ENDPOINT PARA ADMINS - Análisis de wishlists
  @Get('analytics')
  @UseGuards(RolesGuard)
  @Roles('admin', 'custom')
  async getWishlistAnalytics() {
    // Este método se implementaría en el service para mostrar:
    // - Productos más deseados
    // - Usuarios con más items en wishlist
    // - Tendencias de precios
    // - Conversión de wishlist a compras
    return {
      success: true,
      message: 'Funcionalidad en desarrollo',
      data: {
        note: 'Este endpoint estará disponible en la próxima versión con analytics completos',
      },
    };
  }
}
