import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'El código debe ser texto' })
  @IsNotEmpty({ message: 'El código es obligatorio' })
  @Matches(/^\d{6}$/, {
    message: 'El código debe ser exactamente 6 dígitos numéricos'
  })
  code: string; // ✅ CAMBIO: 'code' en lugar de 'token'

  @IsString({ message: 'La contraseña debe ser texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  newPassword: string;
}

// ✅ NUEVO: DTO para verificar código
export class VerifyResetCodeDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, {
    message: 'El código debe ser exactamente 6 dígitos numéricos'
  })
  code: string;
}
