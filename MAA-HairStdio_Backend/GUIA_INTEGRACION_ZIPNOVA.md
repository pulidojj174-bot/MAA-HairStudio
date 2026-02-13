# Guía de Integración Zipnova - Módulo de Envíos

## Descripción General

Este módulo integra la API de Zipnova para gestionar cotizaciones y envíos de pedidos. Zipnova ofrece una plataforma de logística que permite cotizar y crear shipments con múltiples transportistas en Argentina, Chile y México.

**Versión API**: v2  
**Base URL**: `https://api.zipnova.{country}/v2`

---

## 1. Configuración Inicial

### 1.1 Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============= ZIPNOVA SHIPPING =============
# País: ar (Argentina), cl (Chile), mx (México)
ZIPNOVA_COUNTRY=ar

# API Token y Secret para autenticación HTTP Basic
ZIPNOVA_API_TOKEN=your_zipnova_api_token
ZIPNOVA_API_SECRET=your_zipnova_api_secret

# Account ID y Origin ID para crear envíos
ZIPNOVA_ACCOUNT_ID=your_zipnova_account_id
ZIPNOVA_ORIGIN_ID=your_zipnova_origin_id
```

### 1.2 Obtener Credenciales

1. Regístrate en [Zipnova](https://www.zipnova.com)
2. Ve a la sección de configuración/API
3. Copia tu **API Token** y **API Secret**
4. Configura tu **Account ID** y **Origin ID** (ubicaciones)

---

## 2. Estructura del Módulo

```
src/shipping/
├── shipping.module.ts          # Definición del módulo
├── shipping.controller.ts       # Endpoints REST
├── shipping.service.ts          # Lógica de negocio
├── dto/
│   └── shipping.dto.ts         # DTOs de validación
├── entities/
│   └── shipment.entity.ts       # Modelo de BD
└── interfaces/
    └── zipnova.interface.ts     # Interfaces de Zipnova
```

---

## 3. Endpoints Disponibles

### 3.1 Cotizar Envío

**Endpoint**: `POST /api/v1/shipping/quote`

**Descripción**: Obtiene opciones de envío disponibles para un pedido

**Autenticación**: JWT requerido

**Request Body**:
```json
{
  "orderId": "uuid",
  "destinationAddressId": "uuid",
  "deliveryType": "delivery"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Cotización obtenida exitosamente",
  "data": [
    {
      "id": "quote_id_123",
      "carrier": "oca",
      "service": "express",
      "estimatedDays": 2,
      "price": 450.00,
      "description": "OCA Express - 2 días"
    },
    {
      "id": "quote_id_456",
      "carrier": "andreani",
      "service": "standard",
      "estimatedDays": 3,
      "price": 320.00,
      "description": "Andreani Standard - 3 días"
    }
  ]
}
```

---

### 3.2 Crear Envío

**Endpoint**: `POST /api/v1/shipping/create`

**Descripción**: Crea un shipment en Zipnova después de seleccionar una cotización

**Autenticación**: JWT requerido

**Request Body**:
```json
{
  "orderId": "uuid",
  "destinationAddressId": "uuid",
  "zipnovaQuoteId": "quote_id_123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Envío creado exitosamente",
  "data": {
    "id": "shipment_uuid",
    "zipnovaShipmentId": "zipnova_123",
    "status": "confirmed",
    "carrier": "oca",
    "service": "express",
    "trackingNumber": "TRK123456789",
    "shippingCost": 450.00,
    "estimatedDeliveryDate": "2024-12-20",
    "labelUrl": "https://zipnova.com/labels/123.pdf"
  }
}
```

---

### 3.3 Obtener Estado del Envío

**Endpoint**: `GET /api/v1/shipping/:shipmentId`

**Descripción**: Consulta el estado actual de un envío

**Autenticación**: JWT requerido

**Response**:
```json
{
  "success": true,
  "message": "Estado del envío",
  "data": {
    "id": "shipment_uuid",
    "status": "in_transit",
    "trackingNumber": "TRK123456789",
    "carrier": "oca",
    "service": "express",
    "lastUpdate": "2024-12-19T10:30:00Z",
    "estimatedDeliveryDate": "2024-12-20"
  }
}
```

---

### 3.4 Obtener Envío por Orden

**Endpoint**: `GET /api/v1/shipping/order/:orderId`

**Descripción**: Obtiene el envío asociado a una orden

**Autenticación**: JWT requerido

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "shipment_uuid",
    "status": "confirmed",
    "trackingNumber": "TRK123456789",
    "carrier": "oca",
    "service": "express",
    "shippingCost": 450.00,
    "estimatedDeliveryDate": "2024-12-20",
    "labelUrl": "https://zipnova.com/labels/123.pdf"
  }
}
```

