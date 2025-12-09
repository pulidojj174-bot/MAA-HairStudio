import { 
  IsUUID, 
  IsInt, 
  Min, 
  Max, 
  IsOptional, 
  IsString,
  Length 
} from 'class-validator';
import { Type } from 'class-transformer';

export class MoveToCartDto {
  @IsUUID('4', { message: 'El productId debe ser un UUID v4 válido' })
  productId: string;

  @IsOptional()
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad mínima es 1' })
  @Max(50, { message: 'La cantidad máxima es 50' })
  @Type(() => Number)
  quantity?: number = 1;

  @IsOptional()
  removeFromWishlist?: boolean = true;

  @IsOptional()
  @IsString({ message: 'La nota debe ser texto' })
  @Length(1, 500, { message: 'La nota debe tener entre 1 y 500 caracteres' })
  note?: string;
}