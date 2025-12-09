import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Delete,
  Post,
  Query,
  Req,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { User, UserRole } from './user.entity';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserDto } from 'src/auth/dto/update_user';
import { ResetPasswordDto, VerifyResetCodeDto } from './dto/reset-password.dto';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import * as bcrypt from 'bcrypt';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ✅ MODIFICADO: Enviar código de 6 dígitos
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    if (!email) {
      throw new BadRequestException('El correo electrónico es obligatorio');
    }
    return this.usersService.sendPasswordResetEmail(email);
  }

  // ✅ NUEVO: Verificar si el código es válido (opcional)
  @Post('verify-reset-code')
  async verifyResetCode(@Body() verifyDto: VerifyResetCodeDto) {
    return this.usersService.verifyResetCode(verifyDto.code);
  }

  // ✅ MODIFICADO: Recibir código en lugar de token
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const { code, newPassword } = resetPasswordDto;
    return this.usersService.resetPassword(code, newPassword);
  }

  // ✅ NUEVO: Limpiar códigos expirados (solo admin)
  @Post('admin/clean-expired-codes')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async cleanExpiredCodes() {
    return this.usersService.cleanExpiredResetCodes();
  }

  // ✅ NUEVO: Mi perfil completo (usuario actual)
  @Get('me/profile')
  @UseGuards(AuthGuard('jwt'))
  async getMyProfile(@Req() req: { user: User }) {
    return this.usersService.getUserStatistics(req.user, req.user.id);
  }

  // ✅ NUEVO: Mis órdenes (usuario actual)
  @Get('me/orders')
  @UseGuards(AuthGuard('jwt'))
  async getMyOrders(
    @Req() req: { user: User },
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.usersService.getUserWithOrders(
      req.user,
      req.user.id,
      Number(page),
      Number(limit)
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('me')
  async deleteOwnAccount(@Req() req: { user: User }) {
    return this.usersService.deleteOwnAccount(req.user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'custom')
  @Get()
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<{
    data: User[]; // ✅ CAMBIO: Ya no necesita Omit<User, 'password_hash'>
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.usersService.findAll(Number(page), Number(limit));
  }

  // ✅ NUEVO: Historial de órdenes del usuario
  @Get(':id/orders')
  @UseGuards(AuthGuard('jwt'))
  async getUserOrders(
    @Param('id', new ParseUUIDPipe({
      version: '4',
      errorHttpStatusCode: 400,
      exceptionFactory: () =>
        new BadRequestException('El id debe tener formato UUID v4 válido.'),
    })) userId: string,
    @Req() req: { user: User },
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.usersService.getUserWithOrders(
      req.user,
      userId,
      Number(page),
      Number(limit)
    );
  }

  // ✅ NUEVO: Estadísticas detalladas del usuario
  @Get(':id/statistics')
  @UseGuards(AuthGuard('jwt'))
  async getUserStatistics(
    @Param('id', new ParseUUIDPipe({
      version: '4',
      errorHttpStatusCode: 400,
      exceptionFactory: () =>
        new BadRequestException('El id debe tener formato UUID v4 válido.'),
    })) userId: string,
    @Req() req: { user: User },
  ) {
    return this.usersService.getUserStatistics(req.user, userId);
  }

  // ✅ NUEVO: Resumen del usuario (para admin dashboard)
  @Get(':id/summary')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'custom')
  async getUserSummary(
    @Param('id', new ParseUUIDPipe({
      version: '4',
      errorHttpStatusCode: 400,
      exceptionFactory: () =>
        new BadRequestException('El id debe tener formato UUID v4 válido.'),
    })) userId: string,
  ) {
    return this.usersService.getUserSummary(userId);
  }

  // ✅ AGREGAR: Endpoint para getUserStats
  @Get(':id/stats')
  @UseGuards(AuthGuard('jwt'))
  async getUserStatsSimple(
    @Param('id', ParseUUIDPipe) userId: string,
    @Req() req: { user: User },
  ) {
    return this.usersService.getUserStats(userId);
  }

  // ✅ AGREGAR: Endpoint para updatePassword (Admin)
  @Patch(':id/password')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async updateUserPassword(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() updatePasswordDto: { newPassword: string },
  ) {
    const hashedPassword = await bcrypt.hash(updatePasswordDto.newPassword, 10);
    await this.usersService.updatePassword(userId, hashedPassword);
    return { message: 'Contraseña actualizada correctamente' };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':identifier/role') // ✅ CAMBIAR: :identifier en lugar de :id
  async updateRole(
    @Req() req: { user: User }, // ✅ AGREGAR: Usuario que hace la request
    @Param('identifier') identifier: string, // ✅ CAMBIAR: Puede ser ID o email
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ): Promise<User> {
    return this.usersService.updateUserRole(
      req.user,              // ✅ AGREGAR: Usuario autenticado (admin)
      identifier,            // ✅ CAMBIAR: ID o email del usuario objetivo
      updateUserRoleDto.role // Rol a asignar
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  async updateUser(
    @Req() req: { user: User },
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: 400,
        exceptionFactory: () =>
          new BadRequestException('El id debe tener formato UUID v4 válido.'),
      }),
    )
    id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> { // ✅ CAMBIO: Tipo simplificado
    return this.usersService.updateUser(req.user, id, updateUserDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async deleteUser(
    @Request() req: { user: User },
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: 400,
        exceptionFactory: () =>
          new BadRequestException('El id debe tener formato UUID v4 válido.'),
      }),
    )
    id: string,
  ): Promise<{ message: string }> {
    return this.usersService.deleteUser(req.user, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async findOne(
    @Req() req: { user: User },
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: 400,
        exceptionFactory: () =>
          new BadRequestException('El id debe tener formato UUID v4 válido.'),
      }),
    )
    id: string,
  ): Promise<User | null> { // ✅ CAMBIO: Tipo simplificado
    return this.usersService.findOneById(req.user, id);
  }
}
