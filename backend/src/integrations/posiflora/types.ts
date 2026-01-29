export interface PosifloraSessionAttributes {
  expireAt: string;
  refreshExpireAt: string;
  accessToken: string;
  refreshToken: string;
}

export interface PosifloraSessionResponse {
  data: {
    type: 'sessions';
    id: string;
    attributes: PosifloraSessionAttributes;
  };
}

export interface PosifloraCustomerAttributes {
  title: string;
  phone: string;
  email?: string | null;
  currentPoints?: number;
  countryCode?: number | null;
  updatedAt?: string;
}

export interface PosifloraCustomerResource {
  id: string;
  type: 'customers';
  attributes: PosifloraCustomerAttributes;
}

export interface PosifloraCustomersResponse {
  data: PosifloraCustomerResource[];
}

export interface PosifloraOrderResponse {
  data: {
    id: string;
    type: 'orders';
  };
}
