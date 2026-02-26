# 🛒 Guía de Flujos de Compra — Frontend

> **Base URL:** `http://localhost:3000/api/v1`
>
> **Header requerido en endpoints protegidos:**
> ```
> Authorization: Bearer <token_jwt>
> Content-Type: application/json
> ```

---

## 📑 Índice

1. [Flujo Pickup (Retiro en tienda)](#1-flujo-pickup-retiro-en-tienda)
2. [Flujo Delivery (Envío a domicilio)](#2-flujo-delivery-envío-a-domicilio)
3. [Manejo del Carrito](#3-manejo-del-carrito)
4. [Seguimiento de Pedidos](#4-seguimiento-de-pedidos)
5. [Verificación de Pago post-MercadoPago](#5-verificación-de-pago-post-mercadopago)
6. [Estados y Mapeo para UI](#6-estados-y-mapeo-para-ui)
7. [Interfaces TypeScript](#7-interfaces-typescript)
8. [Código de Ejemplo (React/Next.js)](#8-código-de-ejemplo)

---

## 1. Flujo Pickup (Retiro en tienda)

### Diagrama de estados

```
CARRITO ──▶ PENDING ──▶ PAID ──▶ PROCESSING ──▶ DELIVERED (retirado)
               │
               └──▶ CANCELLED (si se cancela antes de pagar)
```

### Paso a paso

| Paso | Pantalla | Endpoint | Método |
|------|----------|----------|--------|
| 1 | Catálogo | `POST /cart/add` | Agregar productos |
| 2 | Carrito | `GET /cart` | Ver carrito |
| 3 | Carrito | `GET /cart/summary` | Ver totales |
| 4 | Carrito | `GET /cart/validate` | Validar stock antes de comprar |
| 5 | Checkout | `POST /orders/from-cart` | Crear orden pickup |
| 6 | Checkout | `POST /payments/create-preference` | Obtener link de pago |
| 7 | MercadoPago | Redirigir a `initPoint` | Usuario paga |
| 8 | Resultado | `GET /payments/verify/:orderId` | Verificar pago |
| 9 | Mis pedidos | `GET /orders/:id` | Ver estado |

---

### Paso 1 — Agregar al carrito

```http
POST /cart/add
```

```json
{
  "productId": "550e8400-e29b-41d4-a716-446655440000",
  "quantity": 2,
  "note": "Es para regalo"
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "message": "Producto agregado al carrito",
  "action": "added",
  "cart": {
    "data": [
      {
        "id": "cart-item-uuid",
        "product": {
          "id": "550e8400-...",
          "name": "Shampoo Reparación Intensa",
          "price": 2500.00,
          "image": "https://storage.example.com/shampoo.jpg",
          "stock": 45
        },
        "quantity": 2,
        "note": "Es para regalo"
      }
    ],
    "meta": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
  }
}
```

---

### Paso 2 — Ver carrito

```http
GET /cart?page=1&limit=20
```

**Respuesta (200):**
```json
{
  "data": [
    {
      "id": "item-uuid-1",
      "product": {
        "id": "prod-uuid-1",
        "name": "Shampoo Reparación Intensa",
        "slug": "shampoo-reparacion-intensa",
        "price": 2500.00,
        "originalPrice": 3200.00,
        "discountPercentage": 22,
        "image": "https://storage.example.com/shampoo.jpg",
        "stock": 45,
        "isActive": true
      },
      "quantity": 2,
      "note": "Es para regalo"
    },
    {
      "id": "item-uuid-2",
      "product": {
        "id": "prod-uuid-2",
        "name": "Mascarilla Nutritiva",
        "slug": "mascarilla-nutritiva",
        "price": 3800.00,
        "image": "https://storage.example.com/mascarilla.jpg",
        "stock": 12,
        "isActive": true
      },
      "quantity": 1,
      "note": null
    }
  ],
  "meta": { "total": 2, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### Paso 3 — Resumen del carrito

```http
GET /cart/summary
```

**Respuesta (200):**
```json
{
  "itemCount": 2,
  "totalItems": 3,
  "subtotal": 8800.00,
  "estimatedTotal": 8800.00
}
```

---

### Paso 4 — Validar disponibilidad

```http
GET /cart/validate
```

**Respuesta OK (200):**
```json
{
  "valid": true,
  "issues": []
}
```

**Respuesta con problemas (200):**
```json
{
  "valid": false,
  "issues": [
    {
      "productId": "prod-uuid-1",
      "productName": "Shampoo Reparación",
      "issue": "stock_insuficiente",
      "requested": 5,
      "available": 2
    }
  ]
}
```

> **Frontend:** Si `valid === false`, mostrar los problemas y no permitir avanzar al checkout.

---

### Paso 5 — Crear orden pickup

```http
POST /orders/from-cart
```

```json
{
  "deliveryType": "pickup",
  "notes": "Retiro por la tarde después de las 17hs"
}
```

> **IMPORTANTE:** Para pickup NO se envía `shippingAddressId`.

**Respuesta (201):**
```json
{
  "success": true,
  "message": "Orden MAA-260226-0001 creada exitosamente",
  "data": {
    "id": "order-uuid-1234",
    "orderNumber": "MAA-260226-0001",
    "status": "pending",
    "paymentStatus": "pending",
    "deliveryType": "pickup",
    "subtotal": 8800.00,
    "shippingCost": 0,
    "isShippingCostSet": true,
    "tax": 1848.00,
    "total": 10648.00,
    "items": [
      {
        "id": "item-uuid-1",
        "productName": "Shampoo Reparación Intensa",
        "quantity": 2,
        "unitPrice": 2500.00,
        "totalPrice": 5000.00,
        "productImage": "https://storage.example.com/shampoo.jpg",
        "productBrand": "L'Oréal"
      },
      {
        "id": "item-uuid-2",
        "productName": "Mascarilla Nutritiva",
        "quantity": 1,
        "unitPrice": 3800.00,
        "totalPrice": 3800.00,
        "productImage": "https://storage.example.com/mascarilla.jpg",
        "productBrand": "Schwarzkopf"
      }
    ],
    "notes": "Retiro por la tarde después de las 17hs",
    "createdAt": "2026-02-26T16:00:00.000Z"
  },
  "meta": {
    "deliveryType": "pickup",
    "requiresShippingCost": false,
    "isReadyForPayment": true,
    "statusDescription": "Orden creada. Lista para retiro en tienda."
  }
}
```

> **Frontend:** Guardar `data.id` (orderId) para el siguiente paso. El campo `meta.isReadyForPayment: true` indica que se puede proceder al pago inmediatamente.

---

### Paso 6 — Crear preferencia de pago

```http
POST /payments/create-preference
```

```json
{
  "orderId": "order-uuid-1234"
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "message": "Preference de pago creada exitosamente",
  "data": {
    "paymentId": "payment-uuid-5678",
    "preferenceId": "1234567890-abcdef",
    "initPoint": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1234567890-abcdef",
    "sandboxInitPoint": "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=1234567890-abcdef",
    "orderId": "order-uuid-1234",
    "amount": 10648.00,
    "currency": "ARS",
    "expiresAt": "2026-02-27T16:00:00.000Z"
  }
}
```

---

### Paso 7 — Redirigir a MercadoPago

```javascript
// Producción:
window.location.href = response.data.initPoint;

// Sandbox (testing):
window.location.href = response.data.sandboxInitPoint;
```

> Después de pagar, MercadoPago redirige al usuario a las `back_urls` configuradas:
> - Éxito: `https://www.maahairstudio.com/payment/success?order_id=order-uuid-1234`
> - Fallo: `https://www.maahairstudio.com/payment/failure?order_id=order-uuid-1234`
> - Pendiente: `https://www.maahairstudio.com/payment/pending?order_id=order-uuid-1234`

---

### Paso 8 — Verificar resultado del pago

Cuando el usuario vuelve de MercadoPago, verificar el estado:

```http
GET /payments/verify/:orderId
```

**Respuesta — Pago aprobado (200):**
```json
{
  "success": true,
  "payment": {
    "id": "payment-uuid-5678",
    "status": "approved",
    "statusDetail": "accredited",
    "amount": 10648.00,
    "paymentMethod": "credit_card",
    "approvedAt": "2026-02-26T16:05:00.000Z",
    "order": {
      "id": "order-uuid-1234",
      "orderNumber": "MAA-260226-0001",
      "status": "paid",
      "paymentStatus": "approved",
      "total": 10648.00
    }
  }
}
```

**Respuesta — Pago pendiente (200):**
```json
{
  "success": true,
  "payment": {
    "id": "payment-uuid-5678",
    "status": "in_process",
    "statusDetail": "pending_review_manual",
    "amount": 10648.00,
    "order": {
      "id": "order-uuid-1234",
      "orderNumber": "MAA-260226-0001",
      "status": "pending",
      "paymentStatus": "pending"
    }
  }
}
```

**Respuesta — Pago rechazado (200):**
```json
{
  "success": true,
  "payment": {
    "id": "payment-uuid-5678",
    "status": "rejected",
    "statusDetail": "cc_rejected_insufficient_amount",
    "amount": 10648.00,
    "order": {
      "id": "order-uuid-1234",
      "orderNumber": "MAA-260226-0001",
      "status": "pending",
      "paymentStatus": "pending"
    }
  }
}
```

> **Frontend:** Si el pago quedó `pending` o no llegó el webhook aún, hacer polling (ver sección 5).

---

### Paso 9 — Seguimiento del pedido

```http
GET /orders/:orderId
```

**Respuesta (200):**
```json
{
  "id": "order-uuid-1234",
  "orderNumber": "MAA-260226-0001",
  "status": "paid",
  "paymentStatus": "approved",
  "deliveryType": "pickup",
  "subtotal": 8800.00,
  "shippingCost": 0,
  "tax": 1848.00,
  "total": 10648.00,
  "items": [
    {
      "id": "item-uuid-1",
      "productName": "Shampoo Reparación Intensa",
      "productImage": "https://storage.example.com/shampoo.jpg",
      "productBrand": "L'Oréal",
      "productVolume": "500ml",
      "quantity": 2,
      "unitPrice": 2500.00,
      "totalPrice": 5000.00
    }
  ],
  "notes": "Retiro por la tarde después de las 17hs",
  "createdAt": "2026-02-26T16:00:00.000Z",
  "updatedAt": "2026-02-26T16:05:00.000Z"
}
```

---

## 2. Flujo Delivery (Envío a domicilio)

### Diagrama de estados

```
CARRITO ──▶ AWAITING_SHIPPING_COST ──▶ SHIPPING_COST_SET ──▶ PAID ──▶ PROCESSING ──▶ SHIPPED ──▶ DELIVERED
                     │                        │                                          │
                     │                        └── (usuario paga con envío)               │
                     │                                                                   │
                     └──▶ CANCELLED                                              (zipnova tracking)
```

### Paso a paso

| Paso | Pantalla | Endpoint | Método |
|------|----------|----------|--------|
| 1-4 | Carrito | (igual que pickup) | Agregar, ver, validar |
| 5 | Checkout | `POST /address` | Crear dirección (si no tiene) |
| 6 | Checkout | `GET /address` | Obtener direcciones |
| 7 | Checkout | `POST /orders/from-cart` | Crear orden delivery |
| 8 | Envío | `POST /shipping/quote` | Cotizar envío |
| 9 | Envío | `POST /shipping/create` | Crear envío con opción elegida |
| 10 | Pago | `POST /payments/create-preference` | Obtener link de pago |
| 11 | MercadoPago | Redirigir a `initPoint` | Usuario paga |
| 12 | Resultado | `GET /payments/verify/:orderId` | Verificar pago |
| 13 | Seguimiento | `GET /shipping/order/:orderId` | Ver estado envío |

---

### Paso 5 — Crear dirección (si no tiene)

```http
POST /address
```

```json
{
  "recipientName": "María García",
  "phone": "+5491155667788",
  "email": "maria@ejemplo.com",
  "province": "Buenos Aires",
  "city": "La Plata",
  "postalCode": "1900",
  "streetAddress": "Calle 7 1234",
  "addressLine2": "Piso 3, Depto B",
  "neighborhood": "Centro",
  "deliveryInstructions": "Tocar timbre 3B",
  "label": "Casa",
  "isDefault": true
}
```

---

### Paso 6 — Obtener direcciones del usuario

```http
GET /address
```

**Respuesta (200):**
```json
[
  {
    "id": "addr-uuid-1234",
    "recipientName": "María García",
    "phone": "+5491155667788",
    "province": "Buenos Aires",
    "city": "La Plata",
    "postalCode": "1900",
    "streetAddress": "Calle 7 1234",
    "addressLine2": "Piso 3, Depto B",
    "label": "Casa",
    "isDefault": true
  }
]
```

---

### Paso 7 — Crear orden delivery

```http
POST /orders/from-cart
```

```json
{
  "deliveryType": "delivery",
  "shippingAddressId": "addr-uuid-1234",
  "notes": "Envolver para regalo"
}
```

> **IMPORTANTE:** Para delivery SÍ se requiere `shippingAddressId`.

**Respuesta (201):**
```json
{
  "success": true,
  "message": "Orden MAA-260226-0002 creada exitosamente",
  "data": {
    "id": "order-uuid-5678",
    "orderNumber": "MAA-260226-0002",
    "status": "awaiting_shipping_cost",
    "paymentStatus": "pending",
    "deliveryType": "delivery",
    "subtotal": 8800.00,
    "shippingCost": 0,
    "isShippingCostSet": false,
    "tax": 1848.00,
    "total": 10648.00,
    "shippingSnapshot": {
      "recipientName": "María García",
      "phone": "+5491155667788",
      "fullAddress": "Calle 7 1234, Piso 3 Depto B",
      "province": "Buenos Aires",
      "city": "La Plata",
      "postalCode": "1900",
      "deliveryInstructions": "Tocar timbre 3B"
    },
    "items": [ ... ]
  },
  "meta": {
    "deliveryType": "delivery",
    "requiresShippingCost": true,
    "isReadyForPayment": false,
    "statusDescription": "Orden creada. Esperando costo de envio."
  }
}
```

> **Frontend:** `meta.isReadyForPayment: false` → NO se puede pagar todavía. Primero llevar al paso de cotización de envío.

---

### Paso 8 — Cotizar envío

```http
POST /shipping/quote
```

```json
{
  "orderId": "order-uuid-5678",
  "destinationAddressId": "addr-uuid-1234"
}
```

**Respuesta (200):**
```json
{
  "success": true,
  "message": "Cotizaciones obtenidas exitosamente",
  "data": {
    "origin": {
      "city": "Buenos Aires",
      "state": "Buenos Aires",
      "zipcode": "1000"
    },
    "destination": {
      "city": "La Plata",
      "state": "Buenos Aires",
      "zipcode": "1900"
    },
    "options": [
      {
        "carrier": "OCA",
        "carrierId": 208,
        "carrierLogo": "https://zipnova.com/logos/oca.png",
        "serviceType": "standard_delivery",
        "serviceName": "Entrega estándar a domicilio",
        "logisticType": "crossdock",
        "price": 2500.00,
        "priceWithoutTax": 2066.12,
        "priceShipment": 1900.00,
        "priceInsurance": 166.12,
        "estimatedDays": 5,
        "estimatedDeliveryMin": 3,
        "estimatedDelivery": "2026-03-03",
        "tags": ["cheapest"],
        "pickupPoints": []
      },
      {
        "carrier": "Andreani",
        "carrierId": 112,
        "carrierLogo": "https://zipnova.com/logos/andreani.png",
        "serviceType": "standard_delivery",
        "serviceName": "Entrega estándar a domicilio",
        "logisticType": "crossdock",
        "price": 3200.00,
        "priceWithoutTax": 2644.63,
        "priceShipment": 2500.00,
        "priceInsurance": 144.63,
        "estimatedDays": 3,
        "estimatedDeliveryMin": 2,
        "estimatedDelivery": "2026-03-01",
        "tags": ["fastest"],
        "pickupPoints": []
      },
      {
        "carrier": "OCA",
        "carrierId": 208,
        "carrierLogo": "https://zipnova.com/logos/oca.png",
        "serviceType": "pickup_point",
        "serviceName": "Retiro en sucursal",
        "logisticType": "carrier_dropoff",
        "price": 1800.00,
        "priceWithoutTax": 1487.60,
        "priceShipment": 1400.00,
        "priceInsurance": 87.60,
        "estimatedDays": 6,
        "estimatedDeliveryMin": 4,
        "estimatedDelivery": "2026-03-04",
        "tags": [],
        "pickupPoints": [
          {
            "pointId": 5423,
            "description": "Sucursal OCA La Plata Centro",
            "address": "Calle 50 1225",
            "city": "La Plata",
            "zipcode": "1900",
            "phone": "0800-999-7700"
          },
          {
            "pointId": 5424,
            "description": "Sucursal OCA La Plata Norte",
            "address": "Av. 7 3502",
            "city": "La Plata",
            "zipcode": "1900",
            "phone": "0800-999-7700"
          }
        ]
      }
    ]
  }
}
```

> **Frontend:** Mostrar las opciones al usuario como tarjetas/radio buttons. Si una opción tiene `serviceType: "pickup_point"`, mostrar la lista de `pickupPoints` para que elija uno.
>
> Guardar de la opción elegida: `carrierId`, `serviceType`, `logisticType`, `price` y `pointId` (si es pickup_point).

---

### Paso 9 — Crear envío con la opción elegida

**Envío a domicilio:**
```http
POST /shipping/create
```

```json
{
  "orderId": "order-uuid-5678",
  "destinationAddressId": "addr-uuid-1234",
  "zipnovaQuoteId": "208",
  "shippingCost": 2500.00,
  "serviceType": "standard_delivery",
  "logisticType": "crossdock",
  "carrierId": 208
}
```

**Retiro en sucursal (pickup_point):**
```json
{
  "orderId": "order-uuid-5678",
  "destinationAddressId": "addr-uuid-1234",
  "zipnovaQuoteId": "208",
  "shippingCost": 1800.00,
  "serviceType": "pickup_point",
  "logisticType": "carrier_dropoff",
  "carrierId": 208,
  "pointId": 5423
}
```

| Campo | De dónde sale |
|-------|--------------|
| `orderId` | Paso 7 → `data.id` |
| `destinationAddressId` | Paso 6 → dirección seleccionada `.id` |
| `zipnovaQuoteId` | Paso 8 → opción elegida `.carrierId` (como string) |
| `shippingCost` | Paso 8 → opción elegida `.price` |
| `serviceType` | Paso 8 → opción elegida `.serviceType` |
| `logisticType` | Paso 8 → opción elegida `.logisticType` |
| `carrierId` | Paso 8 → opción elegida `.carrierId` |
| `pointId` | Paso 8 → punto de retiro elegido `.pointId` (solo si pickup_point) |

**Respuesta (201):**
```json
{
  "success": true,
  "message": "Envío creado exitosamente",
  "data": {
    "id": "shipment-uuid-9999",
    "status": "confirmed",
    "trackingNumber": "OCA-12345678",
    "carrier": "oca",
    "service": "standard",
    "shippingCost": 2500.00,
    "labelUrl": null
  }
}
```

> **Después de este paso:** La orden se actualiza automáticamente:
> - `status` pasa a `shipping_cost_set`
> - `isShippingCostSet` pasa a `true`
> - `shippingCost` se actualiza al costo del envío
> - `total` se recalcula: subtotal + shippingCost

---

### Paso 10 — Crear preferencia de pago

```http
POST /payments/create-preference
```

```json
{
  "orderId": "order-uuid-5678"
}
```

> Misma respuesta que en pickup. El `amount` ahora incluye el costo de envío.

---

### Pasos 11-12 — Pago y verificación

Idéntico al flujo pickup (pasos 7-8).

---

### Paso 13 — Seguimiento de envío

```http
GET /shipping/order/:orderId
```

**Respuesta con envío (200):**
```json
{
  "success": true,
  "data": {
    "id": "shipment-uuid-9999",
    "status": "confirmed",
    "trackingNumber": "OCA-12345678",
    "carrier": "oca",
    "service": "standard",
    "shippingCost": 2500.00,
    "estimatedDeliveryDate": "2026-03-03T00:00:00.000Z",
    "labelUrl": null
  }
}
```

**Tracking detallado:**
```http
GET /shipping/:shipmentId
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "id": "shipment-uuid-9999",
    "status": "in_transit",
    "trackingNumber": "OCA-12345678",
    "carrier": "oca",
    "estimatedDeliveryDate": "2026-03-03T00:00:00.000Z",
    "deliveredAt": null,
    "events": [
      {
        "date": "2026-02-27T10:00:00.000Z",
        "status": "dispatched",
        "description": "Paquete retirado del depósito"
      },
      {
        "date": "2026-02-28T08:30:00.000Z",
        "status": "in_transit",
        "description": "En camino a destino - Centro de distribución La Plata"
      },
      {
        "date": "2026-03-01T14:00:00.000Z",
        "status": "out_for_delivery",
        "description": "En reparto"
      }
    ]
  }
}
```

---

## 3. Manejo del Carrito

### Comportamiento importante

| Evento | ¿Se limpia el carrito? |
|--------|----------------------|
| Crear orden | **NO** — el carrito se mantiene |
| Pago aprobado por MercadoPago | **SÍ** — se limpia automáticamente |
| Pago rechazado | **NO** — el carrito se mantiene |
| Pago pendiente | **NO** — el carrito se mantiene |
| Usuario abandona checkout | **NO** — el carrito se mantiene |

> Esto permite que si el pago falla, el usuario pueda reintentar sin perder su carrito.

### Actualizar cantidad

```http
PATCH /cart/update
```

```json
{
  "productId": "prod-uuid-1",
  "quantity": 3,
  "action": "set"
}
```

`action`: `set` (establece) | `increment` (+1) | `decrement` (-1)

### Eliminar producto

```http
DELETE /cart/remove/:productId
```

### Limpiar carrito manualmente

```http
DELETE /cart/clear
```

### Badge de carrito (cantidad)

```http
GET /cart/count
```

```json
{ "count": 3 }
```

---

## 4. Seguimiento de Pedidos

### Listar mis pedidos

```http
GET /orders/my-orders?page=1&limit=10
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "order-uuid-1234",
      "orderNumber": "MAA-260226-0001",
      "status": "paid",
      "paymentStatus": "approved",
      "deliveryType": "pickup",
      "subtotal": 8800.00,
      "shippingCost": 0,
      "total": 10648.00,
      "items": [
        {
          "productName": "Shampoo Reparación Intensa",
          "productImage": "https://storage.example.com/shampoo.jpg",
          "quantity": 2,
          "unitPrice": 2500.00,
          "totalPrice": 5000.00
        }
      ],
      "createdAt": "2026-02-26T16:00:00.000Z",
      "updatedAt": "2026-02-26T16:05:00.000Z"
    },
    {
      "id": "order-uuid-5678",
      "orderNumber": "MAA-260226-0002",
      "status": "shipped",
      "paymentStatus": "approved",
      "deliveryType": "delivery",
      "subtotal": 8800.00,
      "shippingCost": 2500.00,
      "total": 13148.00,
      "items": [ ... ],
      "shippingSnapshot": {
        "recipientName": "María García",
        "fullAddress": "Calle 7 1234",
        "city": "La Plata"
      },
      "createdAt": "2026-02-26T17:00:00.000Z"
    }
  ],
  "meta": { "total": 2, "page": 1, "limit": 10, "totalPages": 1 }
}
```

### Ver detalle de un pedido

```http
GET /orders/:orderId
```

### Sincronizar pago (si el webhook tarda)

```http
PATCH /orders/:orderId/sync-payment
```

---

## 5. Verificación de Pago post-MercadoPago

Cuando el usuario vuelve de MercadoPago, el webhook puede no haber llegado aún. Implementar un polling:

```typescript
// === Ejemplo de polling para verificar pago ===

const MAX_ATTEMPTS = 12;       // Máximo 12 intentos
const POLL_INTERVAL = 5000;    // Cada 5 segundos (total: 1 minuto)

async function pollPaymentStatus(orderId: string, token: string): Promise<PaymentResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${API_URL}/payments/verify/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.payment?.status === 'approved') {
        return { status: 'approved', data };
      }

      if (data.payment?.status === 'rejected') {
        return { status: 'rejected', data };
      }

      // Status aún pendiente, esperar y reintentar
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      }
    } catch (error) {
      console.error(`Intento ${attempt} falló:`, error);
    }
  }

  // Si después de todos los intentos no se resolvió
  return { status: 'pending', data: null };
}

// === Uso ===
const result = await pollPaymentStatus(orderId, token);

switch (result.status) {
  case 'approved':
    // Mostrar: "¡Pago confirmado! Tu pedido está en proceso."
    // Redirigir a página de detalle del pedido
    break;
  case 'rejected':
    // Mostrar: "Tu pago fue rechazado. Podés intentar nuevamente."
    // Ofrecer botón para reintentar el pago
    break;
  case 'pending':
    // Mostrar: "Tu pago está siendo procesado. Te notificaremos cuando se confirme."
    // Redirigir a mis pedidos
    break;
}
```

---

## 6. Estados y Mapeo para UI

### Estados de la orden (`order.status`)

| Estado | Tipo Orden | Texto para UI | Color sugerido | Ícono sugerido |
|--------|-----------|---------------|----------------|----------------|
| `pending` | Ambos | Pendiente de pago | `#FFA500` naranja | 🕐 Clock |
| `awaiting_shipping_cost` | Delivery | Calculando envío | `#9370DB` violeta | 📦 Package |
| `shipping_cost_set` | Delivery | Listo para pagar | `#4169E1` azul | 💳 CreditCard |
| `confirmed` | Ambos | Confirmado | `#32CD32` verde claro | ✅ CheckCircle |
| `paid` | Ambos | Pagado | `#228B22` verde | 💰 DollarSign |
| `processing` | Ambos | En preparación | `#FF8C00` naranja oscuro | ⚙️ Settings |
| `shipped` | Delivery | Enviado | `#1E90FF` azul | 🚚 Truck |
| `delivered` | Ambos | Entregado / Retirado | `#006400` verde oscuro | ✅ CheckCircle2 |
| `cancelled` | Ambos | Cancelado | `#DC143C` rojo | ❌ XCircle |

### Estados de pago (`order.paymentStatus`)

| Estado | Texto para UI | Color |
|--------|--------------|-------|
| `pending` | Pendiente | `#FFA500` naranja |
| `approved` | Aprobado | `#228B22` verde |
| `rejected` | Rechazado | `#DC143C` rojo |
| `cancelled` | Cancelado | `#808080` gris |
| `refunded` | Reembolsado | `#9370DB` violeta |

### Estados de envío (`shipment.status`)

| Estado | Texto para UI | Color |
|--------|--------------|-------|
| `pending` | Pendiente | `#FFA500` naranja |
| `quoted` | Cotizado | `#4169E1` azul |
| `confirmed` | Confirmado | `#32CD32` verde |
| `in_transit` | En tránsito | `#1E90FF` azul |
| `delivered` | Entregado | `#006400` verde oscuro |
| `failed` | Fallido | `#DC143C` rojo |
| `cancelled` | Cancelado | `#808080` gris |

### Stepper de seguimiento — Pickup

```
Paso 1          Paso 2           Paso 3             Paso 4
  ●───────────────●───────────────●───────────────────●
Pendiente      Pagado        En preparación       Retirado
(pending)      (paid)        (processing)        (delivered)
```

### Stepper de seguimiento — Delivery

```
Paso 1          Paso 2         Paso 3          Paso 4           Paso 5          Paso 6
  ●───────────────●──────────────●───────────────●────────────────●───────────────●
Calculando     Listo para    Pagado        En preparación    Enviado        Entregado
  envío          pagar        (paid)       (processing)     (shipped)      (delivered)
(awaiting_    (shipping_
shipping_cost) cost_set)
```

### Función Helper para mapear estados

```typescript
interface OrderStatusInfo {
  label: string;
  color: string;
  icon: string;
  step: number;      // Para el stepper
  totalSteps: number;
}

function getOrderStatusInfo(
  status: string,
  deliveryType: 'pickup' | 'delivery'
): OrderStatusInfo {
  if (deliveryType === 'pickup') {
    const map: Record<string, OrderStatusInfo> = {
      pending:    { label: 'Pendiente de pago',  color: '#FFA500', icon: 'Clock',       step: 1, totalSteps: 4 },
      paid:       { label: 'Pagado',             color: '#228B22', icon: 'DollarSign',  step: 2, totalSteps: 4 },
      processing: { label: 'En preparación',     color: '#FF8C00', icon: 'Settings',    step: 3, totalSteps: 4 },
      delivered:  { label: 'Retirado',           color: '#006400', icon: 'CheckCircle', step: 4, totalSteps: 4 },
      cancelled:  { label: 'Cancelado',          color: '#DC143C', icon: 'XCircle',     step: 0, totalSteps: 4 },
    };
    return map[status] || map.pending;
  }

  // delivery
  const map: Record<string, OrderStatusInfo> = {
    awaiting_shipping_cost: { label: 'Calculando envío', color: '#9370DB', icon: 'Package',     step: 1, totalSteps: 6 },
    shipping_cost_set:      { label: 'Listo para pagar', color: '#4169E1', icon: 'CreditCard',  step: 2, totalSteps: 6 },
    paid:                   { label: 'Pagado',           color: '#228B22', icon: 'DollarSign',  step: 3, totalSteps: 6 },
    processing:             { label: 'En preparación',   color: '#FF8C00', icon: 'Settings',    step: 4, totalSteps: 6 },
    shipped:                { label: 'Enviado',          color: '#1E90FF', icon: 'Truck',       step: 5, totalSteps: 6 },
    delivered:              { label: 'Entregado',        color: '#006400', icon: 'CheckCircle', step: 6, totalSteps: 6 },
    cancelled:              { label: 'Cancelado',        color: '#DC143C', icon: 'XCircle',     step: 0, totalSteps: 6 },
  };
  return map[status] || { label: status, color: '#808080', icon: 'HelpCircle', step: 0, totalSteps: 6 };
}
```

---

## 7. Interfaces TypeScript

```typescript
// ============================
// ENUMS
// ============================
type OrderStatus =
  | 'pending'
  | 'awaiting_shipping_cost'
  | 'shipping_cost_set'
  | 'confirmed'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
type DeliveryType = 'pickup' | 'delivery';
type ShipmentStatus = 'pending' | 'quoted' | 'confirmed' | 'in_transit' | 'delivered' | 'failed' | 'cancelled';

// ============================
// CART
// ============================
interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    originalPrice?: number;
    discountPercentage?: number;
    image: string;
    stock: number;
    isActive: boolean;
  };
  quantity: number;
  note?: string;
}

interface CartSummary {
  itemCount: number;
  totalItems: number;
  subtotal: number;
  estimatedTotal: number;
}

interface CartValidation {
  valid: boolean;
  issues: Array<{
    productId: string;
    productName: string;
    issue: string;
    requested: number;
    available: number;
  }>;
}

// ============================
// ORDER
// ============================
interface OrderItem {
  id: string;
  productName: string;
  productImage: string;
  productBrand: string;
  productVolume: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ShippingSnapshot {
  recipientName: string;
  phone: string;
  fullAddress: string;
  province: string;
  city: string;
  postalCode: string;
  deliveryInstructions?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryType: DeliveryType;
  subtotal: number;
  shippingCost: number;
  isShippingCostSet: boolean;
  tax: number;
  total: number;
  items: OrderItem[];
  shippingAddress?: Address;
  shippingSnapshot?: ShippingSnapshot;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateOrderResponse {
  success: boolean;
  message: string;
  data: Order;
  meta: {
    deliveryType: DeliveryType;
    requiresShippingCost: boolean;
    isReadyForPayment: boolean;
    statusDescription: string;
  };
}

// ============================
// PAYMENT
// ============================
interface PaymentPreference {
  paymentId: string;
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
  orderId: string;
  amount: number;
  currency: string;
  expiresAt: string;
}

interface PaymentVerification {
  success: boolean;
  payment: {
    id: string;
    status: string;
    statusDetail: string;
    amount: number;
    paymentMethod?: string;
    approvedAt?: string;
    order: {
      id: string;
      orderNumber: string;
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      total: number;
    };
  };
}

// ============================
// SHIPPING
// ============================
interface PickupPoint {
  pointId: number;
  description: string;
  address: string;
  city: string;
  zipcode: string;
  phone?: string;
}

interface ShippingOption {
  carrier: string;
  carrierId: number;
  carrierLogo?: string;
  serviceType: 'standard_delivery' | 'pickup_point';
  serviceName: string;
  logisticType: string;
  price: number;
  priceWithoutTax: number;
  priceShipment: number;
  priceInsurance: number;
  estimatedDays: number;
  estimatedDeliveryMin: number;
  estimatedDelivery?: string;
  tags: string[];
  pickupPoints: PickupPoint[];
}

interface ShippingQuoteResponse {
  success: boolean;
  message: string;
  data: {
    origin: { city: string; state: string; zipcode: string };
    destination: { city: string; state: string; zipcode: string };
    options: ShippingOption[];
  };
}

interface CreateShipmentRequest {
  orderId: string;
  destinationAddressId: string;
  zipnovaQuoteId: string;
  shippingCost: number;
  serviceType: string;
  logisticType: string;
  carrierId: number;
  pointId?: number;    // Solo para pickup_point
}

interface ShipmentInfo {
  id: string;
  status: ShipmentStatus;
  trackingNumber: string;
  carrier: string;
  service: string;
  shippingCost: number;
  estimatedDeliveryDate?: string;
  labelUrl?: string;
}

interface ShipmentTracking {
  id: string;
  status: ShipmentStatus;
  trackingNumber: string;
  carrier: string;
  estimatedDeliveryDate?: string;
  deliveredAt?: string;
  events: Array<{
    date: string;
    status: string;
    description: string;
  }>;
}

// ============================
// ADDRESS
// ============================
interface Address {
  id: string;
  recipientName: string;
  phone: string;
  email?: string;
  province: string;
  city: string;
  postalCode: string;
  streetAddress: string;
  addressLine2?: string;
  neighborhood?: string;
  deliveryInstructions?: string;
  label?: 'Casa' | 'Trabajo' | 'Otro';
  isDefault: boolean;
}

// ============================
// PAGINACIÓN
// ============================
interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginatedResponse<T> {
  success?: boolean;
  data: T[];
  meta: PaginationMeta;
}
```

---

## 8. Código de Ejemplo

### API Service (fetch wrapper)

```typescript
const API_URL = 'http://localhost:3000/api/v1';

class ApiService {
  private token: string = '';

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Error ${response.status}`);
    }

    return response.json();
  }

  // === CART ===
  getCart(page = 1, limit = 20) {
    return this.request<PaginatedResponse<CartItem>>('GET', `/cart?page=${page}&limit=${limit}`);
  }

  addToCart(productId: string, quantity: number) {
    return this.request('POST', '/cart/add', { productId, quantity });
  }

  getCartSummary() {
    return this.request<CartSummary>('GET', '/cart/summary');
  }

  validateCart() {
    return this.request<CartValidation>('GET', '/cart/validate');
  }

  getCartCount() {
    return this.request<{ count: number }>('GET', '/cart/count');
  }

  // === ORDERS ===
  createOrder(deliveryType: DeliveryType, shippingAddressId?: string, notes?: string) {
    return this.request<CreateOrderResponse>('POST', '/orders/from-cart', {
      deliveryType,
      ...(shippingAddressId ? { shippingAddressId } : {}),
      ...(notes ? { notes } : {}),
    });
  }

  getMyOrders(page = 1, limit = 10) {
    return this.request<PaginatedResponse<Order>>('GET', `/orders/my-orders?page=${page}&limit=${limit}`);
  }

  getOrder(orderId: string) {
    return this.request<Order>('GET', `/orders/${orderId}`);
  }

  syncPayment(orderId: string) {
    return this.request('PATCH', `/orders/${orderId}/sync-payment`);
  }

  // === PAYMENTS ===
  createPaymentPreference(orderId: string) {
    return this.request<{ success: boolean; data: PaymentPreference }>('POST', '/payments/create-preference', { orderId });
  }

  verifyPayment(orderId: string) {
    return this.request<PaymentVerification>('GET', `/payments/verify/${orderId}`);
  }

  // === SHIPPING ===
  quoteShipping(orderId: string, destinationAddressId: string) {
    return this.request<ShippingQuoteResponse>('POST', '/shipping/quote', { orderId, destinationAddressId });
  }

  createShipment(data: CreateShipmentRequest) {
    return this.request<{ success: boolean; data: ShipmentInfo }>('POST', '/shipping/create', data);
  }

  getShipmentByOrder(orderId: string) {
    return this.request<{ success: boolean; data: ShipmentInfo | null }>('GET', `/shipping/order/${orderId}`);
  }

  getShipmentTracking(shipmentId: string) {
    return this.request<{ success: boolean; data: ShipmentTracking }>('GET', `/shipping/${shipmentId}`);
  }

  // === ADDRESS ===
  getAddresses() {
    return this.request<Address[]>('GET', '/address');
  }

  createAddress(address: Omit<Address, 'id'>) {
    return this.request<Address>('POST', '/address', address);
  }
}

export const api = new ApiService();
```

### Flujo completo Pickup — Ejemplo React

```tsx
// === CheckoutPickup.tsx ===

async function handlePickupCheckout() {
  try {
    // 1. Validar carrito
    const validation = await api.validateCart();
    if (!validation.valid) {
      alert('Hay problemas con tu carrito: ' + validation.issues.map(i => i.productName).join(', '));
      return;
    }

    // 2. Crear orden pickup
    const orderResponse = await api.createOrder('pickup', undefined, notes);
    const orderId = orderResponse.data.id;

    // 3. Crear preferencia de pago
    const paymentResponse = await api.createPaymentPreference(orderId);

    // 4. Redirigir a MercadoPago
    window.location.href = paymentResponse.data.initPoint;

  } catch (error) {
    alert(error.message);
  }
}
```

### Página de resultado del pago

```tsx
// === PaymentResult.tsx ===
// URL: /payment/success?order_id=xxx  o  /payment/failure?order_id=xxx

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PaymentResult() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [status, setStatus] = useState<'loading' | 'approved' | 'rejected' | 'pending'>('loading');
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!orderId) return;

    let attempts = 0;
    const maxAttempts = 12;

    const poll = async () => {
      try {
        const result = await api.verifyPayment(orderId);

        if (result.payment?.status === 'approved') {
          setStatus('approved');
          setOrder(result.payment.order as any);
          return; // Parar polling
        }

        if (result.payment?.status === 'rejected') {
          setStatus('rejected');
          return;
        }

        // Aún pendiente, seguir intentando
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setStatus('pending');
        }
      } catch {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      }
    };

    poll();
  }, [orderId]);

  if (status === 'loading') {
    return <div>Verificando tu pago...</div>;
  }

  if (status === 'approved') {
    return (
      <div>
        <h1>¡Pago confirmado!</h1>
        <p>Tu pedido #{order?.orderNumber} fue pagado exitosamente.</p>
        <p>Podés retirarlo en nuestra tienda.</p>
        <a href={`/orders/${orderId}`}>Ver mi pedido</a>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div>
        <h1>Pago rechazado</h1>
        <p>Tu pago no pudo ser procesado. Podés intentar nuevamente.</p>
        <button onClick={() => handleRetryPayment(orderId!)}>
          Reintentar pago
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Pago en proceso</h1>
      <p>Tu pago está siendo verificado. Te notificaremos cuando se confirme.</p>
      <a href="/orders">Ver mis pedidos</a>
    </div>
  );
}
```

---

## ⚠️ Errores comunes y manejo

| Código | Situación | Qué hacer en frontend |
|--------|-----------|----------------------|
| `400` — "El carrito está vacío" | Intentó crear orden sin items | Redirigir al carrito |
| `400` — "Stock insuficiente para X" | Producto sin stock | Mostrar error y sugerir actualizar cantidad |
| `400` — "Se requiere dirección de envío" | Delivery sin dirección | Redirigir a agregar dirección |
| `400` — "No se puede crear el pago: la orden de tipo delivery aún no tiene costo de envío" | Intentó pagar sin cotizar envío | Redirigir al paso de cotización |
| `401` | Token expirado | Redirigir al login |
| `403` — "No tienes acceso a esta orden" | Orden de otro usuario | Mostrar error |
| `404` — "Orden no encontrada" | ID inválido | Mostrar error |

**Formato de error del backend:**
```json
{
  "statusCode": 400,
  "message": ["campo X es requerido", "campo Y es inválido"],
  "error": "Bad Request"
}
```

```typescript
// Helper para manejar errores
function getErrorMessage(error: any): string {
  if (typeof error.message === 'string') return error.message;
  if (Array.isArray(error.message)) return error.message[0];
  return 'Ocurrió un error inesperado';
}
```
