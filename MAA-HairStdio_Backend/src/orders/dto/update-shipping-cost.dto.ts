import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateShippingCostDto {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El costo de envio debe ser un numero valido' })
  @Min(0, { message: 'El costo de envio no puede ser negativo' })
  shippingCost: number;

  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  notes?: string;
}
