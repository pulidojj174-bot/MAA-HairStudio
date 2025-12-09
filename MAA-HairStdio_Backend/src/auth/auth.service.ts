import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/user.entity';
import { InternalCreateUserDto, UsersService } from 'src/users/users.service';
import { RegisterUserDto } from './dto/register-user.dto';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/login-user.dto';

export interface JwtPayload {
  id: string;
  email: string;
  role: string; // ✅ AGREGAR rol al payload
}

export interface LoginResponse {
  access_token: string; // ✅ CAMBIAR nombre para consistencia
  user: User; // ✅ SIMPLIFICAR tipo, @Exclude() maneja la seguridad
  expiresIn: string; // ✅ AGREGAR información de expiración
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerUserDto: RegisterUserDto): Promise<User> {
    const { email, password, name } = registerUserDto;

    // ✅ MEJORA: Validar fortaleza de contraseña
    this.validatePasswordStrength(password);

    const saltRounds = 12; // ✅ AUMENTAR rounds para mejor seguridad

    try {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      const userToCreate: InternalCreateUserDto = {
        email,
        password_hash: hashedPassword,
        name,
      };
      
      const createdUser = await this.usersService.create(userToCreate);
      
      // ✅ SIMPLIFICADO: @Exclude() maneja la exclusión automáticamente
      return createdUser;
      
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      console.error('Error durante el registro:', error);
      throw new InternalServerErrorException(
        'Error al registrar el usuario. Inténtalo de nuevo más tarde.',
      );
    }
  }

  async login(loginUserDto: LoginUserDto): Promise<LoginResponse> {
    const { email, password } = loginUserDto;
    
    // ✅ MEJORA: Validar entrada
    if (!email || !password) {
      throw new BadRequestException('Email y contraseña son requeridos.');
    }

    const user = await this.usersService.findOneByEmail(email.toLowerCase().trim());

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    // ✅ MEJORA: Incluir rol en el payload JWT
    const payload: JwtPayload = { 
      id: user.id, 
      email: user.email,
      role: user.role 
    };
    
    const access_token = this.jwtService.sign(payload);

    return { 
      access_token, 
      user, // ✅ SIMPLIFICADO: @Exclude() oculta password automáticamente
      expiresIn: '3600s' // ✅ AGREGAR información de expiración
    };
  }

  async validateUserById(id: string): Promise<User | null> {
    const user = await this.usersService.findUserById(id);
    if (!user) return null;
    
    // ✅ SIMPLIFICADO: @Exclude() maneja la exclusión automáticamente
    return user;
  }

  // ✅ NUEVO: Validar fortaleza de contraseña
  private validatePasswordStrength(password: string): void {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (password.length < minLength) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres.');
    }

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      throw new BadRequestException(
        'La contraseña debe contener al menos una mayúscula, una minúscula y un número.'
      );
    }
  }

  // ✅ NUEVO: Cambiar contraseña
  async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<{ message: string }> {
    const user = await this.usersService.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    // Verificar contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    // Validar nueva contraseña
    this.validatePasswordStrength(newPassword);

    // Verificar que la nueva contraseña sea diferente
    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      throw new BadRequestException('La nueva contraseña debe ser diferente a la actual.');
    }

    // Actualizar contraseña
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
    await this.usersService.updatePassword(userId, hashedNewPassword);

    return { message: 'Contraseña actualizada correctamente.' };
  }

  // ✅ NUEVO: Refresh token (para implementación futura)
  async refreshToken(userId: string): Promise<{ access_token: string }> {
    const user = await this.usersService.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    const payload: JwtPayload = { 
      id: user.id, 
      email: user.email,
      role: user.role 
    };
    
    const access_token = this.jwtService.sign(payload);

    return { access_token };
  }
}
