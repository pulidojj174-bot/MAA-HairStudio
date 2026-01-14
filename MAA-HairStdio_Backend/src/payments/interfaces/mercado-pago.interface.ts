export interface MercadoPagoPreferenceItem {
  id?: string; // ✅ ID opcional para el SDK
  title: string;
  quantity: number;
  unit_price: number;
  description?: string;
  picture_url?: string;
  category_id?: string; // ✅ NUEVO: Categoría del item para mejorar aprobación de pagos
}

export interface MercadoPagoPreference {
  items: MercadoPagoPreferenceItem[];
  payer: {
    name?: string;
    email: string;
    phone?: {
      area_code?: string;
      number?: string;
    };
    address?: {
      street_name?: string;
      street_number?: string; // ✅ Cambiado a string para coincidir con SDK
      zip_code?: string;
    };
  };
  back_urls?: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return?: 'approved' | 'all';
  external_reference: string; // Order ID
  notification_url?: string;
  metadata?: Record<string, any>;
}

export interface MercadoPagoPaymentData {
  id: number;
  status: string;
  status_detail: string;
  amount: number;
  currency_id: string;
  payment_method_id: string;
  payment_type_id: string;
  transaction_amount: number;
  external_reference: string;
  payer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  date_created: string;
  date_approved?: string;
}

export interface MercadoPagoWebhookPayload {
  resource: string; // ej: "/v1/payments/12345"
  topic: string; // ej: "payment"
  id: string;
  action: string;
}