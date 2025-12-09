import { 
  IsUUID, 
  IsInt, 
  Min, 
  Max, 
  IsOptional, 
  IsString,
  Length,
  IsEnum
} from 'class-validator';
import { Type } from 'class-transformer';

export enum UpdateAction {
  SET = 'set',
  INCREMENT = 'increment', 
  DECREMENT = 'decrement'
}

export class UpdateCartItemDto {
  @IsUUID('4', { message: 'El productId debe ser un UUID v4 válido' })
  productId: string;

  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(0, { message: 'La cantidad mínima es 0 (eliminar producto)' })
  @Max(50, { message: 'La cantidad máxima es 50 por producto' })
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsEnum(UpdateAction, { message: 'La acción debe ser: set, increment, o decrement' })
  action?: UpdateAction = UpdateAction.SET;

  @IsOptional()
  @IsString({ message: 'La nota debe ser texto' })
  @Length(1, 500, { message: 'La nota debe tener entre 1 y 500 caracteres' })
  note?: string;
}
