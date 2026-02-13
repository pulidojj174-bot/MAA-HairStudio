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
  quote_id?: string; // ID de cotización previa
  declared_value: number;
  items: ZipnovaShippingItem[];
  destination: {
    city: string;
    state: string;
    zipcode: string;
    full_name: string;
    phone: string;
    email: string;
    address: string;
    number: string;
    floor?: string;
    apartment?: string;
    instructions?: string;
  };
  reference: string; // Referencia interna (ej: número de orden)
  delivery_type: 'delivery' | 'pickup';
}

/**
 * Respuesta de creación de envío
 */
export interface ZipnovaShipmentResponse {
  id: string; // ID del envío en Zipnova
  status: string; // Estado del envío
  tracking_number: string; // Número de rastreo
  carrier: string;
  service: string;
  estimated_delivery: string; // Fecha estimada
  label_url?: string; // URL de la etiqueta
  reference: string;
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
