export class ProcessWebhookDto {
  resource?: string; // "/v1/payments/12345"
  topic: string; // "payment"
  id: string;
  action?: string;
}

export class MercadoPagoWebhookEventDto {
  payment_id?: number;
  merchant_order_id?: number;
  external_reference?: string;
  payer_id?: number;
  id?: string;
  topic?: string;
}