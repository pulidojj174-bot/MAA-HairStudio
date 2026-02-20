# 📊 Flow Diagram - Módulo de Envíos y Pagos

## 📦 Flujo Completo: Delivery (con envío)

```
┌────────────────────────────────────────────────────────────────────────┐
│                    CLIENTE CREA ORDEN (delivery)                      │
│                    POST /orders/from-cart                             │
│                    {deliveryType: "delivery", shippingAddressId}      │
└────────────────────────┬─────────────────────────────────────────────┘
                         │
                         ▼
                 Order creada:
                 status: "awaiting_shipping_cost"
                 isShippingCostSet: false
                 shippingCost: 0
                 total: subtotal + IVA
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  POST /shipping/quote              │
        │  {orderId, destinationAddressId}   │
        └───────────┬────────────────────────┘
                    │
                    ▼ ✅ 200 OK
        ┌──────────────────────────────────────────┐
        │ Response: Opciones de Zipnova            │
        │                                          │
        │ options: [                               │
        │   { carrier: "OCA",                      │
        │     carrierId: 208,                ← 💾  │
        │     serviceType: "standard_delivery", ←  │
        │     logisticType: "crossdock",     ← 💾  │
        │     price: 8631,                   ← 💾  │
        │     estimatedDays: 7,                    │
        │     tags: ["cheapest"] },                │
        │   { carrier: "Correo Argentino",         │
        │     carrierId: 209,                      │
        │     serviceType: "pickup_point",         │
        │     logisticType: "carrier_dropoff",     │
        │     price: 9673,                         │
        │     pickupPoints: [{pointId: 12345}] }   │
        │ ]                                        │
        │                                          │
        │ 💾 Frontend guarda: carrierId,           │
        │    serviceType, logisticType, price       │
        └──────────────────┬───────────────────────┘
                           │ (Cliente selecciona
                           │  una opción)
                           ▼
        ┌────────────────────────────────────────────┐
        │  POST /shipping/create                     │
        │  {                                         │
        │    orderId,                                │
        │    destinationAddressId,                   │
        │    zipnovaQuoteId: "208",                  │
        │    shippingCost: 8631,       ← de quote   │
        │    serviceType: "standard_delivery", ← ✨  │
        │    logisticType: "crossdock",        ← ✨  │
        │    carrierId: 208            ← ✨         │
        │  }                                         │
        └───────────┬────────────────────────────────┘
                    │
        ┌───────────────────────────────────────┐
        │ 🔄 Backend ejecuta:                   │
        │ 1. Crear Shipment en Zipnova API      │
        │    (logistic_type, service_type,       │
        │     carrier_id, source, external_id)   │
        │ 2. Guardar Shipment en BD local        │
        │ 3. applyShippingToOrder():             │
        │    tax = subtotal × 0.21               │
        │    total = subtotal + tax + shipping   │
        │    status → "shipping_cost_set"        │
        │    isShippingCostSet → true            │
        └───────────┬───────────────────────────┘
                    │
                    ▼ ✅ 200 OK
        ┌──────────────────────────────────────────┐
        │ Response: Shipment Creado                │
        │ {                                        │
        │   id: "uuid",                            │
        │   status: "confirmed",                   │
        │   trackingNumber: "0999-00151060",       │
        │   carrier: "oca",                        │
        │   shippingCost: 8631                     │
        │ }                                        │
        └──────────────────┬───────────────────────┘
                           │
                           ▼
        ┌────────────────────────────────────────────┐
        │  POST /payments/create-preference          │
        │  {orderId}                                 │
        │                                            │
        │  ⚠️ VALIDACIÓN: Si deliveryType=delivery   │
        │     y isShippingCostSet=false → RECHAZA    │
        │     "No se puede crear el pago..."         │
        │                                            │
        │  ✅ Si isShippingCostSet=true:              │
        │     Crea preferencia MercadoPago con       │
        │     total actualizado (subtotal+tax+envío) │
        └───────────┬────────────────────────────────┘
                    │
                    ▼
              Cliente paga en MercadoPago
                    │
                    ▼
        ┌────────────────────────────────────────────┐
        │  Webhook MercadoPago                       │
        │  POST /webhooks/mercado-pago               │
        │                                            │
        │  → processPaymentWebhook()                 │
        │  → handleApprovedPayment()                 │
        │     order.status → "paid"                  │
        │     order.paymentStatus → "approved"       │
        └────────────────────────────────────────────┘
```

---

## 🏪 Flujo Pickup (sin envío)

```
┌────────────────────────────────────────────────────────────────┐
│  POST /orders/from-cart                                       │
│  {deliveryType: "pickup"}                                     │
│                                                               │
│  → Order creada:                                              │
│    status: "pending"                                          │
│    isShippingCostSet: true  ← (pickup no necesita envío)      │
│    shippingCost: 0                                            │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  POST /payments/create-preference                             │
│  ✅ isShippingCostSet = true → Procede                        │
│  Crea preferencia con total = subtotal + IVA                  │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ▼
                  Cliente paga → Webhook → "paid"
```

---

## 💰 Cálculo de Totales

