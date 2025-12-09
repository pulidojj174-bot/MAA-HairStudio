import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'La contraseña actual debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria.' })
  currentPassword: string;

  @IsString({ message: 'La nueva contraseña debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria.' })
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres.' })
  newPassword: string;
}