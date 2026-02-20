# 🚀 Postman Quick Start - MAA HairStudio Shipping

Guía rápida paso a paso para testear el flujo completo de envío + pago.

---

## Paso 0: Autenticación

```http
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "admin@maa.com",
  "password": "admin123"
}
```

Guardar el token de la respuesta:

```
pm.environment.set("token", pm.response.json().access_token);
```

---

## Paso 1: Crear Orden (delivery)

```http
POST {{baseUrl}}/orders/from-cart
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "deliveryType": "delivery",
  "shippingAddressId": "{{addressId}}"
}
```

Guardar:

```
pm.environment.set("orderId", pm.response.json().id);
```

**Estado esperado de la orden:** `awaiting_shipping_cost`, `isShippingCostSet: false`

---

## Paso 2: Cotizar envío

```http
POST {{baseUrl}}/shipping/quote
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "orderId": "{{orderId}}",
  "destinationAddressId": "{{addressId}}"
}
```

**Response esperada:**

```json
{
  "options": [
    {
      "quoteId": "208_standard_delivery",
      "carrier": "OCA",
      "carrierId": 208,
      "serviceType": "standard_delivery",
      "serviceName": "Envío a domicilio",
      "logisticType": "crossdock",
      "price": 8631,
      "priceShipment": 7133,
      "priceInsurance": 0,
      "estimatedDays": 7,
      "estimatedDeliveryMin": 5,
      "tags": ["cheapest"],
      "pickupPoints": []
    }
  ]
}
```

Guardar estos valores de la opción elegida:

```javascript
const option = pm.response.json().options[0]; // La más barata
pm.environment.set("quoteId", option.quoteId);
pm.environment.set("shippingCost", option.price);
pm.environment.set("serviceType", option.serviceType);
pm.environment.set("logisticType", option.logisticType);
pm.environment.set("carrierId", option.carrierId);
```

---

## Paso 3: Crear envío

```http
POST {{baseUrl}}/shipping/create
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "orderId": "{{orderId}}",
  "destinationAddressId": "{{addressId}}",
  "zipnovaQuoteId": "{{quoteId}}",
  "shippingCost": {{shippingCost}},
  "serviceType": "{{serviceType}}",
  "logisticType": "{{logisticType}}",
  "carrierId": {{carrierId}}
}
```

> **Si es pickup_point**, agregar: `"pointId": 12345`

**Estado esperado de la orden:** `shipping_cost_set`, `isShippingCostSet: true`, total recalculado.

---

## Paso 4: Crear preferencia de pago

```http
POST {{baseUrl}}/payments/create-preference
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "orderId": "{{orderId}}"
}
```

> ⚠️ Si no se creó el envío primero → **Error 400**: "No se puede crear el pago sin antes cotizar el costo de envío."

**Response:**

```json
{
  "id": "...",
  "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?..."
}
```

---

## Paso 5: Simular webhook (en entorno de test)

```http
POST {{baseUrl}}/webhooks/mercado-pago
Content-Type: application/json

{
  "action": "payment.updated",
  "data": {
    "id": "{{mercadoPagoPaymentId}}"
  }
}
```

---

## Variables de entorno requeridas

| Variable             | Descripción                          | Ejemplo                                |
|----------------------|--------------------------------------|----------------------------------------|
| `baseUrl`            | URL base del servidor                | `http://localhost:3000`                |
| `token`              | JWT de autenticación                 | (se obtiene en Paso 0)                 |
| `addressId`          | ID de dirección del usuario          | `uuid`                                 |
| `orderId`            | ID de la orden creada                | (se obtiene en Paso 1)                 |
| `quoteId`            | ID de la opción de envío elegida     | (se obtiene en Paso 2)                 |
| `shippingCost`       | Precio del envío seleccionado        | (se obtiene en Paso 2)                 |
| `serviceType`        | Tipo de servicio del envío           | (se obtiene en Paso 2)                 |
| `logisticType`       | Tipo logístico del envío             | (se obtiene en Paso 2)                 |
| `carrierId`          | ID del carrier seleccionado          | (se obtiene en Paso 2)                 |

---

## Campos OBLIGATORIOS en POST /shipping/create

| Campo                    | Tipo     | Origen                        |
|--------------------------|----------|-------------------------------|
| `orderId`                | string   | Paso 1                        |
| `destinationAddressId`   | string   | Dirección del usuario         |
| `zipnovaQuoteId`         | string   | Quote response: `quoteId`     |
| `shippingCost`           | number   | Quote response: `price`       |
| `serviceType`            | string   | Quote response: `serviceType` |
| `logisticType`           | string   | Quote response: `logisticType`|
| `carrierId`              | number   | Quote response: `carrierId`   |
| `pointId`                | number?  | Solo si `pickup_point`        |

---

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| 400 "No se puede crear pago sin cotizar envío" | `isShippingCostSet = false` | Crear envío primero (Paso 3) |
| 400 "Faltan campos requeridos" | Falta `serviceType`, `logisticType` o `carrierId` | Incluir todos los campos del quote |
| 404 "Orden no encontrada" | `orderId` inválido | Verificar UUID de la orden |
| 500 "Error al crear envío en Zipnova" | Token o config inválidos | Verificar `ZIPNOVA_TOKEN` en `.env` |

---

## Flujo resumido en una línea

```
Login → Crear Orden → Cotizar → Crear Envío → Crear Pago → Pagar → Webhook
```

---

**Última actualización: Febrero 2026**
