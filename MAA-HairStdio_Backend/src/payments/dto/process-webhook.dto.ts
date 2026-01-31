// ✅ DTO que coincide EXACTAMENTE con el webhook de Mercado Pago
export class ProcessWebhookDto {
  // ═══════════════════════════════════════════════════════════════
  // FORMATO NUEVO DE MERCADO PAGO (Webhooks v2)
  // ═══════════════════════════════════════════════════════════════
  
  // Acción del evento: "payment.created", "payment.updated", etc.
  action?: string;
  
  // Versión de la API
  api_version?: string; // "v1"
  
  // Datos del recurso
  data?: {
    id: string; // ID del pago: "143339147743"
  };
  
  // Fecha de creación del evento
  date_created?: string; // "2026-01-29T21:13:47Z"
  
  // ID único del evento webhook (número grande)
  id?: number | string; // 128518749007
  
  // Indica si es producción o sandbox
  live_mode?: boolean; // true = producción, false = sandbox
  
  // Tipo de recurso: "payment", "merchant_order", etc.
  type?: string;
  
  // ID del vendedor en Mercado Pago
  user_id?: string; // "5645055"

  // ═══════════════════════════════════════════════════════════════
  // FORMATO ANTIGUO IPN (Todavía puede llegar)
  // ═══════════════════════════════════════════════════════════════
  
  // URL del recurso en formato IPN viejo
  resource?: string; // "/v1/payments/12345"
  
  // Topic en formato IPN viejo
  topic?: string; // "payment" | "merchant_order"
}

// DTO adicional para eventos más detallados
export class MercadoPagoWebhookEventDto {
  payment_id?: number;
  merchant_order_id?: number;
  external_reference?: string;
  payer_id?: number;
  id?: number | string;
  topic?: string;
  type?: string;
  action?: string;
  api_version?: string;
  live_mode?: boolean;
  user_id?: string;
  date_created?: string;
  data?: {
    id: string;
  };
}