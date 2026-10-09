import { apiFetch } from './api';

export interface InitializePaymentBody {
  planName?: string;
  amountNaira?: number;
  patientId?: string;
}

export interface InitializePaymentResponse {
  authorization_url: string;
  reference: string;
  paymentId: string;
  subscriptionId: string;
  status: string;
  amountNaira: number;
  pricingZone: string;
  allocatedVisits: number;
}

export interface PaymentWebhookResponse {
  ok: boolean;
  subscription: {
    id: string;
    planName: string;
    isActive: boolean;
    allocatedVisits: number;
    usedVisits: number;
    renewalDate?: string;
  };
}

export const paymentsApi = {
  initialize: (body: InitializePaymentBody) =>
    apiFetch<InitializePaymentResponse>('/payments/initialize', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  completeMock: (reference: string) =>
    apiFetch<PaymentWebhookResponse>('/payments/webhook', {
      method: 'POST',
      body: JSON.stringify({
        event: 'charge.success',
        data: { reference },
      }),
    }),
};
