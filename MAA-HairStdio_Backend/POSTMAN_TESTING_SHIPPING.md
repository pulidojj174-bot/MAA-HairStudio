# Guía de Testing Shipping en Postman

## ⚙️ Configuración Previa

### Variables de Entorno en Postman

```
base_url:    http://localhost:3000/api/v1
jwt_token:   [obtenido del login]
orderId:     [UUID de una orden delivery]
addressId:   [UUID de una dirección]
shipmentId:  [obtenido al crear envío]
```

### Obtener JWT Token

```http
POST {{base_url}}/auth/login

{
  "email": "tu@email.com",
  "password": "tuContraseña"
}
```

Guardar `access_token` → `{{jwt_token}}`

---

## 📦 ENDPOINTS DE SHIPPING

### 1️⃣ COTIZAR ENVÍO

**Método**: `POST`  
**URL**: `{{base_url}}/shipping/quote`

**Headers**:
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body**:
```json
{
  "orderId": "{{orderId}}",
  "destinationAddressId": "{{addressId}}",
  "deliveryType": "delivery"
}
```

**Response Exitosa (200)**:
```json
{
  "success": true,
  "message": "Cotizaciones obtenidas exitosamente",
  "data": {
    "origin": { "id": 374700, "name": "MAA Hair Studio" },
    "destination": { "id": 1735, "city": "San Isidro", "state": "Buenos Aires", "zipcode": "1642" },
    "options": [
      {
        "carrier": "OCA",
        "carrierId": 208,
        "carrierLogo": "https://...",
        "serviceType": "standard_delivery",
        "serviceName": "Entrega a domicilio",
        "logisticType": "crossdock",
        "price": 8631,
        "priceWithoutTax": 7133,
        "priceShipment": 7050,
        "priceInsurance": 83,
        "estimatedDays": 7,
        "estimatedDeliveryMin": 3,
        "estimatedDelivery": "2026-02-27",
        "tags": ["cheapest"],
        "pickupPoints": []
      },
      {
        "carrier": "Correo Argentino",
        "carrierId": 209,
        "serviceType": "pickup_point",
        "serviceName": "Retiro en punto de entrega",
        "logisticType": "carrier_dropoff",
        "price": 9673,
        "priceWithoutTax": 7994,
        "estimatedDays": 10,
        "tags": [],
        "pickupPoints": [
          {
            "pointId": 12345,
            "description": "Sucursal San Isidro Centro",
            "address": "Av. Centenario 321",
            "city": "San Isidro"
          }
        ]
      }
    ]
  }
}
```

**⚠️ Campos a guardar de la opción elegida**: `carrierId`, `serviceType`, `logisticType`, `price`, y `pointId` si es pickup.

---

### 2️⃣ CREAR ENVÍO

**Método**: `POST`  
**URL**: `{{base_url}}/shipping/create`

**Headers**:
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body**:
```json
{
  "orderId": "{{orderId}}",
  "destinationAddressId": "{{addressId}}",
  "zipnovaQuoteId": "208",
  "shippingCost": 8631,
  "serviceType": "standard_delivery",
  "logisticType": "crossdock",
  "carrierId": 208
}
```

> **NOTA**: `serviceType`, `logisticType` y `carrierId` son **obligatorios** y vienen de la cotización del paso anterior. Para envíos a punto de retiro, agregar `"pointId": 12345`.

**Response Exitosa (200)**:
```json
{
  "success": true,
  "message": "Envío creado exitosamente",
  "data": {
    "id": "uuid-del-shipment",
    "status": "confirmed",
    "trackingNumber": "0999-00151060",
    "carrier": "oca",
    "service": "standard",
    "shippingCost": 8631,
    "labelUrl": null
  }
}
```

**Efectos**: La orden se actualiza automáticamente: `shippingCost`, `tax` (recalculado), `total` (recalculado), `status = "shipping_cost_set"`.

**⚠️ Error - Envío duplicado**:
```json
{
  "statusCode": 400,
  "message": "Ya existe un envío para esta orden (ID: xxx). Si necesitás crear uno nuevo, primero cancelá el envío existente."
}
```

