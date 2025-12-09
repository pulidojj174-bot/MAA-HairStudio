import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Length,
  IsNumber,
  Min,
  Max,
  Matches,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateSubcategoryDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @Length(1, 100, { message: 'El nombre debe tener entre 1 y 100 caracteres.' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsString({ message: 'El slug debe ser una cadena de texto.' })
  @Length(1, 120, { message: 'El slug debe tener entre 1 y 120 caracteres.' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug debe contener solo letras minúsculas, números y guiones.',
  })
  @Transform(({ value }) => value?.trim().toLowerCase())
  slug?: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto.' })
  @Length(1, 500, { message: 'La descripción debe tener máximo 500 caracteres.' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsUUID('4', { message: 'El ID de categoría debe ser un UUID v4 válido.' })
  categoryId: string;

  // ✅ NUEVOS CAMPOS
  @IsOptional()
  @IsNumber({}, { message: 'El orden de visualización debe ser un número.' })
  @Min(0, { message: 'El orden no puede ser negativo.' })
  @Max(9999, { message: 'El orden no puede exceder 9999.' })
  @Type(() => Number)
  displayOrder?: number = 0;

  @IsOptional()
  @IsString({ message: 'El color debe ser una cadena de texto.' })
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'El color debe ser un código hexadecimal válido (ej: #FF5733).',
  })
  @Transform(({ value }) => value?.toUpperCase())
  color?: string;

  @IsOptional()
  @IsString({ message: 'El icono debe ser una cadena de texto.' })
  @Length(1, 50, { message: 'El icono debe tener máximo 50 caracteres.' })
  @Transform(({ value }) => value?.trim())
  icon?: string;

}
