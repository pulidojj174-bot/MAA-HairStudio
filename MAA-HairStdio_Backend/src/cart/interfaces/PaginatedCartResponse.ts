export interface CartItemResponse {
  id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    image: string;
    images?: string[];
    price: number;
    originalPrice?: number;
    finalPrice: number;
    discountPercentage: number;
    subcategory: string;
    brand: string;
    volume?: string;
    isActive: boolean;
    isAvailable: boolean;
    stock: number;
    stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unlimited';
  };
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  subtotal: number;
  totalDiscount: number;
  isOnSale: boolean;
  note?: string;
  addedAt: Date;
  lastModifiedAt?: Date;
}

export interface CartSummary {
  totalItems: number;
  totalQuantity: number;
  subtotal: number;
  totalDiscount: number;
  totalAmount: number;
  estimatedTax?: number;
  estimatedShipping?: number;
  estimatedTotal?: number;
}

export interface PaginatedCartResponse {
  success: boolean;
  message: string;
  data: CartItemResponse[];
  summary: CartSummary;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  cart: {
    id: string;
    status: 'active' | 'abandoned' | 'converted';
    createdAt: Date;
    updatedAt: Date;
    lastActivityAt?: Date;
  };
}

export interface CartActionResponse {
  success: boolean;
  message: string;
  action: 'added' | 'updated' | 'removed' | 'cleared';
  affectedItem?: {
    productId: string;
    productName: string;
    previousQuantity?: number;
    newQuantity: number;
  };
  cart: PaginatedCartResponse;
}
