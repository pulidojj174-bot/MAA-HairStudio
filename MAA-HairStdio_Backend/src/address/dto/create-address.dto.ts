import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsBoolean,
  MaxLength,
  Matches,
  MinLength,
  Length,
  IsEnum,
} from 'class-validator';

export class CreateAddressDto {
  // ✅ INFORMACIÓN DEL DESTINATARIO
  @IsString({ message: 'El nombre del destinatario debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del destinatario es obligatorio' })
  @Length(2, 100, {
    message: 'El nombre debe tener entre 2 y 100 caracteres',
  })
  recipientName: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @Matches(/^(\+54|54)?[0-9]{8,12}$/, {
    message: 'El teléfono debe tener formato argentino válido (+54XXXXXXXXXX)',
  })
  phone: string;

  @IsOptional()
  @IsString({ message: 'El teléfono alternativo debe ser texto' })
  @Matches(
    /^(\+54|54)?[0-9]{8,12}$/,
    {
    message: 'El teléfono alternativo debe tener formato argentino válido',
  },
)
  alternativePhone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email debe ser válido' })
  email?: string;

  // ✅ INFORMACIÓN DE UBICACIÓN
  @IsString({ message: 'La provincia debe ser texto' })
  @IsNotEmpty({ message: 'La provincia es obligatoria' })
  @MaxLength(50)
  province: string;

  @IsString({ message: 'La ciudad debe ser texto' })
  @IsNotEmpty({ message: 'La ciudad es obligatoria' })
  @Length(2, 50, { message: 'La ciudad debe tener entre 2 y 50 caracteres' })
  city: string;

  @IsString({ message: 'El código postal debe ser texto' })
  @IsNotEmpty({ message: 'El código postal es obligatorio' })
  @MaxLength(20)
  postalCode: string;

  // ✅ DIRECCIÓN DETALLADA
  @IsString({ message: 'La dirección debe ser texto' })
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  @Length(5, 200, {
    message: 'La dirección debe tener entre 5 y 200 caracteres',
  })
  streetAddress: string;

  @IsOptional()
  @IsString({ message: 'La línea adicional debe ser texto' })
  @Length(1, 200, {
    message: 'La línea adicional debe tener máximo 200 caracteres',
  })
  addressLine2?: string;

  @IsOptional()
  @IsString({ message: 'El barrio debe ser texto' })
  @Length(1, 100, {
    message: 'El barrio debe tener máximo 100 caracteres',
  })
  neighborhood?: string;

  @IsOptional()
  @IsString({ message: 'El punto de referencia debe ser texto' })
  @Length(1, 200, {
    message: 'El punto de referencia debe tener máximo 200 caracteres',
  })
  landmark?: string;

  // ✅ INSTRUCCIONES DE ENTREGA
  @IsOptional()
  @IsString({ message: 'Las instrucciones deben ser texto' })
  @Length(1, 500, {
    message: 'Las instrucciones deben tener máximo 500 caracteres',
  })
  deliveryInstructions?: string;

  @IsOptional()
  @IsString({ message: 'La preferencia de horario de entrega debe ser texto' })
  @Length(1, 50, {
    message: 'La preferencia de horario de entrega debe tener entre 1 y 50 caracteres',
  })
  deliveryTimePreference?: string;

  // ✅ METADATA
  @IsOptional()
  @IsEnum(['Casa', 'Trabajo', 'Otro'], {
    message: 'La etiqueta debe ser: Casa, Trabajo, o Otro',
  })
  label?: 'Casa' | 'Trabajo' | 'Otro';

  @IsOptional()
  @IsBoolean({ message: 'isDefault debe ser true o false' })
  isDefault?: boolean = false;
}
