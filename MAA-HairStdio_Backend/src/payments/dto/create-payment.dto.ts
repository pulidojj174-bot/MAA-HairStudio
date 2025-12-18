import { IsUUID, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsUUID('4')
  orderId: string;

  @IsOptional()
  @IsString()
  returnUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PaymentResponseDto {
  success: boolean;
  message: string;
  data: {
    paymentId: string;
    preferenceId: string;
    initPoint: string; // URL para redirigir al usuario
    sandboxInitPoint?: string; // URL sandbox para testing
    orderId: string;
    amount: number;
    currency: string;
    expiresAt: Date;
  };
}