---

## 4. Flujo de Proceso

### Flujo Completo de Envío

```
1. Cliente confirma orden
   ↓
2. Sistema calcula envío (si es delivery)
   ↓
3. Cliente solicita cotización → POST /shipping/quote
   ↓
4. Zipnova devuelve opciones disponibles
   ↓
5. Cliente selecciona opción
   ↓
6. Sistema crea shipment → POST /shipping/create
   ↓
7. Zipnova genera etiqueta de envío
   ↓
8. Cliente puede rastrear → GET /shipping/:shipmentId
```

### Estatus de Envío

| Estado | Descripción |
|--------|-------------|
| `PENDING` | Pendiente de cotización |
| `QUOTED` | Cotización obtenida |
| `CONFIRMED` | Confirmado y listo para retirar |
| `IN_TRANSIT` | En tránsito |
| `DELIVERED` | Entregado |
| `FAILED` | Falló el envío |
| `CANCELLED` | Cancelado |

### Transportistas Soportados

| Código | Transportista |
|--------|-----|
| `oca` | OCA |
| `andreani` | Andreani |
| `correo_argentino` | Correo Argentino |
| `fedex` | FedEx |
| `dhl` | DHL |
| `other` | Otro |

### Servicios Disponibles

| Código | Servicio |
|--------|---------|
| `express` | Express |
| `standard` | Standard |
| `economy` | Económico |
| `pickup` | Retiro en sucursal |

---

## 5. Integración con Órdenes

### Actualización de Estado de Orden

Cuando se crea un envío, el estado de la orden cambia:

```typescript
// Antes: AWAITING_SHIPPING_COST
order.status = OrderStatus.SHIPPING_COST_SET;
order.shippingCost = 450.00;
order.isShippingCostSet = true;

// Después: PAID (cuando el cliente confirma el pago)
order.status = OrderStatus.PAID;
order.paymentStatus = PaymentStatus.APPROVED;

// Luego: PROCESSING (cuando se crea el shipment)
order.status = OrderStatus.PROCESSING;

// Finalmente: SHIPPED / DELIVERED
order.status = OrderStatus.SHIPPED;
```

### Relación de Datos

```
Order (1) ←→ (1) Shipment
  ↓
  Address (destino)

Shipment contiene:
- Orden relacionada
- Dirección de destino
- Información de Zipnova
- Estado del envío
- Número de rastreo
- Etiqueta de envío (PDF)
```

---

## 6. Ejemplo de Uso en Frontend (Angular)

### 6.1 Módulo de Servicio

```typescript
// shipping.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ShippingService {
  private apiUrl = 'http://localhost:3000/api/v1/shipping';

  constructor(private http: HttpClient) {}

  // Cotizar envío
  quoteShipping(orderId: string, destinationAddressId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/quote`, {
      orderId,
      destinationAddressId,
      deliveryType: 'delivery'
    });
  }

  // Crear envío
  createShipment(orderId: string, destinationAddressId: string, zipnovaQuoteId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, {
      orderId,
      destinationAddressId,
      zipnovaQuoteId
    });
  }

  // Obtener estado
  getShipmentStatus(shipmentId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${shipmentId}`);
  }

  // Obtener envío de orden
  getShipmentByOrder(orderId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/order/${orderId}`);
  }
}
```

### 6.2 Componente Ejemplo

```typescript
// shipping.component.ts
import { Component, OnInit } from '@angular/core';
import { ShippingService } from './shipping.service';

@Component({
  selector: 'app-shipping',
  templateUrl: './shipping.component.html'
})
export class ShippingComponent implements OnInit {
  orderId: string = '';
  destinationAddressId: string = '';
  quotes: any[] = [];
  selectedQuoteId: string = '';
  shipment: any = null;
  loading: boolean = false;

  constructor(private shippingService: ShippingService) {}

  ngOnInit() {
    // Cargar datos de la orden
  }

  // Obtener cotizaciones
  getQuotes() {
    this.loading = true;
    this.shippingService.quoteShipping(this.orderId, this.destinationAddressId)
      .subscribe(
        (response) => {
          this.quotes = response.data;
          this.loading = false;
        },
        (error) => {
          console.error('Error obteniendo cotizaciones', error);
          this.loading = false;
        }
      );
  }

