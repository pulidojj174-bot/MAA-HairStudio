export interface WishlistItemResponse {
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
    rating: number;
    reviewCount: number;
  };
  note?: string;
  priceWhenAdded?: number;
  priceChange?: {
    hasChanged: boolean;
    currentPrice: number;
    originalPrice: number;
    changeType: 'increased' | 'decreased' | 'same';
    changeAmount?: number;
    changePercentage?: number;
  };
  availability: {
    isAvailable: boolean;
    stock: number;
    message?: string;
  };
  addedAt: Date;
  lastViewedAt?: Date;
  viewCount: number;
}

export interface WishlistSummary {
  totalItems: number;
  totalValue: number;
  totalDiscount: number;
  availableItems: number;
  unavailableItems: number;
  itemsOnSale: number;
  averagePrice: number;
}

export interface PaginatedWishlistResponse {
  success: boolean;
  message: string;
  data: WishlistItemResponse[];
  summary: WishlistSummary;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface WishlistActionResponse {
  success: boolean;
  message: string;
  action: 'added' | 'removed' | 'moved_to_cart' | 'updated';
  affectedItem?: {
    productId: string;
    productName: string;
  };
  wishlist?: PaginatedWishlistResponse;
}