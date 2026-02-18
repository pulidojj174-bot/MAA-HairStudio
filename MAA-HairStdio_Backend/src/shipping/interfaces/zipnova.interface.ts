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
 * Request para cotizar envío
 */
export interface ZipnovaQuoteRequest {
  account_id: string; // ID de cuenta en Zipnova
  origin_id: string; // ID de sucursal origen
  declared_value: number; // Valor declarado en pesos
  items: ZipnovaShippingItem[];
  destination: ZipnovaDestination;
  delivery_type?: 'delivery' | 'pickup'; // Tipo de entrega
}

/**
 * Respuesta de cotización
 */
export interface ZipnovaQuoteResponse {
  id: string; // ID de la cotización
  carrier: string; // Transportista (ej: "OCA", "Andreani")
  service: string; // Servicio (ej: "express", "standard")
  estimated_days: number; // Días estimados de entrega
  price: number; // Precio del envío
  base_price: number;
  taxes: number;
  insurance: number;
  observations?: string;
  status: string;
}

/**
 * Opciones de envío disponibles
 */
export interface ZipnovaShippingOption {
  id: string;
  carrier: string;
  service: string;
  price: number;
  estimated_days: number;
  currency: string;
}

/**
 * Request para crear envío
 */
export interface ZipnovaShipmentRequest {
  account_id: string;
  origin_id: string;
  service_type: string; // "standard_delivery" | "pickup_point" etc.
  external_id: string; // ID externo (nuestro orderNumber)
  declared_value: number;
  items: ZipnovaShippingItem[];
  destination: {
    name: string; // Nombre del destinatario
    document: string; // DNI/CUIT del destinatario
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
 * Respuesta de creación de envío (estructura real de Zipnova)
 */
export interface ZipnovaShipmentResponse {
  id: string | number;
  status: string;
  tracking_number?: string;
  external_id?: string;
  carrier: string | { id: number; name: string; logo?: string };
  service: string | { id: number; code: string; name: string };
  service_type?: { id: number; code: string; name: string };
  estimated_delivery?: string;
  delivery_time?: { min?: number; max?: number; estimated_delivery?: string };
  estimated_days?: number;
  label_url?: string;
  label?: { url?: string };
  reference?: string;
  amounts?: { price?: number; price_incl_tax?: number };
  [key: string]: any; // permitir campos extra
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