```
┌─────────────────────────────────────────────────────────────────┐
│ ORDEN DELIVERY - ANTES del envío:                              │
│                                                                 │
│   subtotal     = $1000.00  (suma de productos)                  │
│   shippingCost = $0.00                                          │
│   tax          = $1000 × 0.21 = $210.00                        │
│   total        = $1000 + $210 + $0 = $1210.00                  │
│   status       = "awaiting_shipping_cost"                      │
│                                                                 │
│ DESPUÉS de crear envío (OCA $8631):                             │
│                                                                 │
│   subtotal     = $1000.00  (sin cambio)                         │
│   shippingCost = $8631.00  ← price_incl_tax de Zipnova         │
│   tax          = $1000 × 0.21 = $210.00  (IVA solo s/productos)│
│   total        = $1000 + $210 + $8631 = $9841.00               │
│   status       = "shipping_cost_set"                            │
│                                                                 │
│ ⚠️ El shipping de Zipnova ya incluye IVA → NO se grava doble   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Estado de la Orden (Transitions)

```
        ┌──────────────────────────┐
        │   DELIVERY               │
        │   awaiting_shipping_cost │
        └─────────┬────────────────┘
                  │ POST /shipping/create
                  ▼
        ┌──────────────────────────┐     ┌──────────────┐
        │   shipping_cost_set      │     │   PICKUP     │
        └─────────┬────────────────┘     │   pending    │
                  │                      └──────┬───────┘
                  │ POST /payments/              │
                  │   create-preference          │
                  │                              │
                  └──────────┬───────────────────┘
                             │ Webhook MP (approved)
                             ▼
                  ┌──────────────────────────┐
                  │         paid             │
                  └─────────┬────────────────┘
                            │ Admin procesa
                            ▼
                  ┌──────────────────────────┐
                  │       processing         │
                  └─────────┬────────────────┘
                            │ Despacho
                            ▼
                  ┌──────────────────────────┐
                  │        shipped           │
                  └─────────┬────────────────┘
                            │ Entrega
                            ▼
                  ┌──────────────────────────┐
                  │       delivered  ✅       │
                  └──────────────────────────┘
```

---

## 🏗️ Estructura de Datos

```
┌─────────────────────────────┐      ┌──────────────────────────────┐
│        ORDERS               │      │      SHIPMENTS               │
├─────────────────────────────┤      ├──────────────────────────────┤
│ id: UUID                    │◄─────┤ orderId: FK → ORDERS.id      │
│ orderNumber: STRING         │ 1:1  │ id: UUID                     │
│ userId: FK                  │      │ status: ENUM                 │
│ status: ENUM                │      │ carrier: ENUM                │
│ paymentStatus: ENUM         │      │ service: ENUM                │
│ deliveryType: ENUM          │      │ trackingNumber: STRING       │
│ subtotal: DECIMAL           │      │ shippingCost: DECIMAL        │
│ shippingCost: DECIMAL       │      │ labelUrl: VARCHAR            │
│ tax: DECIMAL                │      │ zipnovaShipmentId: VARCHAR   │
│ total: DECIMAL              │      │ zipnovaMetadata: JSON        │
│ isShippingCostSet: BOOLEAN  │      │ estimatedDays: INT           │
│ shippingCostSetAt: TIMESTAMP│      │ deliveredAt: TIMESTAMP       │
│ createdAt: TIMESTAMP        │      │ createdAt: TIMESTAMP         │
└─────────────────────────────┘      └──────────────────────────────┘
         │                                       │
         └───────────────────┬───────────────────┘
                             │
                   Relación OneToOne (1:1)

┌─────────────────────────────┐
│        PAYMENTS             │
├─────────────────────────────┤
│ id: UUID                    │
│ orderId: FK → ORDERS.id     │
│ mercadoPagoPaymentId: STRING│
│ preferenceId: STRING        │
│ amount: DECIMAL             │
│ status: STRING              │
│ webhookProcessed: BOOLEAN   │
│ approvedAt: TIMESTAMP       │
└─────────────────────────────┘
```

---

## 📡 Request/Response Map

```
POST /shipping/quote
    ├─ Input:  {orderId, addressId, deliveryType?}
    └─ Output: {options: [{carrier, carrierId, serviceType, logisticType, price, ...}]}

POST /shipping/create
    ├─ Input:  {orderId, addressId, zipnovaQuoteId, shippingCost,
    │           serviceType, logisticType, carrierId, pointId?}
    └─ Output: {id, trackingNumber, status, carrier, shippingCost}
    └─ Side:   Order.total recalculado, Order.status = "shipping_cost_set"

POST /payments/create-preference
    ├─ Input:  {orderId}
    ├─ Guard:  delivery + !isShippingCostSet → RECHAZA
    └─ Output: {init_point, preferenceId}

POST /webhooks/mercado-pago
    ├─ Input:  MercadoPago webhook payload
    └─ Side:   Order.status = "paid", Order.paymentStatus = "approved"

GET  /shipping/:shipmentId        → {id, status, trackingNumber, events}
GET  /shipping/order/:orderId     → {id, status, carrier, shippingCost}
PATCH /orders/:orderId/shipping-cost → Admin: recalcula total con nuevo costo
```

---

**Diagrama actualizado: Febrero 2026**
