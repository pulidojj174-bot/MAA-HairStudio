import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service';
import { User } from 'src/users/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // ✅ No ignorar expiración
      secretOrKey: configService.get<string>('JWT_SECRET') || (() => {
        throw new Error('JWT_SECRET environment variable is required');
      })(),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const { id } = payload;
    
    const user = await this.authService.validateUserById(id);
    
    if (!user) {
      throw new UnauthorizedException('Token inválido o usuario no encontrado.');
    }

    // ✅ MEJORA: Verificar que el usuario siga activo/válido
    return user;
  }
}
