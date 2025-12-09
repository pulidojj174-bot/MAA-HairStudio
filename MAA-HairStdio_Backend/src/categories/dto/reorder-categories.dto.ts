import { IsArray, IsUUID, IsNumber, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryOrderDto {
  @IsUUID('4', { message: 'El ID debe ser un UUID válido' })
  id: string;

  @IsNumber({}, { message: 'displayOrder debe ser un número' })
  @Min(0, { message: 'displayOrder debe ser mayor o igual a 0' })
  displayOrder: number;
}

export class ReorderCategoriesDto {
  @IsArray({ message: 'Debe ser un array de órdenes de categorías' })
  @ValidateNested({ each: true })
  @Type(() => CategoryOrderDto)
  categories: CategoryOrderDto[];
}