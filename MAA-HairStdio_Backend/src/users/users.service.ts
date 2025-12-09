import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { User, UserRole } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateUserDto } from 'src/auth/dto/update_user';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';

export interface InternalCreateUserDto {
  email: string;
  password_hash: string;
  name?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailerService: MailerService,
  ) {}

  // ✅ NUEVO: Generar código de 6 dígitos
  private generateSixDigitCode(): string {
    // Genera un número aleatorio entre 100000 y 999999
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ✅ MODIFICADO: Enviar código de 6 dígitos en lugar de token
  async sendPasswordResetEmail(email: string): Promise<{ 
    message: string;
    expiresInMinutes: number;
  }> {
    const user = await this.userRepository.findOneBy({ email });
    
    if (!user) {
      // ✅ SEGURIDAD: No revelar si el email existe o no
      this.logger.warn(`Intento de recuperación de contraseña para email no registrado: ${email}`);
      return { 
        message: 'Si el correo está registrado, recibirás un código de verificación.',
        expiresInMinutes: 120 
      };
    }

    // ✅ Generar código de 6 dígitos
    const resetCode = this.generateSixDigitCode();
    
    // ✅ CAMBIO: Tiempo de expiración de 2 horas (120 minutos)
    const expirationTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas

    // ✅ Guardar código y tiempo de expiración
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpires = expirationTime;

    try {
      await this.userRepository.save(user);

      // ✅ Enviar email con código
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Código de recuperación de contraseña - MAA Hair Studio',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
                border-radius: 10px;
              }
              .header {
                text-align: center;
                padding: 20px 0;
                background-color: #4a5568;
                color: white;
                border-radius: 10px 10px 0 0;
              }
              .code-box {
                background-color: #ffffff;
                border: 2px dashed #4a5568;
                border-radius: 8px;
                padding: 30px;
                text-align: center;
                margin: 30px 0;
              }
              .code {
                font-size: 48px;
                font-weight: bold;
                letter-spacing: 10px;
                color: #2d3748;
                font-family: 'Courier New', monospace;
              }
              .warning {
                background-color: #fff5f5;
                border-left: 4px solid #fc8181;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .info {
                background-color: #ebf8ff;
                border-left: 4px solid #4299e1;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .footer {
                text-align: center;
                color: #718096;
                font-size: 12px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Recuperación de Contraseña</h1>
              </div>
              
              <div style="padding: 20px; background-color: white;">
                <p>Hola <strong>${user.name || 'Usuario'}</strong>,</p>
                
                <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>MAA Hair Studio</strong>.</p>
                
                <p>Tu código de verificación es:</p>
                
                <div class="code-box">
                  <div class="code">${resetCode}</div>
                  <p style="color: #718096; margin-top: 10px;">Código de verificación</p>
                </div>
                
                <div class="info">
                  <strong>⏰ Tiempo de validez:</strong>
                  <p style="margin: 5px 0 0 0;">Este código es válido por <strong>2 horas</strong> desde el momento de su generación.</p>
                  <p style="margin: 5px 0 0 0;">Expira el: <strong>${expirationTime.toLocaleString('es-AR', { 
                    dateStyle: 'full', 
                    timeStyle: 'short' 
                  })}</strong></p>
                </div>
                
                <div class="warning">
                  <strong>⚠️ Importante:</strong>
                  <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                    <li>No compartas este código con nadie</li>
                    <li>Nuestro equipo nunca te pedirá este código</li>
                    <li>Si no solicitaste este cambio, ignora este correo</li>
                  </ul>
                </div>
                
                <p><strong>¿Cómo usar el código?</strong></p>
                <ol>
                  <li>Ve a la página de recuperación de contraseña</li>
                  <li>Ingresa este código de 6 dígitos</li>
                  <li>Crea tu nueva contraseña</li>
                </ol>
                
                <p>Si tienes algún problema, contáctanos respondiendo a este correo.</p>
                
                <p>Saludos,<br>
                <strong>Equipo de MAA Hair Studio</strong></p>
              </div>
              
              <div class="footer">
                <p>Este es un correo automático, por favor no respondas directamente.</p>
                <p>&copy; ${new Date().getFullYear()} MAA Hair Studio. Todos los derechos reservados.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Hola ${user.name || 'Usuario'},

Recibimos una solicitud para restablecer la contraseña de tu cuenta en MAA Hair Studio.

Tu código de verificación es: ${resetCode}

Este código es válido por 2 horas.
Expira el: ${expirationTime.toLocaleString('es-AR')}

IMPORTANTE:
- No compartas este código con nadie
- Nuestro equipo nunca te pedirá este código
- Si no solicitaste este cambio, ignora este correo

¿Cómo usar el código?
1. Ve a la página de recuperación de contraseña
2. Ingresa este código de 6 dígitos
3. Crea tu nueva contraseña

Saludos,
Equipo de MAA Hair Studio
        `,
      });

      this.logger.log(`Código de recuperación enviado a: ${email}`);
      this.logger.log(`Código expira en: ${expirationTime.toISOString()}`);

      return { 
        message: 'Código de verificación enviado. Revisa tu correo electrónico.',
        expiresInMinutes: 120 
      };

    } catch (error) {
      this.logger.error(`Error al enviar código de recuperación a ${email}:`, error);
      throw new InternalServerErrorException(
        'No se pudo enviar el código de recuperación. Por favor, intenta nuevamente.'
      );
    }
  }

  // ✅ NUEVO: Validar fortaleza de contraseña (mismo método que AuthService)
  private validatePasswordStrength(password: string): void {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (password.length < minLength) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres.');
    }

    if (!hasUpperCase || !hasLowerCase || !hasNumbers ) {
      throw new BadRequestException(
        'La contraseña debe contener al menos una mayúscula, una minúscula y un número.'
      );
    }
  }

  // ✅ MODIFICADO: Validar código de 6 dígitos en lugar de token
  async resetPassword(
    code: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // ✅ VALIDACIÓN: Verificar formato del código
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('El código debe ser de 6 dígitos numéricos.');
    }

    // ✅ VALIDACIÓN: Fortaleza de contraseña
    this.validatePasswordStrength(newPassword);

    // ✅ Buscar usuario por código
    const user = await this.userRepository.findOneBy({
      resetPasswordCode: code,
    });

    // ✅ VALIDACIONES: Código inválido o expirado
    if (!user) {
      this.logger.warn(`Intento de reseteo con código inválido: ${code}`);
      throw new BadRequestException('Código inválido o ya utilizado.');
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      this.logger.warn(`Intento de reseteo con código expirado para usuario: ${user.email}`);
      throw new BadRequestException('El código ha expirado. Solicita uno nuevo.');
    }

    try {
      // ✅ Hashear nueva contraseña con salt rounds más alto
      user.password_hash = await bcrypt.hash(newPassword, 12); // ✅ CAMBIO: 10 → 12 rounds
      
      // ✅ IMPORTANTE: Limpiar código y expiración después de usarlo
      user.resetPasswordCode = undefined;
      user.resetPasswordExpires = undefined;

      await this.userRepository.save(user);

      this.logger.log(`Contraseña actualizada exitosamente para: ${user.email}`);

      // ✅ Opcional: Enviar email de confirmación
      try {
        await this.mailerService.sendMail({
          to: user.email,
          subject: 'Contraseña actualizada exitosamente',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>✅ Contraseña Actualizada</h2>
              <p>Hola <strong>${user.name || 'Usuario'}</strong>,</p>
              <p>Tu contraseña ha sido actualizada exitosamente.</p>
              <p>Si no realizaste este cambio, contacta inmediatamente con nuestro equipo de soporte.</p>
              <p>Saludos,<br><strong>Equipo de MAA Hair Studio</strong></p>
            </div>
          `,
          text: `
Hola ${user.name || 'Usuario'},

Tu contraseña ha sido actualizada exitosamente.

Si no realizaste este cambio, contacta inmediatamente con nuestro equipo de soporte.

Saludos,
Equipo de MAA Hair Studio
          `,
        });
      } catch (emailError) {
        this.logger.error('Error al enviar email de confirmación:', emailError);
        // No fallar el reseteo por error de email
      }

      return { message: 'Contraseña actualizada correctamente.' };

    } catch (error) {
      this.logger.error(`Error al actualizar contraseña:`, error);
      throw new InternalServerErrorException(
        'No se pudo actualizar la contraseña. Por favor, intenta nuevamente.'
      );
    }
  }

  // ✅ NUEVO: Verificar si un código es válido (opcional)
  async verifyResetCode(code: string): Promise<{ 
    valid: boolean; 
    email?: string;
    expiresAt?: Date;
  }> {
    if (!/^\d{6}$/.test(code)) {
      return { valid: false };
    }

    const user = await this.userRepository.findOneBy({
      resetPasswordCode: code,
    });

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return { valid: false };
    }

    return { 
      valid: true, 
      email: user.email,
      expiresAt: user.resetPasswordExpires
    };
  }

  // ✅ NUEVO: Limpiar códigos expirados (tarea de mantenimiento)
  async cleanExpiredResetCodes(): Promise<{ cleaned: number }> {
    const result = await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ 
        resetPasswordCode: null, 
        resetPasswordExpires: null 
      })
      .where('resetPasswordExpires < :now', { now: new Date() })
      .andWhere('resetPasswordCode IS NOT NULL')
      .execute();

    this.logger.log(`Códigos expirados limpiados: ${result.affected}`);

    return { cleaned: result.affected || 0 };
  }

  async create(userData: InternalCreateUserDto): Promise<User> {
    const { email } = userData;
    const existingUser = await this.userRepository.findOneBy({ email });
    if (existingUser) {
      throw new ConflictException(
        'Ya existe un usuario con este correo electrónico.',
      );
    }

    const user = this.userRepository.create(userData);
    try {
      return await this.userRepository.save(user);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        'No se pudo crear el usuario. :' + errorMessage,
      );
    }
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  async findOneById(
    requestingUser: User,
    userId: string,
  ): Promise<User | null> {
    if (
      requestingUser.id !== userId &&
      requestingUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('No tienes permisos para ver este usuario.');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    return user;
  }

  async findUserById(userId: string): Promise<User | null> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    return user;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async updateUserRole(
    requestingUser: User,
    identifier: string,
    newRole: UserRole,
  ): Promise<User> {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo los administradores pueden cambiar roles de usuario.');
    }

    if (!Object.values(UserRole).includes(newRole)) {
      throw new BadRequestException(`Rol no válido. Roles disponibles: ${Object.values(UserRole).join(', ')}`);
    }

    let targetUser: User | null = null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(identifier)) {
      targetUser = await this.userRepository.findOneBy({ id: identifier });
    } else {
      targetUser = await this.userRepository.findOneBy({ email: identifier });
    }

    if (!targetUser) {
      throw new NotFoundException(`Usuario no encontrado con el identificador: ${identifier}`);
    }

    if (targetUser.id === requestingUser.id && newRole !== UserRole.ADMIN) {
      throw new BadRequestException('No puedes quitar tus propios permisos de administrador.');
    }

    if (targetUser.role === newRole) {
      throw new BadRequestException(`El usuario ya tiene el rol: ${newRole}`);
    }

    targetUser.role = newRole;
    
    try {
      await this.userRepository.save(targetUser);
      return targetUser;
    } catch (error) {
      throw new InternalServerErrorException('No se pudo actualizar el rol del usuario.');
    }
  }

  async updateUser(
    requestingUser: User,
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    if (
      requestingUser.id !== userId &&
      requestingUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        'No tienes permisos para actualizar este usuario.',
      );
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    if (updateUserDto.name) user.name = updateUserDto.name;
    if (updateUserDto.email) user.email = updateUserDto.email;

    await this.userRepository.save(user);
    return user;
  }

  async deleteUser(
    requestingUser: User,
    userId: string,
  ): Promise<{ message: string }> {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo un administrador puede eliminar usuarios.',
      );
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    await this.userRepository.delete(userId);
    return { message: 'Usuario eliminado correctamente.' };
  }

  async deleteOwnAccount(user: User): Promise<{ message: string }> {
    const existingUser = await this.userRepository.findOneBy({ id: user.id });
    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    await this.userRepository.delete(user.id);
    return { message: 'Tu cuenta y todos tus datos han sido eliminados.' };
  }

  async getUserWithOrders(
    requestingUser: User,
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    user: User;
    orders: {
      data: any[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    if (requestingUser.id !== userId && requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permisos para ver este usuario.');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const orderRepository = this.userRepository.manager.getRepository('Order');
    const [orders, total] = await orderRepository.findAndCount({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      user,
      orders: {
        data: orders,
        total,
        page,
        limit,
        totalPages,
      }
    };
  }

  async getUserStats(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['orders'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      totalOrders: user.orders.length,
      totalSpent: user.orders.reduce((sum, order) => sum + order.total, 0),
      lastOrderDate: user.orders[0]?.createdAt || null,
    };
  }

  async getUserStatistics(
    requestingUser: User,
    userId: string
  ): Promise<{
    user: Partial<User>;
    statistics: {
      totalOrders: number;
      totalSpent: number;
      averageOrderValue: number;
      lastOrderDate: Date | null;
      ordersByStatus: Record<string, number>;
      monthlyOrdersCount: Array<{ month: string; count: number; total: number }>;
      favoriteProducts: Array<{ productName: string; quantity: number; times: number }>;
    };
  }> {
    if (requestingUser.id !== userId && requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permisos para ver estas estadísticas.');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'name', 'email', 'role', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    try {
      const orderRepository = this.userRepository.manager.getRepository('orders');

      const orderStats = await orderRepository
        .createQueryBuilder('order')
        .select([
          'COUNT(order.id) as "totalOrders"',
          'COALESCE(SUM(order.total), 0) as "totalSpent"',
          'COALESCE(AVG(order.total), 0) as "averageOrderValue"',
        ])
        .where('order.userId = :userId', { userId })
        .andWhere('order.paymentStatus = :status', { status: 'approved' })
        .getRawOne();

      const lastOrder = await orderRepository
        .createQueryBuilder('order')
        .select('order.createdAt', 'createdAt')
        .where('order.userId = :userId', { userId })
        .orderBy('order.createdAt', 'DESC')
        .limit(1)
        .getRawOne();

      return {
        user,
        statistics: {
          totalOrders: parseInt(orderStats?.totalOrders || '0'),
          totalSpent: parseFloat(orderStats?.totalSpent || '0'),
          averageOrderValue: parseFloat(orderStats?.averageOrderValue || '0'),
          lastOrderDate: lastOrder?.createdAt || null,
          ordersByStatus: {},
          monthlyOrdersCount: [],
          favoriteProducts: []
        }
      };

    } catch (error) {
      return {
        user,
        statistics: {
          totalOrders: 0,
          totalSpent: 0,
          averageOrderValue: 0,
          lastOrderDate: null,
          ordersByStatus: {},
          monthlyOrdersCount: [],
          favoriteProducts: []
        }
      };
    }
  }

  async getUserSummary(userId: string): Promise<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: Date | null;
    memberSince: Date;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'name', 'email', 'role', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const orderRepository = this.userRepository.manager.getRepository('orders');
    
    try {
      const stats = await orderRepository
        .createQueryBuilder('order')
        .select([
          'COUNT(order.id) as "totalOrders"',
          'COALESCE(SUM(order.total), 0) as "totalSpent"',
        ])
        .where('order.userId = :userId', { userId })
        .andWhere('order.paymentStatus = :status', { status: 'approved' })
        .getRawOne();

      const lastOrderResult = await orderRepository
        .createQueryBuilder('order')
        .select('order.createdAt', 'createdAt')
        .where('order.userId = :userId', { userId })
        .orderBy('order.createdAt', 'DESC')
        .limit(1)
        .getRawOne();

      return {
        id: user.id,
        name: user.name || '',
        email: user.email,
        role: user.role,
        totalOrders: parseInt(stats?.totalOrders || '0'),
        totalSpent: parseFloat(stats?.totalSpent || '0'),
        lastOrderDate: lastOrderResult?.createdAt || null,
        memberSince: user.createdAt,
      };

    } catch (error) {
      return {
        id: user.id,
        name: user.name || '',
        email: user.email,
        role: user.role,
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: null,
        memberSince: user.createdAt,
      };
    }
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    user.password_hash = hashedPassword;
    await this.userRepository.save(user);
  }
}