  // Crear envío con la cotización seleccionada
  createShipment() {
    if (!this.selectedQuoteId) {
      alert('Selecciona una opción de envío');
      return;
    }

    this.loading = true;
    this.shippingService.createShipment(
      this.orderId,
      this.destinationAddressId,
      this.selectedQuoteId
    ).subscribe(
      (response) => {
        this.shipment = response.data;
        console.log('Envío creado exitosamente', this.shipment);
        this.loading = false;
      },
      (error) => {
        console.error('Error creando envío', error);
        this.loading = false;
      }
    );
  }

  // Rastrear envío
  trackShipment() {
    if (!this.shipment?.id) {
      alert('No hay envío para rastrear');
      return;
    }

    this.shippingService.getShipmentStatus(this.shipment.id)
      .subscribe(
        (response) => {
          console.log('Estado actualizado', response.data);
        },
        (error) => {
          console.error('Error rastreando envío', error);
        }
      );
  }
}
```

### 6.3 Template HTML

```html
<!-- shipping.component.html -->
<div class="shipping-container">
  <h2>Seleccionar Envío</h2>

  <!-- Botón para obtener cotizaciones -->
  <button (click)="getQuotes()" [disabled]="loading">
    {{ loading ? 'Cargando...' : 'Obtener Cotizaciones' }}
  </button>

  <!-- Lista de opciones de envío -->
  <div class="quotes-list" *ngIf="quotes.length > 0">
    <h3>Opciones disponibles:</h3>
    <div *ngFor="let quote of quotes" class="quote-option">
      <input 
        type="radio" 
        [value]="quote.id" 
        [(ngModel)]="selectedQuoteId"
        name="shipping-option"
      />
      <label>
        <strong>{{ quote.description }}</strong>
        <span>{{ quote.estimatedDays }} días - ${{ quote.price }}</span>
      </label>
    </div>
  </div>

  <!-- Botón para crear envío -->
  <button (click)="createShipment()" [disabled]="!selectedQuoteId || loading">
    {{ loading ? 'Creando...' : 'Confirmar Envío' }}
  </button>

  <!-- Información del envío creado -->
  <div class="shipment-info" *ngIf="shipment">
    <h3>Envío confirmado</h3>
    <p><strong>Número de rastreo:</strong> {{ shipment.trackingNumber }}</p>
    <p><strong>Transportista:</strong> {{ shipment.carrier }}</p>
    <p><strong>Costo:</strong> ${{ shipment.shippingCost }}</p>
    <p><strong>Fecha estimada:</strong> {{ shipment.estimatedDeliveryDate }}</p>
    <a [href]="shipment.labelUrl" target="_blank">
      Descargar etiqueta
    </a>
  </div>
</div>
```

---

## 7. Manejo de Errores

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| 401 Unauthorized | Credenciales inválidas | Verifica API Token y Secret |
| 400 Bad Request | Datos incompletos | Valida que orderId y addressId sean válidos |
| 404 Not Found | Orden/dirección no existe | Verifica que los IDs existan en BD |
| 500 Internal Server | Error en Zipnova | Reintentar o contactar soporte |

### Ejemplo de Manejo

```typescript
try {
  const response = await this.shippingService.quoteShipping(orderId, addressId);
  this.quotes = response.data;
} catch (error) {
  if (error.status === 404) {
    console.error('Orden o dirección no encontrada');
  } else if (error.status === 401) {
    console.error('Credenciales de Zipnova inválidas');
  } else {
    console.error('Error inesperado:', error.message);
  }
}
```

---

## 8. Troubleshooting

### Problema: "No module named Zipnova"
**Solución**: Importa el `ShippingModule` en `AppModule`

### Problema: "Unauthorized: Invalid credentials"
**Solución**: Verifica `ZIPNOVA_API_TOKEN` y `ZIPNOVA_API_SECRET` en `.env`

### Problema: "Address not found"
**Solución**: Valida que `destinationAddressId` corresponda a una dirección existente

### Problema: "Quote expired"
**Solución**: Las cotizaciones expiran después de 24 horas. Vuelve a solicitar una nueva cotización

---

## 9. Recursos Útiles

- [Documentación Zipnova](https://app.zipnova.com/support/documentation)
- [API Reference](https://docs.zipnova.com)
- [Panel de Control](https://app.zipnova.com)

---

## 10. Próximas Mejoras

- [ ] Webhooks de actualización de estado en tiempo real
- [ ] Sincronización automática de estados
- [ ] Soporte para múltiples destinatarios
- [ ] Integración con etiquetas de retorno
- [ ] Cálculo automático de peso y dimensiones
- [ ] Reportes de envíos y estadísticas

---

**Última actualización**: Diciembre 2024  
**Versión**: 1.0.0
