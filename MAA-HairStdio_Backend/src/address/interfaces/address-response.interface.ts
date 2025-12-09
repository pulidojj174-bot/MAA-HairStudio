export interface AddressResponse {
  id: string;
  recipientName: string;
  phone: string;
  alternativePhone?: string;
  email?: string;
  country: string;
  province: string; // ✅ Cambio de department a province
  city: string;
  postalCode: string;
  streetAddress: string;
  addressLine2?: string;
  neighborhood?: string;
  landmark?: string;
  deliveryInstructions?: string;
  deliveryTimePreference?: string;
  label?: string;
  isDefault: boolean;
  isActive: boolean;
  isValidated: boolean;
  validationStatus: 'pending' | 'validated' | 'invalid';
  fullAddress: string;
  isComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddressListResponse {
  success: boolean;
  message: string;
  data: AddressResponse[];
  meta: {
    total: number;
    defaultAddressId?: string;
    hasValidatedAddresses: boolean;
  };
}

export interface AddressActionResponse {
  success: boolean;
  message: string;
  action: 'created' | 'updated' | 'deleted' | 'set_default' | 'validated';
  data: AddressResponse;
}

export interface AddressValidationResponse {
  success: boolean;
  message: string;
  data: {
    addressId: string;
    isValid: boolean;
    validationStatus: 'pending' | 'validated' | 'invalid';
    suggestions?: {
      province?: string; // ✅ Cambio de department a province
      city?: string;
      postalCode?: string;
      formattedAddress?: string;
    };
    validationNotes?: string;
  };
}