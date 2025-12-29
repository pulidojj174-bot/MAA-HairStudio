export class ProcessWebhookDto {
  // Formato viejo de Mercado Pago
  resource?: string; // "/v1/payments/12345"
  topic?: string; // "payment" | "merchant_order"
  
  // Formato nuevo IPN de Mercado Pago
  type?: string; // "payment" | "merchant_order"
  action?: string;
  data?: {
    id: string;
  };
  
  // Common fields
  id?: string;
}

export class MercadoPagoWebhookEventDto {
  payment_id?: number;
  merchant_order_id?: number;
  external_reference?: string;
  payer_id?: number;
  id?: string;
  topic?: string;
  type?: string;
}