import apiClient from './client';

export interface CustomerConfigResponse {
  brand: {
    displayName: string;
    botName: string;
    tagline: string;
  };
  contacts: {
    phone: string;
    email: string;
    address: string;
    workHours: string;
    social: {
      telegram?: string;
      instagram?: string;
      vk?: string;
    };
    links: {
      yandexMaps?: string;
    };
  };
  delivery: {
    city: string;
    zones: Array<{ name: string; price: string }>;
    workingHours: string;
    afterHoursStart: string;
    afterHoursFee: string;
    avgTime: string;
    notes: string[];
  };
  pickup: {
    address: string;
    hours: string;
    note: string;
  };
  bonuses: {
    title: string;
    rules: string[];
  };
  payments: {
    title: string;
    methods: string[];
  };
  cardRequisites: {
    title: string;
    details: string[];
    note: string;
  };
  managerPhone: string;
  sbpQr: {
    enabled: boolean;
    note?: string;
  };
}

export async function getCustomerConfig(): Promise<CustomerConfigResponse> {
  const response = await apiClient.get('/api/config');
  return response.data.data;
}
