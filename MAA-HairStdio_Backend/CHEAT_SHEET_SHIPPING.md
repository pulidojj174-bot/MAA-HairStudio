# 📌 Shipping API - Cheat Sheet

## 🚀 URLs

```
LOCAL:       http://localhost:3000/api/v1
PRODUCCIÓN:  https://maa-hairstudio-rboo.onrender.com/api/v1
```

## 🔑 Headers

```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

---

## 1️⃣ QUOTE - Cotizar Envío

```http
POST /shipping/quote

{
  "orderId": "{{orderId}}",
  "destinationAddressId": "{{addressId}}",
  "deliveryType": "delivery"
}
```

**Response 200**: Array de opciones con `carrierId`, `serviceType`, `logisticType`, `price`, `pickupPoints[]`

---

## 2️⃣ CREATE - Crear Envío

```http
POST /shipping/create

{
  "orderId": "{{orderId}}",
  "destinationAddressId": "{{addressId}}",
  "zipnovaQuoteId": "208",
  "shippingCost": 8631,
  "serviceType": "standard_delivery",
  "logisticType": "crossdock",
  "carrierId": 208,
  "pointId": null
}
```

**Campos obligatorios desde la cotización**: `serviceType`, `logisticType`, `carrierId`  
**Response 200**: `{ id, status, trackingNumber, carrier, shippingCost }`  
**Efecto**: Orden se actualiza automáticamente con `shippingCost`, nuevo `total` y `status: "shipping_cost_set"`

---

## 3️⃣ STATUS - Estado del Envío

```http
GET /shipping/{{shipmentId}}
```

---

## 4️⃣ BY ORDER - Envío de una Orden

```http
GET /shipping/order/{{orderId}}
```

---

## 5️⃣ ADMIN - Actualizar Costo Manual

```http
PATCH /orders/{{orderId}}/shipping-cost

{
  "shippingCost": 9000,
  "notes": "Ajuste manual"
}
```

---

## 🔄 Flujo Delivery

```
1. POST /orders/from-cart              → Orden (awaiting_shipping_cost)
2. POST /shipping/quote                → Opciones (guardar carrierId, serviceType, logisticType)
3. POST /shipping/create               → Shipment + orden actualizada (shipping_cost_set)
4. POST /payments/create-preference    → Preferencia MP (valida isShippingCostSet)
5. Webhook MP                          → paid
```

## 🏪 Flujo Pickup

```
1. POST /orders/from-cart              → Orden (pending, isShippingCostSet: true)
2. POST /payments/create-preference    → Preferencia MP
3. Webhook MP                          → paid
```

---

## 💰 Cálculo de Totales

```
tax          = subtotal × 0.21 (IVA solo sobre productos)
shippingCost = price_incl_tax de Zipnova (ya tiene IVA)
total        = subtotal + tax + shippingCost
```

---

## 🔴 Errores Comunes

| Status | Mensaje | Solución |
|--------|---------|----------|
| 400 | `orden de tipo delivery aún no tiene costo de envío` | Creá el envío antes de pagar |
| 400 | `Ya existe un envío para esta orden` | Cancelá el envío existente |
| 400 | `origin_id invalid` | Verificá ZIPNOVA_ORIGIN_ID en .env |
| 401 | Unauthorized | Ejecutá login primero |
| 403 | Forbidden | Verificá que la orden sea tuya |
| 404 | Not Found | Verificá orderId/addressId |

---

## ⚡ cURL

```bash
# Login
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu@email.com","password":"tuPass"}' | jq '.access_token' -r

# Quote
curl -X POST http://localhost:3000/api/v1/shipping/quote \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"orderId":"ORDER_UUID","destinationAddressId":"ADDR_UUID"}'

# Create (con campos de la cotización)
curl -X POST http://localhost:3000/api/v1/shipping/create \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{
    "orderId":"ORDER_UUID",
    "destinationAddressId":"ADDR_UUID",
    "zipnovaQuoteId":"208",
    "shippingCost":8631,
    "serviceType":"standard_delivery",
    "logisticType":"crossdock",
    "carrierId":208
  }'
```

---

## 📧 Variables de Entorno (.env)

```env
ZIPNOVA_COUNTRY=ar
ZIPNOVA_API_TOKEN=your_token
ZIPNOVA_API_SECRET=your_secret
ZIPNOVA_ACCOUNT_ID=your_account_id
ZIPNOVA_ORIGIN_ID=your_origin_id
```

---

## 📚 Docs Relacionados

- 📄 [GUIA_INTEGRACION_ZIPNOVA.md](GUIA_INTEGRACION_ZIPNOVA.md) - Guía completa
- 📦 [POSTMAN_TESTING_SHIPPING.md](POSTMAN_TESTING_SHIPPING.md) - Testing Postman
- 📊 [SHIPPING_FLOW_DIAGRAM.md](SHIPPING_FLOW_DIAGRAM.md) - Diagramas de flujo

---

**Último update: Febrero 2026** ✅