---

### 3️⃣ OBTENER ESTADO DEL ENVÍO

**Método**: `GET`  
**URL**: `{{base_url}}/shipping/{{shipmentId}}`

**Headers**:
```
Authorization: Bearer {{jwt_token}}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-del-shipment",
    "status": "confirmed",
    "trackingNumber": "0999-00151060",
    "carrier": "oca",
    "estimatedDeliveryDate": null,
    "deliveredAt": null,
    "events": []
  }
}
```

---

### 4️⃣ OBTENER ENVÍO POR ORDEN

**Método**: `GET`  
**URL**: `{{base_url}}/shipping/order/{{orderId}}`

**Headers**:
```
Authorization: Bearer {{jwt_token}}
```

**Response con envío (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-del-shipment",
    "status": "confirmed",
    "trackingNumber": "0999-00151060",
    "carrier": "oca",
    "service": "standard",
    "shippingCost": 8631,
    "estimatedDeliveryDate": null,
    "labelUrl": null
  }
}
```

**Response sin envío (200)**:
```json
{
  "success": false,
  "message": "No hay envío registrado para esta orden",
  "data": null
}
```

---

## 🔄 FLUJO COMPLETO DE TESTING

```
Paso 1: POST /auth/login                     → Guardar jwt_token
Paso 2: POST /orders/from-cart                → Guardar orderId (debe ser delivery)
Paso 3: POST /shipping/quote                  → Ver opciones, elegir una
Paso 4: POST /shipping/create                 → Crear envío con datos de la cotización
Paso 5: GET  /shipping/{{shipmentId}}         → Verificar estado
Paso 6: GET  /shipping/order/{{orderId}}      → Verificar envío de la orden
Paso 7: POST /payments/create-preference      → Crear pago (valida que envío esté aplicado)
```

---

## 📋 TABLA RÁPIDA DE ENDPOINTS

| # | Método | Endpoint | Body | Descripción |
|---|--------|----------|------|-------------|
| 1 | POST | `/shipping/quote` | orderId, addressId | Cotizar opciones |
| 2 | POST | `/shipping/create` | orderId, addressId, zipnovaQuoteId, shippingCost, serviceType, logisticType, carrierId | Crear envío |
| 3 | GET | `/shipping/:shipmentId` | - | Estado del envío |
| 4 | GET | `/shipping/order/:orderId` | - | Envío de una orden |
| 5 | PATCH | `/orders/:orderId/shipping-cost` | shippingCost, notes | Admin: ajuste manual |

---

## 🔴 Errores Comunes

| Status | Error | Solución |
|--------|-------|----------|
| 400 | `orden de tipo delivery aún no tiene costo de envío` | Creá envío antes de crear preference |
| 400 | `Ya existe un envío para esta orden` | Cancelar envío existente |
| 400 | `Costo de envio invalido` | shippingCost debe ser >= 0 |
| 400 | `La orden no requiere envio` | La orden es pickup, no necesita envío |
| 401 | Unauthorized | Ejecutá login primero |
| 403 | Forbidden | La orden no es tuya |
| 404 | Orden/dirección no encontrada | Verificá los UUIDs |

---

## 💡 Script Tests para Postman

```javascript
// En la pestaña "Tests" del request Quote:
pm.test("Response OK", () => pm.response.to.have.status(200));
pm.test("Has options", () => {
  const options = pm.response.json().data.options;
  pm.expect(options.length).to.be.above(0);
  // Guardar primera opción
  const opt = options[0];
  pm.environment.set("carrierId", opt.carrierId);
  pm.environment.set("serviceType", opt.serviceType);
  pm.environment.set("logisticType", opt.logisticType);
  pm.environment.set("shippingCost", opt.price);
});

// En la pestaña "Tests" del request Create:
pm.test("Shipment created", () => {
  pm.response.to.have.status(200);
  const data = pm.response.json().data;
  pm.environment.set("shipmentId", data.id);
});
```

---

**Última actualización**: Febrero 2026  
**Versión**: 2.0.0
