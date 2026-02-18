import { IsUUID, IsNumber, IsString, IsOptional, IsEnum, IsArray, Min } from 'class-validator';
import { ShippingCarrier, ShippingService } from '../entities/shipment.entity';

// ✅ DTO PARA COTIZAR ENVÍO
export class QuoteShippingDto {
  @IsUUID()
  orderId: string; // ID de la orden

  @IsUUID()
  destinationAddressId: string; // ID de dirección de destino

  @IsOptional()
  @IsString()
  deliveryType?: 'delivery' | 'pickup';
}

// ✅ DTO PARA CREAR ENVÍO
export class CreateShippingDto {
  @IsUUID()
  orderId: string;

  @IsUUID()
  destinationAddressId: string;

  @IsString()
  zipnovaQuoteId: string; // ID del carrier de la cotización (ej: "208" para OCA)

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  shippingCost: number;

  @IsOptional()
  @IsString()
  serviceType?: string; // "standard_delivery" | "pickup_point" (default: standard_delivery)

  @IsOptional()
  @IsString()
  pickupBranchId?: string; // Para retiro

  @IsOptional()
  @IsString()
  observations?: string;
}

// ✅ DTO PARA ACTUALIZAR ESTADO
export class UpdateShippingStatusDto {
  @IsEnum(['pending', 'quoted', 'confirmed', 'in_transit', 'delivered', 'failed', 'cancelled'])
  status: string;

  @IsOptional()
  @IsString()
  description?: string;
}

// ✅ RESPUESTA DE COTIZACIÓN
export class ShippingQuoteResponseDto {
  success: boolean;
  message: string;
  data: {
    options: Array<{
      id: string;
      carrier: string;
      service: string;
      price: number;
      estimatedDays: number;
      observations?: string;
    }>;
  };
}

// ✅ RESPUESTA DE ENVÍO
export class ShippingResponseDto {
  success: boolean;
  message: string;
  data: {
    id: string;
    status: string;
    trackingNumber: string;
    carrier: string;
    service: string;
    shippingCost: number;
    estimatedDeliveryDate: string;
    labelUrl?: string;
  };
}

// ✅ DTO PARA ACTUALIZAR ESTADO DE ZIPNOVA
export class SyncShippingStatusDto {
  @IsString()
  zipnovaShipmentId: string;
}
