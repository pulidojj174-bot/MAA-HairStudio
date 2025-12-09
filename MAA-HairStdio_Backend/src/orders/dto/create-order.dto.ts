import { 
  IsEnum, 
  IsOptional, 
  IsString, 
  IsUUID, 
  ValidateIf, 
  IsNumber, 
  Min, 
  IsBoolean 
} from 'class-validator';
import { DeliveryType, OrderStatus, PaymentStatus } from '../orders.entity';

// ✅ DTO para crear orden desde carrito (SIN CAMBIOS)
export class CreateOrderFromCartDto {
  @IsEnum(DeliveryType, { 
    message: 'El tipo de entrega debe ser pickup o delivery' 
  })
  deliveryType: DeliveryType;

  @ValidateIf(o => o.deliveryType === DeliveryType.DELIVERY)
  @IsUUID('4', { message: 'El ID de dirección debe ser un UUID v4 válido' })
  shippingAddressId?: string;

  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  notes?: string;
}

// ✅ ELIMINAR: SetShippingCostDto (ya no se necesita)
// ✅ ELIMINAR: ConfirmOrderDto (ya no se necesita)

// ✅ DTO para actualizar estado de orden (SIN CAMBIOS)
export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: 'Estado de orden inválido.' })
  status: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'Estado de pago inválido.' })
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  notes?: string;
}