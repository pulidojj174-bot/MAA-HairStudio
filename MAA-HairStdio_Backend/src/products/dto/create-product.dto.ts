import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsUrl,
  IsEnum,
  Min,
  Max,
  Length,
  Matches,
  IsUUID,
  ArrayMaxSize,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { HairType, DesiredResult, ProductType } from '../product.entity';

export class CreateProductDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @Length(1, 255, { message: 'El nombre debe tener entre 1 y 255 caracteres.' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsString({ message: 'El slug debe ser una cadena de texto.' })
  @Length(1, 255, { message: 'El slug debe tener entre 1 y 255 caracteres.' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug debe contener solo letras minúsculas, números y guiones.',
  })
  @Transform(({ value }) => value?.trim().toLowerCase())
  slug?: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La descripción es obligatoria.' })
  @Length(10, 2000, { message: 'La descripción debe tener entre 10 y 2000 caracteres.' })
  @Transform(({ value }) => value?.trim())
  description: string;

  @IsOptional()
  @IsString({ message: 'La descripción corta debe ser una cadena de texto.' })
  @Length(10, 500, { message: 'La descripción corta debe tener entre 10 y 500 caracteres.' })
  @Transform(({ value }) => value?.trim())
  shortDescription?: string;

  // ✅ CAMPOS ESPECÍFICOS DE PELUQUERÍA con Enums
  @IsOptional()
  @IsEnum(HairType, {
    message: `El tipo de cabello debe ser uno de: ${Object.values(HairType).join(', ')}`,
  })
  type_hair?: HairType;

  @IsOptional()
  @IsEnum(DesiredResult, {
    message: `El resultado deseado debe ser uno de: ${Object.values(DesiredResult).join(', ')}`,
  })
  desired_result?: DesiredResult;

  // ✅ NUEVO CAMPO: TYPE_PRODUCT
  @IsOptional()
  @IsEnum(ProductType, {
    message: `El tipo de producto debe ser uno de: ${Object.values(ProductType).join(', ')}`,
  })
  type_product?: ProductType;

  // ✅ PRICING con validaciones robustas
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio debe ser un número con máximo 2 decimales.' })
  @Min(0.01, { message: 'El precio debe ser mayor a 0.' })
  @Max(999999.99, { message: 'El precio no puede exceder 999,999.99.' })
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio original debe ser un número con máximo 2 decimales.' })
  @Min(0.01, { message: 'El precio original debe ser mayor a 0.' })
  @Max(999999.99, { message: 'El precio original no puede exceder 999,999.99.' })
  @Type(() => Number)
  originalPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El porcentaje de descuento debe ser un número.' })
  @Min(0, { message: 'El descuento no puede ser negativo.' })
  @Max(100, { message: 'El descuento no puede exceder 100%.' })
  @Type(() => Number)
  discountPercentage?: number = 0;

  // ✅ INVENTARIO
  @IsOptional()
  @IsNumber({}, { message: 'El stock debe ser un número entero.' })
  @Min(0, { message: 'El stock no puede ser negativo.' })
  @Type(() => Number)
  stock?: number = 0;

  @IsOptional()
  @IsNumber({}, { message: 'El stock mínimo debe ser un número entero.' })
  @Min(0, { message: 'El stock mínimo no puede ser negativo.' })
  @Type(() => Number)
  minStock?: number = 5;

  @IsOptional()
  @IsBoolean({ message: 'trackInventory debe ser un valor booleano.' })
  @Transform(({ value }) => value === 'true' || value === true)
  trackInventory?: boolean = true;

  // ✅ RELACIÓN
  @IsUUID('4', { message: 'El ID de subcategoría debe ser un UUID v4 válido.' })
  subcategoryId: string;

  // ✅ MULTIMEDIA
  @IsUrl({}, { message: 'La imagen debe ser una URL válida.' })
  @IsNotEmpty({ message: 'La imagen es obligatoria.' })
  image: string;

  @IsOptional()
  @IsArray({ message: 'Las imágenes deben ser un arreglo.' })
  @ArrayMaxSize(10, { message: 'No se pueden agregar más de 10 imágenes.' })
  @IsUrl({}, { each: true, message: 'Cada imagen debe ser una URL válida.' })
  images?: string[];

  @IsOptional()
  @IsUrl({}, { message: 'El video debe ser una URL válida.' })
  @Length(1, 500, { message: 'La URL del video debe tener máximo 500 caracteres.' })
  videoUrl?: string;

  // ✅ DETALLES DEL PRODUCTO
  @IsOptional()
  @IsString({ message: 'La marca debe ser una cadena de texto.' })
  @Length(1, 100, { message: 'La marca debe tener entre 1 y 100 caracteres.' })
  @Transform(({ value }) => value?.trim())
  brand?: string;

  // ✅ NUEVO CAMPO: COLLECTION
  @IsOptional()
  @IsString({ message: 'La colección debe ser una cadena de texto.' })
  @Length(1, 100, { message: 'La colección debe tener entre 1 y 100 caracteres.' })
  @Transform(({ value }) => value?.trim())
  collection?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El tamaño debe ser un número.' })
  @Min(0.01, { message: 'El tamaño debe ser mayor a 0.' })
  @Type(() => Number)
  size?: number;

  @IsOptional()
  @IsString({ message: 'El volumen debe ser una cadena de texto.' })
  @Length(1, 50, { message: 'El volumen debe tener máximo 50 caracteres.' })
  @Matches(/^\d+(\.\d{1,2})?(ml|l|kg|g|oz|fl oz)$/i, {
    message: 'El volumen debe tener el formato: número + unidad (ej: 500ml, 1.5l)',
  })
  @Transform(({ value }) => value?.trim().toLowerCase())
  volume?: string;

  @IsOptional()
  @IsString({ message: 'El SKU debe ser una cadena de texto.' })
  @Length(1, 100, { message: 'El SKU debe tener máximo 100 caracteres.' })
  @Transform(({ value }) => value?.trim().toUpperCase())
  sku?: string;

  @IsOptional()
  @IsString({ message: 'El código de barras debe ser una cadena de texto.' })
  @Length(1, 50, { message: 'El código de barras debe tener máximo 50 caracteres.' })
  barcode?: string;

  // ✅ ESTADOS
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser un valor booleano.' })
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean = true;

  @IsOptional()
  @IsBoolean({ message: 'isFeatured debe ser un valor booleano.' })
  @Transform(({ value }) => value === 'true' || value === true)
  isFeatured?: boolean = false;

  // ✅ SEO
  @IsOptional()
  @IsString({ message: 'La meta descripción debe ser una cadena de texto.' })
  @Length(1, 160, { message: 'La meta descripción debe tener máximo 160 caracteres.' })
  @Transform(({ value }) => value?.trim())
  metaDescription?: string;

  @IsOptional()
  @IsArray({ message: 'Las etiquetas deben ser un arreglo.' })
  @ArrayMaxSize(20, { message: 'No se pueden agregar más de 20 etiquetas.' })
  @IsString({ each: true, message: 'Cada etiqueta debe ser una cadena de texto.' })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((tag) => tag?.toString().trim().toLowerCase()).filter(Boolean)
      : [],
  )
  tags?: string[];
}

// ✅ Exportar enums para reutilización
export { HairType, DesiredResult, ProductType };
