// ✅ INTERFAZ PARA ZIPNOVA API

/**
 * Estructura de un item para cotización de envío
 */
export interface ZipnovaShippingItem {
  sku: string;
  weight: number; // en gramos
  height: number; // en cm
  width: number; // en cm
  length: number; // en cm
  description: string;
  quantity?: number;
  classification_id?: number; // ID de clasificación de aduanas
}

/**
 * Información de destino para cotización
 */
export interface ZipnovaDestination {
  city: string;
  state: string; // provincia
  zipcode: string;
  country?: string;
}

/**
 * Request para cotizar envío (basado en items - recomendado)
 * POST /v2/shipments/quote
 * Docs: https://docs.zipnova.com/envios/recursos-api/envios/cotizar-envios
 */
export interface ZipnovaQuoteRequest {
  account_id: string;
  origin_id: string;
  declared_value: number;
  items: ZipnovaShippingItem[];
  destination: ZipnovaDestination;
  delivery_type?: 'delivery' | 'pickup';
  source?: string; // Identifica tu integración (para Motor de Reglas)
}

/**
 * Estructura de un resultado de cotización (dentro de all_results[])
 * Docs: https://docs.zipnova.com/envios/recursos-api/envios/cotizar-envios
 */
export interface ZipnovaQuoteResult {
  selectable: boolean;
  impediments: string | null;
  logistic_type: string; // "crossdock", "carrier_dropoff", "carrier_pickup", etc.
  carrier: {
    id: number;
    name: string;
    rating: number;
    logo: string;
  };
  service_type: {
    id: number;
    code: string; // "standard_delivery", "pickup_point", etc.
    name: string;
    is_urgent: number;
  };
  delivery_time: {
    min: number;
    max: number;
    estimated_delivery?: string;
  };
  amounts: {
    price_shipment: number;    // Precio del flete sin seguro
    price_insurance: number;   // Precio del seguro
    price: number;             // Total sin IVA (flete + seguro)
    price_incl_tax: number;    // Total con IVA
    seller_price?: number;     // Lo que paga el vendedor (sin IVA)
    seller_price_incl_tax?: number; // Lo que paga el vendedor (con IVA)
  };
  rate: {
    source: string;
    id: number;
    tariff_id: number;
  };
  tags: string[]; // "cheapest", "fastest", etc.
  pickup_points?: Array<{
    point_id: number;
    description: string;
    location: {
      street: string;
      street_number: string;
      city: string;
      state: string;
      zipcode: string;
    };
    phone?: string;
  }>;
}

/**
 * Respuesta completa de cotización
 */
export interface ZipnovaQuoteResponse {
  sorted_by: string;
  origin: any;
  destination: {
    id: number;
    city: string;
    state: string;
    zipcode: string;
  };
  packages: any[];
  declared_value: number;
  results: Record<string, ZipnovaQuoteResult>; // Keyed by service_type code
  all_results: ZipnovaQuoteResult[];
}

/**
 * Request para crear envío (basado en items - recomendado)
 * POST /v2/shipments
 * Docs: https://docs.zipnova.com/envios/recursos-api/envios/crear-envios
 *
 * IMPORTANTE: logistic_type, service_type y carrier_id deben venir de la cotización previa.
 * Si es pickup_point, también se necesita point_id.
 */
export interface ZipnovaShipmentRequest {
  account_id: string;
  origin_id: string;
  logistic_type: string;   // De la cotización: "crossdock", "carrier_dropoff", "carrier_pickup"
  service_type: string;    // De la cotización: "standard_delivery", "pickup_point"
  carrier_id: number;      // De la cotización: carrier.id
  external_id: string;     // ID externo (nuestro orderNumber)
  declared_value: number;
  source?: string;         // Identifica tu integración
  point_id?: number;       // Solo para pickup_point: ID del punto de retiro
  items: ZipnovaShippingItem[];
  destination: {
    name: string;
    document: string;
    phone: string;
    email: string;
    city: string;
    state: string;
    zipcode: string;
    street: string;
    street_number: string;
    floor?: string;
    apartment?: string;
    instructions?: string;
  };
  delivery_type: 'delivery' | 'pickup';
}

/**
 * Respuesta de creación de envío
 * Docs: https://docs.zipnova.com/envios/recursos-api/envios/crear-envios
 */
export interface ZipnovaShipmentResponse {
  id: number;
  external_id: string;
  delivery_id: string; // Ej: "0999-00151060"
  carrier_tracking_id: string | null;
  created_at: string;
  account_id: number;
  parent_shipment_id: number | null;
  logistic_type: string;
  service_type: string;
  carrier: {
    id: number;
    name: string;
    logo: string;
  };
  status: string; // "new", "ready_to_ship", "in_transit", "delivered", etc.
  status_name: string; // "Procesando", "En tránsito", etc.
  tracking: string; // URL de tracking interna de Zipnova
  tracking_external: string; // URL de tracking pública
  destination: {
    name: string;
    document: string;
    street: string;
    street_number: string;
    street_extras: string;
    city: string;
    state: string;
    zipcode: string;
    phone: string;
    email: string;
  };
  origin: {
    id: number;
    name: string;
    document: string;
    street: string;
    street_number: string;
    street_extras: string;
    city: string;
    state: string;
    zipcode: string;
    phone: string;
    email: string;
  };
  declared_value: number;
  price: number; // Sin IVA
  price_incl_tax: number; // Con IVA
  total_weight: number;
  total_volume: number;
  packages: any[];
  tags: string[];
  [key: string]: any;
}

/**
 * Estado del envío
 */
export interface ZipnovaShipmentStatus {
  id: string;
  status: string; // in_transit, delivered, pending, etc.
  tracking_number: string;
  last_update: string;
  estimated_delivery?: string;
  events?: Array<{
    date: string;
    status: string;
    description: string;
    location?: string;
  }>;
}
