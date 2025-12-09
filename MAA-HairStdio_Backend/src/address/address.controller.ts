import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
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

@Controller('address')
@UseGuards(AuthGuard('jwt')) // ✅ Todos los endpoints requieren autenticación
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  // ✅ OBTENER TODAS LAS DIRECCIONES DEL USUARIO
  @Get()
  async getAddresses(@Request() req: AuthRequest) {
    return await this.addressService.getAddresses(req.user.id);
  }

  // ✅ OBTENER DIRECCIÓN POR ID
  @Get(':id')
  async getAddressById(
    @Request() req: AuthRequest,
    @Param('id', ParseUUIDPipe) addressId: string,
  ) {
    return await this.addressService.getAddressById(req.user.id, addressId);
  }

  // ✅ CREAR NUEVA DIRECCIÓN
  @Post()
  async createAddress(
    @Request() req: AuthRequest,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    return await this.addressService.createAddress(req.user.id, createAddressDto);
  }

  // ✅ ACTUALIZAR DIRECCIÓN EXISTENTE
  @Patch(':id')
  async updateAddress(
    @Request() req: AuthRequest,
    @Param('id', ParseUUIDPipe) addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return await this.addressService.updateAddress(req.user.id, addressId, updateAddressDto);
  }

  // ✅ ELIMINAR DIRECCIÓN (SOFT DELETE)
  @Delete(':id')
  async deleteAddress(
    @Request() req: AuthRequest,
    @Param('id', ParseUUIDPipe) addressId: string,
  ) {
    return await this.addressService.deleteAddress(req.user.id, addressId);
  }

  // ✅ ESTABLECER DIRECCIÓN POR DEFECTO
  @Patch(':id/set-default')
  async setDefaultAddress(
    @Request() req: AuthRequest,
    @Param('id', ParseUUIDPipe) addressId: string,
  ) {
    return await this.addressService.setDefaultAddress(req.user.id, addressId);
  }

  // ✅ VALIDAR DIRECCIÓN ARGENTINA
  @Post(':id/validate')
  async validateAddress(
    @Request() req: AuthRequest,
    @Param('id', ParseUUIDPipe) addressId: string,
  ) {
    return await this.addressService.validateAddress(req.user.id, addressId);
  }

  // ✅ OBTENER DIRECCIÓN POR DEFECTO
  @Get('default/current')
  async getDefaultAddress(@Request() req: AuthRequest) {
    const result = await this.addressService.getDefaultAddress(req.user.id);

    if (!result) {
      return {
        success: true,
        message: 'No tienes dirección por defecto configurada',
        data: null,
      };
    }

    return result;
  }


  // ✅ ENDPOINT PARA ADMINS - Estadísticas de direcciones
  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles('admin', 'custom') // Solo admins pueden acceder
  async getAddressStats() {
    // Este método se implementaría en el service para mostrar:
    // - Distribución por provincias
    // - Direcciones validadas vs pendientes
    // - Usuarios con más direcciones
    // - Provincias más populares
    return {
      success: true,
      message: 'Funcionalidad en desarrollo',
      data: {
        note: 'Este endpoint estará disponible en la próxima versión con estadísticas completas de direcciones',
      },
    };
  }
}
