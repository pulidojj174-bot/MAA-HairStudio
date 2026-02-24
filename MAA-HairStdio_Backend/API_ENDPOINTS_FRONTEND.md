# 📋 API Endpoints — Guía para Frontend

> **Base URL:** `http://localhost:3000` (desarrollo) | `https://api.maa-hairstudio.com` (producción)
>
> **Autenticación:** Los endpoints protegidos requieren el header:
> ```
> Authorization: Bearer <token_jwt>
> ```

---

## 📑 Índice

1. [Auth (Autenticación)](#1-auth-autenticación)
2. [Products (Productos)](#2-products-productos)
3. [Categories (Categorías)](#3-categories-categorías)
4. [Subcategories (Subcategorías)](#4-subcategories-subcategorías)
5. [Cart (Carrito)](#5-cart-carrito)
6. [Wishlist (Lista de deseos)](#6-wishlist-lista-de-deseos)
7. [Address (Direcciones)](#7-address-direcciones)
8. [Orders (Órdenes)](#8-orders-órdenes)
9. [Payments (Pagos — MercadoPago)](#9-payments-pagos--mercadopago)
10. [Shipping (Envíos — Zipnova)](#10-shipping-envíos--zipnova)
11. [Webhooks](#11-webhooks)

---

## 1. Auth (Autenticación)

### 1.1 Registrar usuario

```
POST /auth/register
```

**Body:**
```json
{
  "name": "María García",
  "email": "maria@ejemplo.com",
  "password": "MiPassword123"
}
```

**Validaciones:**
- `name`: string, requerido
- `email`: email válido, requerido
- `password`: mínimo 8 caracteres, debe tener mayúscula + minúscula + número

**Respuesta exitosa (201):**
```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "María García",
    "email": "maria@ejemplo.com",
    "role": "user",
    "createdAt": "2026-02-24T12:00:00.000Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 1.2 Login

```
POST /auth/login
```

**Body:**
```json
{
  "email": "maria@ejemplo.com",
  "password": "MiPassword123"
}
```

**Respuesta exitosa (200):**
```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "María García",
    "email": "maria@ejemplo.com",
    "role": "user"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 1.3 Obtener perfil

```
GET /auth/profile
Authorization: Bearer <token>
```

**Respuesta (200):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "María García",
  "email": "maria@ejemplo.com",
  "role": "user",
  "createdAt": "2026-02-24T12:00:00.000Z",
  "updatedAt": "2026-02-24T12:00:00.000Z"
}
```

---

### 1.4 Cambiar contraseña

```
PATCH /auth/change-password
Authorization: Bearer <token>
```

**Body:**
```json
{
  "currentPassword": "MiPassword123",
  "newPassword": "NuevoPassword456"
}
```

**Respuesta (200):**
```json
{
  "message": "Contraseña actualizada exitosamente"
}
```

---

### 1.5 Refresh token

```
POST /auth/refresh
Authorization: Bearer <token>
```

**Respuesta (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 1.6 Verificar token

```
GET /auth/verify
Authorization: Bearer <token>
```

**Respuesta (200):**
```json
{
  "valid": true,
  "user": {
    "id": "a1b2c3d4-...",
    "email": "maria@ejemplo.com",
    "role": "user"
  }
}
```

---

### 1.7 Logout

```
POST /auth/logout
Authorization: Bearer <token>
```

**Respuesta (200):**
```json
{
  "message": "Sesión cerrada exitosamente"
}
```

---

## 2. Products (Productos)

### 2.1 Listar productos (con filtros y paginación)

```
GET /products?page=1&limit=12&search=shampoo&categoryId=uuid&brand=Loreal&minPrice=100&maxPrice=5000&sortBy=price&sortOrder=ASC
```

**Query params (todos opcionales):**
| Param | Tipo | Descripción |
|-------|------|-------------|
| `page` | number | Página (default: 1) |
| `limit` | number | Items por página (default: 12) |
| `search` | string | Búsqueda por nombre/descripción |
| `subcategoryId` | UUID | Filtrar por subcategoría |
| `categoryId` | UUID | Filtrar por categoría |
| `brand` | string | Filtrar por marca |
| `collection` | string | Filtrar por colección |
| `type_hair` | enum | Tipo de cabello: `liso`, `ondulado`, `rizado`, `crespo`, `todos` |
| `desired_result` | enum | Resultado deseado: `hidratacion`, `reparacion`, `volumen`, `brillo`, `color`, `anti_frizz`, `fortalecimiento`, `limpieza_profunda` |
| `type_product` | enum | Tipo producto: `shampoo`, `acondicionador`, `tratamiento`, `aceite`, `crema`, `spray`, `mascarilla`, `serum`, `gel`, `cera`, `tintura`, `decolorante`, `kit`, `accesorio`, `herramienta`, `otro` |
| `minPrice` | number | Precio mínimo |
| `maxPrice` | number | Precio máximo |
| `isFeatured` | boolean | Solo destacados |
| `isOnSale` | boolean | Solo en oferta |
| `inStock` | boolean | Solo con stock |
| `sortBy` | string | Ordenar por: `name`, `price`, `createdAt`, `rating`, `purchaseCount` |
| `sortOrder` | string | `ASC` o `DESC` |

**Respuesta (200):**
```json
{
  "data": [
    {
      "id": "prod-uuid-1234",
      "name": "Shampoo Reparación Intensa",
      "slug": "shampoo-reparacion-intensa",
      "description": "Shampoo profesional para cabello dañado...",
      "shortDescription": "Repara y nutre el cabello dañado",
      "price": 2500.00,
      "originalPrice": 3200.00,
      "discountPercentage": 22,
      "stock": 45,
      "image": "https://storage.example.com/products/shampoo-rep.jpg",
      "images": [
        "https://storage.example.com/products/shampoo-rep-1.jpg",
        "https://storage.example.com/products/shampoo-rep-2.jpg"
      ],
      "brand": "L'Oréal Professionnel",
      "collection": "Serie Expert",
      "volume": "500ml",
      "type_hair": "todos",
      "desired_result": "reparacion",
      "type_product": "shampoo",
      "isActive": true,
      "isFeatured": true,
      "rating": 4.5,
      "viewCount": 230,
      "purchaseCount": 58,
      "subcategory": {
        "id": "subcat-uuid",
        "name": "Shampoos"
      },
      "createdAt": "2026-01-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 85,
    "page": 1,
    "limit": 12,
    "totalPages": 8
  }
}
```

---

### 2.2 Crear producto (admin)

```
POST /products
Authorization: Bearer <token_admin>
```

**Body:**
```json
{
  "name": "Shampoo Reparación Intensa",
  "description": "Shampoo profesional para cabello dañado con keratina y vitamina E",
  "shortDescription": "Repara y nutre el cabello dañado",
  "price": 2500.00,
  "originalPrice": 3200.00,
  "discountPercentage": 22,
  "stock": 100,
  "minStock": 10,
  "subcategoryId": "subcat-uuid-1234",
  "image": "https://storage.example.com/products/shampoo-rep.jpg",
  "images": [
    "https://storage.example.com/products/shampoo-rep-1.jpg",
    "https://storage.example.com/products/shampoo-rep-2.jpg"
  ],
  "brand": "L'Oréal Professionnel",
  "collection": "Serie Expert",
  "volume": "500ml",
  "type_hair": "todos",
  "desired_result": "reparacion",
  "type_product": "shampoo",
  "isFeatured": true,
  "tags": ["reparación", "keratina", "profesional"]
}
```

---

### 2.3 Obtener producto por ID

```
GET /products/:id
```

**Respuesta (200):** Mismo formato que un item individual del listado.

---

### 2.4 Obtener producto por slug

```
GET /products/slug/shampoo-reparacion-intensa
```

---

### 2.5 Obtener múltiples productos por IDs

```
POST /products/by-ids
```

**Body:**
```json
{
  "ids": ["prod-uuid-1", "prod-uuid-2", "prod-uuid-3"]
}
```

---

### 2.6 Productos destacados

```
GET /products/featured?limit=8
```

---

### 2.7 Productos en oferta

```
GET /products/on-sale?limit=8
```

---

### 2.8 Más vendidos

```
GET /products/best-sellers?limit=8
```

---

### 2.9 Nuevos productos

```
GET /products/new-arrivals?limit=8
```

---

### 2.10 Buscar productos

```
GET /products/search?q=keratina&minPrice=500&maxPrice=5000
```

---

### 2.11 Productos por colección

```
GET /products/collection/serie-expert?page=1&limit=12
```

---

### 2.12 Listar colecciones

```
GET /products/collections/list
```

**Respuesta (200):**
```json
["Serie Expert", "Absolut Repair", "Vitamino Color", "Silver"]
```

---

### 2.13 Productos por tipo

```
GET /products/type/shampoo?page=1&limit=12
```

---

### 2.14 Listar tipos disponibles

```
GET /products/types/list
```

---

### 2.15 Productos relacionados

```
GET /products/:id/related?limit=4
```

---

### 2.16 Verificar disponibilidad

```
GET /products/:id/availability
```

**Respuesta (200):**
```json
{
  "available": true,
  "stock": 45,
  "minStock": 10
}
```

---

### 2.17 Actualizar producto (admin)

```
PATCH /products/:id
Authorization: Bearer <token_admin>
```

**Body (parcial):**
```json
{
  "price": 2800.00,
  "stock": 50,
  "isFeatured": false
}
```

---

### 2.18 Actualizar stock (admin)

```
PATCH /products/:id/stock
Authorization: Bearer <token_admin>
```

**Body:**
```json
{
  "stockOperation": "add",
  "stockAmount": 25,
  "reason": "Reposición de inventario"
}
```

`stockOperation`: `set` | `add` | `subtract`

---

### 2.19 Incrementar vistas

```
PATCH /products/:id/increment-views
```

---

### 2.20 Eliminar producto (admin)

```
DELETE /products/:id
Authorization: Bearer <token_admin>
```

---

### 2.21 Estadísticas de producto (admin)

```
GET /products/:id/stats
Authorization: Bearer <token_admin>
```

---

## 3. Categories (Categorías)

### 3.1 Listar categorías

```
GET /categories?page=1&limit=10&search=cabello&includeSubcategories=true
```

**Respuesta (200):**
```json
{
  "data": [
    {
      "id": "cat-uuid-1234",
      "name": "Cuidado Capilar",
      "slug": "cuidado-capilar",
      "description": "Productos para el cuidado del cabello",
      "image": "https://storage.example.com/categories/cuidado-capilar.jpg",
      "icon": "hair-care",
      "color": "#FF6B9D",
      "displayOrder": 1,
      "subcategories": [
        {
          "id": "subcat-uuid-1",
          "name": "Shampoos",
          "slug": "shampoos",
          "productCount": 24
        },
        {
          "id": "subcat-uuid-2",
          "name": "Acondicionadores",
          "slug": "acondicionadores",
          "productCount": 18
        }
      ]
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 3.2 Todas las categorías (para selects)

```
GET /categories/all
```

**Respuesta (200):**
```json
[
  { "id": "cat-uuid-1", "name": "Cuidado Capilar", "slug": "cuidado-capilar" },
  { "id": "cat-uuid-2", "name": "Coloración", "slug": "coloracion" },
  { "id": "cat-uuid-3", "name": "Styling", "slug": "styling" }
]
```

---

### 3.3 Categoría por slug

```
GET /categories/slug/cuidado-capilar
```

---

### 3.4 Categoría por ID

```
GET /categories/:id
```

---

### 3.5 Crear categoría (admin)

```
POST /categories
Authorization: Bearer <token_admin>
```

**Body:**
```json
{
  "name": "Cuidado Capilar",
  "description": "Productos para el cuidado del cabello",
  "image": "https://storage.example.com/categories/cuidado-capilar.jpg",
  "icon": "hair-care",
  "color": "#FF6B9D",
  "displayOrder": 1
}
```

---

### 3.6 Actualizar categoría (admin)

```
PATCH /categories/:id
Authorization: Bearer <token_admin>
```

---

### 3.7 Reordenar categorías (admin)

```
PATCH /categories/reorder
Authorization: Bearer <token_admin>
```

**Body:**
```json
{
  "categories": [
    { "id": "cat-uuid-1", "displayOrder": 1 },
    { "id": "cat-uuid-2", "displayOrder": 2 },
    { "id": "cat-uuid-3", "displayOrder": 3 }
  ]
}
```

---

### 3.8 Estadísticas de categorías (admin)

```
GET /categories/statistics
Authorization: Bearer <token_admin>
```

---

### 3.9 Eliminar categoría (admin)

```
DELETE /categories/:id
Authorization: Bearer <token_admin>
```

---

## 4. Subcategories (Subcategorías)

### 4.1 Listar subcategorías

```
GET /subcategories?page=1&limit=10&categoryId=cat-uuid&search=shampoo&includeProducts=false
```

**Respuesta (200):**
```json
{
  "data": [
    {
      "id": "subcat-uuid-1",
      "name": "Shampoos",
      "slug": "shampoos",
      "description": "Shampoos profesionales",
      "categoryId": "cat-uuid-1",
      "displayOrder": 1,
      "color": "#4ECDC4",
      "icon": "shampoo"
    }
  ],
  "meta": { "total": 12, "page": 1, "limit": 10, "totalPages": 2 }
}
```

---

### 4.2 Subcategorías por categoría

```
GET /subcategories/by-category/:categoryId
```

---

### 4.3 Todas las subcategorías (para selects)

```
GET /subcategories/all
```

---

### 4.4 Subcategoría por slug

```
GET /subcategories/slug/shampoos
```

---

### 4.5 Subcategoría por ID

```
GET /subcategories/:id
```

---

### 4.6 Crear subcategoría (admin)

```
POST /subcategories
Authorization: Bearer <token_admin>
```

**Body:**
```json
{
  "name": "Shampoos",
  "description": "Shampoos profesionales para todo tipo de cabello",
  "categoryId": "cat-uuid-1234",
  "displayOrder": 1,
  "color": "#4ECDC4",
  "icon": "shampoo"
}
```

---

### 4.7 Actualizar subcategoría (admin)

```
PATCH /subcategories/:id
Authorization: Bearer <token_admin>
```

---

### 4.8 Reordenar subcategorías (admin)

```
PATCH /subcategories/category/:categoryId/reorder
Authorization: Bearer <token_admin>
```

---

### 4.9 Estadísticas (admin)

```
GET /subcategories/statistics
Authorization: Bearer <token_admin>
```

---

### 4.10 Eliminar subcategoría (admin)

```
DELETE /subcategories/:id
Authorization: Bearer <token_admin>
```

---

## 5. Cart (Carrito)

> Todos los endpoints requieren `Authorization: Bearer <token>`

### 5.1 Obtener carrito

```
GET /cart?page=1&limit=20
```

**Respuesta (200):**
```json
{
  "data": [
    {
      "id": "cart-item-uuid",
      "product": {
        "id": "prod-uuid-1",
        "name": "Shampoo Reparación Intensa",
        "price": 2500.00,
        "originalPrice": 3200.00,
        "image": "https://storage.example.com/products/shampoo-rep.jpg",
        "stock": 45
      },
      "quantity": 2,
      "note": "Es para regalo",
      "subtotal": 5000.00,
      "addedAt": "2026-02-24T15:30:00.000Z"
    }
  ],
  "meta": { "total": 3, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 5.2 Agregar al carrito

```
POST /cart/add
```

**Body:**
```json
{
  "productId": "prod-uuid-1234",
  "quantity": 2,
  "note": "Es para regalo"
}
```

**Validaciones:**
- `productId`: UUID, requerido
- `quantity`: entero, 1–50
- `note`: opcional, 1–500 caracteres

**Respuesta (201):**
```json
{
  "message": "Producto agregado al carrito",
  "item": {
    "id": "cart-item-uuid",
    "productId": "prod-uuid-1234",
    "quantity": 2,
    "subtotal": 5000.00
  }
}
```

---

### 5.3 Actualizar item del carrito

```
PATCH /cart/update
```

**Body:**
```json
{
  "productId": "prod-uuid-1234",
  "quantity": 3,
  "action": "set"
}
```

`action`: `set` (establece la cantidad) | `increment` (suma 1) | `decrement` (resta 1). Default: `set`.

---

### 5.4 Eliminar producto del carrito

```
DELETE /cart/remove/:productId
```

---

### 5.5 Limpiar carrito

```
DELETE /cart/clear
```

---

### 5.6 Resumen del carrito

```
GET /cart/summary
```

**Respuesta (200):**
```json
{
  "itemCount": 3,
  "totalItems": 5,
  "subtotal": 12500.00,
  "estimatedTotal": 12500.00
}
```

---

### 5.7 Validar disponibilidad del carrito

```
GET /cart/validate
```

**Respuesta (200):**
```json
{
  "valid": true,
  "issues": []
}
```

o si hay problemas:

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

---

### 5.8 Conteo de items (para badges)

```
GET /cart/count
```

**Respuesta (200):**
```json
{
  "count": 3
}
```

---

### 5.9 Carritos abandonados (admin)

```
GET /cart/abandoned
Authorization: Bearer <token_admin>
```

---

### 5.10 Estadísticas de abandono (admin)

```
GET /cart/stats/abandonment
Authorization: Bearer <token_admin>
```

---

## 6. Wishlist (Lista de Deseos)

> Todos los endpoints requieren `Authorization: Bearer <token>`

### 6.1 Obtener wishlist

```
GET /wishlist?page=1&limit=20
```

**Respuesta (200):**
```json
{
  "data": [
    {
      "id": "wish-item-uuid",
      "product": {
        "id": "prod-uuid-1",
        "name": "Mascarilla Capilar Nutritiva",
        "price": 3800.00,
        "image": "https://storage.example.com/products/mascarilla.jpg",
        "stock": 12
      },
      "note": "Esperar oferta",
      "visibility": "private",
      "addedAt": "2026-02-20T10:00:00.000Z"
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 6.2 Agregar a wishlist

```
POST /wishlist/add
```

**Body:**
```json
{
  "productId": "prod-uuid-1234",
  "note": "Esperar oferta",
  "visibility": "private"
}
```

`visibility`: `private` | `public` | `shared`

---

### 6.3 Eliminar de wishlist

```
DELETE /wishlist/remove/:productId
```

---

### 6.4 Mover a carrito

```
POST /wishlist/move-to-cart
```

**Body:**
```json
{
  "productId": "prod-uuid-1234",
  "quantity": 1,
  "removeFromWishlist": true
}
```

---

### 6.5 Limpiar wishlist

```
DELETE /wishlist/clear
```

---

### 6.6 Verificar si producto está en wishlist

```
GET /wishlist/check/:productId
```

**Respuesta (200):**
```json
{
  "inWishlist": true
}
```

---

### 6.7 Cambios de precio

```
GET /wishlist/price-changes
```

**Respuesta (200):**
```json
{
  "changes": [
    {
      "productId": "prod-uuid-1",
      "productName": "Mascarilla Capilar",
      "oldPrice": 4200.00,
      "newPrice": 3800.00,
      "changePercent": -9.52
    }
  ]
}
```

---

### 6.8 Conteo wishlist

```
GET /wishlist/count
```

**Respuesta (200):**
```json
{
  "count": 5
}
```

---

### 6.9 Registrar vista de producto

```
POST /wishlist/view/:productId
```

---

### 6.10 Analytics wishlist (admin)

```
GET /wishlist/analytics
Authorization: Bearer <token_admin>
```

---

## 7. Address (Direcciones)

> Todos los endpoints requieren `Authorization: Bearer <token>`

### 7.1 Obtener mis direcciones

```
GET /address
```

**Respuesta (200):**
```json
[
  {
    "id": "addr-uuid-1234",
    "recipientName": "María García",
    "phone": "+5491155667788",
    "email": "maria@ejemplo.com",
    "province": "Buenos Aires",
    "city": "La Plata",
    "postalCode": "1900",
    "streetAddress": "Calle 7 1234",
    "addressLine2": "Piso 3, Depto B",
    "neighborhood": "Centro",
    "landmark": "Frente a la plaza",
    "deliveryInstructions": "Tocar timbre 3B",
    "deliveryTimePreference": "Mañana",
    "label": "Casa",
    "isDefault": true,
    "createdAt": "2026-01-10T08:00:00.000Z"
  }
]
```

---

### 7.2 Obtener dirección por defecto

```
GET /address/default/current
```

---

### 7.3 Obtener dirección por ID

```
GET /address/:id
```

---

### 7.4 Crear dirección

```
POST /address
```

**Body:**
```json
{
  "recipientName": "María García",
  "phone": "+5491155667788",
  "alternativePhone": "+5491199887766",
  "email": "maria@ejemplo.com",
  "province": "Buenos Aires",
  "city": "La Plata",
  "postalCode": "1900",
  "streetAddress": "Calle 7 1234",
  "addressLine2": "Piso 3, Depto B",
  "neighborhood": "Centro",
  "landmark": "Frente a la plaza",
  "deliveryInstructions": "Tocar timbre 3B",
  "deliveryTimePreference": "Mañana",
  "label": "Casa",
  "isDefault": true
}
```

**Validaciones:**
- `recipientName`: 2–100 caracteres
- `phone`: formato argentino `+54XXXXXXXXXX`
- `province`: requerido
- `city`: 2–50 caracteres
- `postalCode`: requerido
- `streetAddress`: 5–200 caracteres
- `deliveryInstructions`: máx 500 caracteres
- `label`: `Casa` | `Trabajo` | `Otro`

---

### 7.5 Actualizar dirección

```
PATCH /address/:id
```

**Body (parcial):**
```json
{
  "phone": "+5491100112233",
  "deliveryInstructions": "Dejar en portería"
}
```

---

### 7.6 Eliminar dirección

```
DELETE /address/:id
```

---

### 7.7 Establecer como dirección por defecto

```
PATCH /address/:id/set-default
```

---

### 7.8 Validar dirección argentina

```
POST /address/:id/validate
```

**Respuesta (200):**
```json
{
  "valid": true,
  "normalizedAddress": {
    "province": "Buenos Aires",
    "city": "La Plata",
    "postalCode": "1900"
  }
}
```

---

### 7.9 Estadísticas de direcciones (admin)

```
GET /address/admin/stats
Authorization: Bearer <token_admin>
```

---

## 8. Orders (Órdenes)

> Todos los endpoints requieren `Authorization: Bearer <token>`

### 8.1 Crear orden desde carrito

```
POST /orders/from-cart
```

**Body:**
```json
{
  "deliveryType": "delivery",
  "shippingAddressId": "addr-uuid-1234",
  "notes": "Envolver para regalo"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `deliveryType` | `pickup` \| `delivery` | Requerido |
| `shippingAddressId` | UUID | **Requerido si** `deliveryType = "delivery"` |
| `notes` | string | Opcional |

**Respuesta (201):**
```json
{
  "success": true,
  "message": "Orden creada exitosamente",
  "data": {
    "id": "order-uuid-1234",
    "orderNumber": "MAA-20260224-001",
    "status": "pending",
    "paymentStatus": "pending",
    "deliveryType": "delivery",
    "subtotal": 12500.00,
    "shippingCost": 0,
    "isShippingCostSet": false,
    "tax": 0,
    "total": 12500.00,
    "items": [
      {
        "id": "item-uuid-1",
        "productName": "Shampoo Reparación Intensa",
        "quantity": 2,
        "unitPrice": 2500.00,
        "subtotal": 5000.00
      },
      {
        "id": "item-uuid-2",
        "productName": "Mascarilla Nutritiva",
        "quantity": 1,
        "unitPrice": 3800.00,
        "subtotal": 3800.00
      }
    ],
    "shippingAddress": {
      "recipientName": "María García",
      "city": "La Plata",
      "province": "Buenos Aires",
      "postalCode": "1900"
    },
    "createdAt": "2026-02-24T16:00:00.000Z"
  }
}
```

---

### 8.2 Mis órdenes

```
GET /orders/my-orders?page=1&limit=10
```

**Respuesta (200):**
```json
{
  "data": [
    {
      "id": "order-uuid-1234",
      "orderNumber": "MAA-20260224-001",
      "status": "paid",
      "paymentStatus": "approved",
      "deliveryType": "delivery",
      "subtotal": 12500.00,
      "shippingCost": 1500.00,
      "total": 14000.00,
      "itemCount": 3,
      "createdAt": "2026-02-24T16:00:00.000Z"
    }
  ],
  "meta": { "total": 8, "page": 1, "limit": 10, "totalPages": 1 }
}
```

---

### 8.3 Obtener orden por ID

```
GET /orders/:id
```

**Respuesta (200):** Misma estructura que la creación con todos los items, dirección de envío, estado de pago, etc.

---

### 8.4 Sincronizar pago con MercadoPago

```
PATCH /orders/:id/sync-payment
```

**Respuesta (200):**
```json
{
  "success": true,
  "message": "Estado de pago sincronizado",
  "paymentStatus": "approved",
  "orderStatus": "paid"
}
```

---

### 8.5 Todas las órdenes (admin)

```
GET /orders/admin/all?page=1&limit=20&status=pending&paymentStatus=approved
Authorization: Bearer <token_admin>
```

---

### 8.6 Estadísticas de órdenes (admin)

```
GET /orders/admin/statistics
Authorization: Bearer <token_admin>
```

---

### 8.7 Buscar por número de orden (admin)

```
GET /orders/admin/search/MAA-20260224-001
Authorization: Bearer <token_admin>
```

---

### 8.8 Actualizar estado de orden (admin)

```
PATCH /orders/:id/status
Authorization: Bearer <token_admin>
```

**Body:**
```json
{
  "status": "shipped",
  "paymentStatus": "approved",
  "notes": "Enviado por OCA"
}
```

**Estados de orden posibles:**
| Estado | Descripción |
|--------|-------------|
| `pending` | Pendiente |
| `awaiting_shipping_cost` | Esperando cotización de envío |
| `shipping_cost_set` | Costo de envío establecido |
| `confirmed` | Confirmada |
| `paid` | Pagada |
| `processing` | En proceso |
| `shipped` | Enviada |
| `delivered` | Entregada |
| `cancelled` | Cancelada |

**Estados de pago:**
| Estado | Descripción |
|--------|-------------|
| `pending` | Pendiente |
| `approved` | Aprobado |
| `rejected` | Rechazado |
| `cancelled` | Cancelado |
| `refunded` | Reembolsado |

---

### 8.9 Actualizar costo de envío (admin)

```
PATCH /orders/:id/shipping-cost
Authorization: Bearer <token_admin>
```

**Body:**
```json
{
  "shippingCost": 1500.00,
  "notes": "Envío estándar por OCA"
}
```

---

## 9. Payments (Pagos — MercadoPago)

> Todos los endpoints requieren `Authorization: Bearer <token>`

### 9.1 Crear preferencia de pago (MercadoPago)

```
POST /payments/create-preference
```

**Body:**
```json
{
  "orderId": "order-uuid-1234",
  "returnUrl": "https://maa-hairstudio.com/checkout/result",
  "notes": "Pago de orden MAA-20260224-001"
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "message": "Preferencia de pago creada",
  "data": {
    "paymentId": "payment-uuid-1234",
    "preferenceId": "1234567890-abcdef",
    "initPoint": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1234567890-abcdef",
    "sandboxInitPoint": "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=1234567890-abcdef",
    "orderId": "order-uuid-1234",
    "amount": 14000.00,
    "currency": "ARS",
    "expiresAt": "2026-02-25T16:00:00.000Z"
  }
}
```

> **Frontend:** Redirigir al usuario a `initPoint` (producción) o `sandboxInitPoint` (sandbox).

---

### 9.2 Historial de pagos

```
GET /payments/history?page=1&limit=10
```

**Respuesta (200):**
```json
{
  "data": [
    {
      "id": "payment-uuid-1234",
      "orderId": "order-uuid-1234",
      "orderNumber": "MAA-20260224-001",
      "amount": 14000.00,
      "status": "approved",
      "paymentMethod": "credit_card",
      "createdAt": "2026-02-24T16:30:00.000Z"
    }
  ],
  "meta": { "total": 3, "page": 1, "limit": 10, "totalPages": 1 }
}
```

---

### 9.3 Obtener pago por orden

```
GET /payments/order/:orderId
```

---

### 9.4 Verificar estado del pago

```
GET /payments/verify/:orderId
```

**Respuesta (200):**
```json
{
  "success": true,
  "orderId": "order-uuid-1234",
  "paymentStatus": "approved",
  "orderStatus": "paid",
  "paymentMethod": "credit_card",
  "amount": 14000.00
}
```

---

### 9.5 Sincronizar pago con MercadoPago

```
PATCH /payments/:paymentId/sync
```

---

### 9.6 Cancelar pago

```
PATCH /payments/:paymentId/cancel
```

---

### 9.7 Detalles de pago

```
GET /payments/:paymentId
```

---

### 9.8 Buscar en MercadoPago (admin)

```
GET /payments/admin/search/:externalReference
Authorization: Bearer <token_admin>
```

---

## 10. Shipping (Envíos — Zipnova)

> Todos los endpoints requieren `Authorization: Bearer <token>` (excepto sync-status)

### 10.1 Cotizar envío

```
POST /shipping/quote
Authorization: Bearer <token>
```

**Body:**
```json
{
  "orderId": "order-uuid-1234",
  "destinationAddressId": "addr-uuid-5678",
  "deliveryType": "delivery"
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
        "serviceName": "Entrega estándar",
        "logisticType": "crossdock",
        "price": 2500.00,
        "priceWithoutTax": 2066.12,
        "priceShipment": 1900.00,
        "priceInsurance": 166.12,
        "estimatedDays": 5,
        "estimatedDeliveryMin": 3,
        "estimatedDelivery": "2026-03-01",
        "tags": ["cheapest"],
        "pickupPoints": []
      },
      {
        "carrier": "Andreani",
        "carrierId": 112,
        "carrierLogo": "https://zipnova.com/logos/andreani.png",
        "serviceType": "standard_delivery",
        "serviceName": "Entrega estándar",
        "logisticType": "crossdock",
        "price": 3200.00,
        "priceWithoutTax": 2644.63,
        "priceShipment": 2500.00,
        "priceInsurance": 144.63,
        "estimatedDays": 3,
        "estimatedDeliveryMin": 2,
        "estimatedDelivery": "2026-02-27",
        "tags": ["fastest"],
        "pickupPoints": []
      },
      {
        "carrier": "OCA",
        "carrierId": 208,
        "carrierLogo": "https://zipnova.com/logos/oca.png",
        "serviceType": "pickup_point",
        "serviceName": "Retiro en punto",
        "logisticType": "carrier_dropoff",
        "price": 1800.00,
        "priceWithoutTax": 1487.60,
        "priceShipment": 1400.00,
        "priceInsurance": 87.60,
        "estimatedDays": 6,
        "estimatedDeliveryMin": 4,
        "estimatedDelivery": "2026-03-02",
        "tags": [],
        "pickupPoints": [
          {
            "pointId": 5423,
            "description": "Sucursal OCA La Plata Centro",
            "address": "Calle 50 entre 7 y 8, 1225",
            "city": "La Plata",
            "zipcode": "1900",
            "phone": "0800-999-7700"
          },
          {
            "pointId": 5424,
            "description": "Sucursal OCA La Plata Norte",
            "address": "Av. 7 entre 35 y 36, 3502",
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

> **Frontend:** Mostrar las opciones al usuario y guardar `carrierId`, `serviceType`, `logisticType` y `price` de la opción seleccionada. Si el `serviceType` es `pickup_point`, también guardar el `pointId` seleccionado.

---

### 10.2 Crear envío

```
POST /shipping/create
Authorization: Bearer <token>
```

**Body (envío a domicilio):**
```json
{
  "orderId": "order-uuid-1234",
  "destinationAddressId": "addr-uuid-5678",
  "zipnovaQuoteId": "208",
  "shippingCost": 2500.00,
  "serviceType": "standard_delivery",
  "logisticType": "crossdock",
  "carrierId": 208
}
```

**Body (retiro en punto):**
```json
{
  "orderId": "order-uuid-1234",
  "destinationAddressId": "addr-uuid-5678",
  "zipnovaQuoteId": "208",
  "shippingCost": 1800.00,
  "serviceType": "pickup_point",
  "logisticType": "carrier_dropoff",
  "carrierId": 208,
  "pointId": 5423
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `orderId` | UUID | ID de la orden |
| `destinationAddressId` | UUID | ID de la dirección de destino |
| `zipnovaQuoteId` | string | ID del carrier (`carrierId` como string) |
| `shippingCost` | number | Precio seleccionado con impuestos (`price`) |
| `serviceType` | string | De la cotización: `standard_delivery` o `pickup_point` |
| `logisticType` | string | De la cotización: `crossdock`, `carrier_dropoff`, etc. |
| `carrierId` | number | De la cotización: `carrierId` |
| `pointId` | number | Solo si `serviceType = "pickup_point"`: ID del punto de retiro |

**Respuesta (201):**
```json
{
  "success": true,
  "message": "Envío creado exitosamente",
  "data": {
    "id": "shipment-uuid-1234",
    "status": "confirmed",
    "trackingNumber": "OCA-12345678",
    "carrier": "oca",
    "service": "standard",
    "shippingCost": 2500.00,
    "labelUrl": null
  }
}
```

---

### 10.3 Obtener estado del envío

```
GET /shipping/:shipmentId
Authorization: Bearer <token>
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "id": "shipment-uuid-1234",
    "status": "in_transit",
    "trackingNumber": "OCA-12345678",
    "carrier": "oca",
    "estimatedDeliveryDate": "2026-03-01T00:00:00.000Z",
    "deliveredAt": null,
    "events": [
      {
        "date": "2026-02-25T10:00:00.000Z",
        "status": "dispatched",
        "description": "Paquete retirado del depósito"
      },
      {
        "date": "2026-02-26T08:30:00.000Z",
        "status": "in_transit",
        "description": "En camino a destino"
      }
    ]
  }
}
```

**Estados de envío posibles:**
| Estado | Descripción |
|--------|-------------|
| `pending` | Pendiente de cotización |
| `quoted` | Cotización obtenida |
| `confirmed` | Confirmado, listo para retirar |
| `in_transit` | En tránsito |
| `delivered` | Entregado |
| `failed` | Falló |
| `cancelled` | Cancelado |

---

### 10.4 Obtener envío de una orden

```
GET /shipping/order/:orderId
Authorization: Bearer <token>
```

**Respuesta (200) — con envío:**
```json
{
  "success": true,
  "data": {
    "id": "shipment-uuid-1234",
    "status": "confirmed",
    "trackingNumber": "OCA-12345678",
    "carrier": "oca",
    "service": "standard",
    "shippingCost": 2500.00,
    "estimatedDeliveryDate": "2026-03-01T00:00:00.000Z",
    "labelUrl": null
  }
}
```

**Respuesta (200) — sin envío:**
```json
{
  "success": false,
  "message": "No hay envío registrado para esta orden",
  "data": null
}
```

---

### 10.5 Sincronizar estado (webhook Zipnova)

```
POST /shipping/sync-status
```

> Este endpoint NO requiere autenticación. Es utilizado por webhooks de Zipnova.

**Body:**
```json
{
  "zipnovaShipmentId": "12345"
}
```

---

## 11. Webhooks

> Estos endpoints NO requieren autenticación.

### 11.1 Webhook MercadoPago (principal)

```
POST /webhooks/mercado-pago
```

> Este endpoint lo configura MercadoPago automáticamente. No invocar desde frontend.

---

### 11.2 Verificar estado de pago (desde webhook)

```
GET /webhooks/mercado-pago/verify/:orderId
```

**Respuesta (200):**
```json
{
  "success": true,
  "orderId": "order-uuid-1234",
  "paymentStatus": "approved"
}
```

---

### 11.3 Health check webhook

```
POST /webhooks/mercado-pago/health
```

---

## 📌 Interfaces TypeScript para Frontend

Estas interfaces te ayudarán a tipar las respuestas en el frontend:

```typescript
// ============================
// AUTH
// ============================
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'custom';
  createdAt: string;
  updatedAt: string;
}

interface AuthResponse {
  user: User;
  access_token: string;
}

// ============================
// PRODUCTS
// ============================
type HairType = 'liso' | 'ondulado' | 'rizado' | 'crespo' | 'todos';
type DesiredResult = 'hidratacion' | 'reparacion' | 'volumen' | 'brillo' | 'color' | 'anti_frizz' | 'fortalecimiento' | 'limpieza_profunda';
type ProductType = 'shampoo' | 'acondicionador' | 'tratamiento' | 'aceite' | 'crema' | 'spray' | 'mascarilla' | 'serum' | 'gel' | 'cera' | 'tintura' | 'decolorante' | 'kit' | 'accesorio' | 'herramienta' | 'otro';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  stock: number;
  minStock: number;
  image: string;
  images?: string[];
  videoUrl?: string;
  brand?: string;
  collection?: string;
  size?: string;
  volume?: string;
  sku?: string;
  barcode?: string;
  type_hair?: HairType;
  desired_result?: DesiredResult;
  type_product?: ProductType;
  isActive: boolean;
  isFeatured: boolean;
  rating?: number;
  viewCount: number;
  purchaseCount: number;
  subcategory: {
    id: string;
    name: string;
  };
  tags?: string[];
  createdAt: string;
}

interface ProductListResponse {
  data: Product[];
  meta: PaginationMeta;
}

// ============================
// CATEGORIES & SUBCATEGORIES
// ============================
interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  color?: string;
  displayOrder: number;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  categoryId: string;
  displayOrder: number;
  color?: string;
  icon?: string;
  productCount?: number;
}

// ============================
// CART
// ============================
interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  note?: string;
  subtotal: number;
  addedAt: string;
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
// WISHLIST
// ============================
interface WishlistItem {
  id: string;
  product: Product;
  note?: string;
  visibility: 'private' | 'public' | 'shared';
  addedAt: string;
}

interface PriceChange {
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
}

// ============================
// ADDRESS
// ============================
interface Address {
  id: string;
  recipientName: string;
  phone: string;
  alternativePhone?: string;
  email?: string;
  province: string;
  city: string;
  postalCode: string;
  streetAddress: string;
  addressLine2?: string;
  neighborhood?: string;
  landmark?: string;
  deliveryInstructions?: string;
  deliveryTimePreference?: string;
  label?: 'Casa' | 'Trabajo' | 'Otro';
  isDefault: boolean;
  createdAt: string;
}

// ============================
// ORDERS
// ============================
type OrderStatus = 'pending' | 'awaiting_shipping_cost' | 'shipping_cost_set' | 'confirmed' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
type DeliveryType = 'pickup' | 'delivery';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
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
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================
// PAYMENTS (MercadoPago)
// ============================
interface PaymentPreference {
  paymentId: string;
  preferenceId: string;
  initPoint: string;          // URL para producción
  sandboxInitPoint?: string;  // URL para sandbox/testing
  orderId: string;
  amount: number;
  currency: string;
  expiresAt: string;
}

interface PaymentInfo {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod?: string;
  createdAt: string;
}

// ============================
// SHIPPING (Zipnova)
// ============================
interface ShippingOption {
  carrier: string;
  carrierId: number;
  carrierLogo?: string;
  serviceType: string;        // "standard_delivery" | "pickup_point"
  serviceName: string;
  logisticType: string;       // "crossdock" | "carrier_dropoff" | "carrier_pickup"
  price: number;              // Precio con IVA
  priceWithoutTax: number;
  priceShipment: number;
  priceInsurance: number;
  estimatedDays: number;
  estimatedDeliveryMin: number;
  estimatedDelivery?: string; // Fecha ISO
  tags: string[];             // "cheapest", "fastest"
  pickupPoints: PickupPoint[];
}

interface PickupPoint {
  pointId: number;
  description: string;
  address: string;
  city: string;
  zipcode: string;
  phone?: string;
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

interface ShipmentInfo {
  id: string;
  status: 'pending' | 'quoted' | 'confirmed' | 'in_transit' | 'delivered' | 'failed' | 'cancelled';
  trackingNumber: string;
  carrier: string;
  service: string;
  shippingCost: number;
  estimatedDeliveryDate?: string;
  labelUrl?: string;
}

interface ShipmentStatus {
  id: string;
  status: string;
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
// COMMON
// ============================
interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}
```

---

## 🔄 Flujos Principales para Frontend

### Flujo de Compra Completo

```
1. Agregar productos al carrito    → POST /cart/add
2. Revisar carrito                  → GET /cart  +  GET /cart/summary
3. Validar disponibilidad           → GET /cart/validate
4. Crear dirección (si no tiene)    → POST /address
5. Crear orden desde carrito        → POST /orders/from-cart { deliveryType, shippingAddressId }
6. Cotizar envío (si delivery)      → POST /shipping/quote { orderId, destinationAddressId }
7. Crear envío con opción elegida   → POST /shipping/create { orderId, ..., carrierId, serviceType, ... }
8. Crear preferencia de pago        → POST /payments/create-preference { orderId }
9. Redirigir a MercadoPago          → window.location.href = initPoint
10. Verificar resultado del pago    → GET /payments/verify/:orderId
11. Ver estado del envío            → GET /shipping/order/:orderId
```

### Flujo de Retiro en Local (pickup)

```
1-3. Igual que arriba
4. Crear orden con pickup           → POST /orders/from-cart { deliveryType: "pickup" }
5. Crear preferencia de pago        → POST /payments/create-preference { orderId }
6. Redirigir a MercadoPago          → window.location.href = initPoint
7. Verificar pago                   → GET /payments/verify/:orderId
```

### Flujo de Seguimiento

```
1. Ver mis órdenes                  → GET /orders/my-orders
2. Ver detalle de orden             → GET /orders/:id
3. Ver estado del envío             → GET /shipping/order/:orderId
4. Ver tracking detallado           → GET /shipping/:shipmentId
```

---

## ⚠️ Códigos de Error Comunes

| Código | Significado |
|--------|------------|
| `400` | Bad Request — datos del body inválidos |
| `401` | Unauthorized — token JWT faltante o expirado |
| `403` | Forbidden — no tenés permisos (rol insuficiente o recurso de otro usuario) |
| `404` | Not Found — recurso no existe |
| `409` | Conflict — recurso duplicado |

**Formato de error:**
```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password is too weak"],
  "error": "Bad Request"
}
```

---

## 🔐 Notas sobre Autenticación

1. **Guardar el token:** Después del login/register, guardar `access_token` en localStorage o sessionStorage.
2. **Enviar en cada request protegido:**
   ```javascript
   headers: {
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
   }
   ```
3. **Token expirado:** Si recibís `401`, redirigir al login o intentar refresh con `POST /auth/refresh`.
4. **Roles:** `admin` tiene acceso a todos los endpoints. `user` solo a los suyos. `custom` tiene permisos especiales configurables.
