import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Patch,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { AuthService, LoginResponse } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { User } from 'src/users/user.entity';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { ChangePasswordDto } from './dto/change-password.dto'; // ✅ NUEVO DTO

interface AuthRequest extends Request {
  user: User;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async register(@Body() registerUserDto: RegisterUserDto): Promise<User> {
    return this.authService.register(registerUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async login(@Body() loginUserDto: LoginUserDto): Promise<LoginResponse> {
    return this.authService.login(loginUserDto);
  }

  // ✅ MEJORADO: Endpoint de perfil más robusto
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req: AuthRequest): Promise<{
    message: string;
    user: User;
  }> {
    return {
      message: 'Perfil obtenido correctamente',
      user: req.user,
    };
  }

  // ✅ NUEVO: Cambiar contraseña
  @Patch('change-password')
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async changePassword(
    @Req() req: AuthRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(
      req.user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  // ✅ NUEVO: Refresh token
  @Post('refresh')
  @UseGuards(AuthGuard('jwt'))
  async refreshToken(@Req() req: AuthRequest): Promise<{ access_token: string }> {
    return this.authService.refreshToken(req.user.id);
  }

  // ✅ NUEVO: Verificar token
  @Get('verify')
  @UseGuards(AuthGuard('jwt'))
  async verifyToken(@Req() req: AuthRequest): Promise<{
    valid: boolean;
    user: User;
    expiresIn: string;
  }> {
    return {
      valid: true,
      user: req.user,
      expiresIn: '3600s',
    };
  }

  // ✅ NUEVO: Logout (invalidar token - para implementación futura)
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: AuthRequest): Promise<{ message: string }> {
    // Para implementación futura: agregar token a blacklist
    return { message: 'Sesión cerrada correctamente' };
  }
}
