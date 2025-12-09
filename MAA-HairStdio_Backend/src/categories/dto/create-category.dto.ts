import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  MaxLength, 
  MinLength,
  IsInt,
  Min,
  Max,
  Matches,
  IsHexColor
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres.' })
  @Transform(({ value }) => value?.trim()) // ✅ Limpiar espacios
  name: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto.' })
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres.' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsString({ message: 'El slug debe ser una cadena de texto.' })
  @MaxLength(120, { message: 'El slug no puede exceder 120 caracteres.' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug debe contener solo letras minúsculas, números y guiones.'
  })
  slug?: string;

  @IsOptional()
  @IsString({ message: 'La imagen debe ser una URL válida.' })
  @MaxLength(255, { message: 'La URL de imagen es demasiado larga.' })
  image?: string;

  @IsOptional()
  @IsString({ message: 'El icono debe ser una cadena de texto.' })
  @MaxLength(50, { message: 'El icono no puede exceder 50 caracteres.' })
  icon?: string;

  @IsOptional()
  @IsInt({ message: 'El orden debe ser un número entero.' })
  @Min(0, { message: 'El orden debe ser mayor o igual a 0.' })
  @Max(999, { message: 'El orden no puede exceder 999.' })
  displayOrder?: number;

  @IsOptional()
  @IsHexColor({ message: 'El color debe ser un código hexadecimal válido (ej: #FF0000).' })
  color?: string;
}
