import { 
  IsUUID, 
  IsOptional, 
  IsString, 
  Length,
  IsEnum 
} from 'class-validator';

export class AddToWishlistDto {
  @IsUUID('4', { message: 'El productId debe ser un UUID v4 válido' })
  productId: string;

  @IsOptional()
  @IsString({ message: 'La nota debe ser texto' })
  @Length(1, 500, { message: 'La nota debe tener entre 1 y 500 caracteres' })
  note?: string;

  @IsOptional()
  @IsEnum(['private', 'public', 'shared'], { 
    message: 'La visibilidad debe ser: private, public, o shared' 
  })
  visibility?: 'private' | 'public' | 'shared';
}