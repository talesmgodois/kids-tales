// Tipos principais da API Asaas

export type AsaasEnv = "sandbox" | "production";

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
}

export interface CreateCustomerInput {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  postalCode?: string;
}

export interface CreateChargeInput {
  customer: string;           // customer ID
  value: number;
  dueDate: string;            // YYYY-MM-DD
  description?: string;
  externalReference?: string; // seu ID interno
}

export type PaymentStatus =
  | "PENDING"
  | "RECEIVED"
  | "CONFIRMED"
  | "OVERDUE"
  | "REFUNDED"
  | "CANCELLED";

export interface AsaasCharge {
  id: string;
  customer: string;
  value: number;
  netValue: number;
  status: PaymentStatus;
  billingType: "PIX";
  dueDate: string;
  description?: string;
  externalReference?: string;
  invoiceUrl: string;
}

export interface PixQrCode {
  encodedImage: string;   // imagem base64 do QR code
  payload: string;        // código Pix copia e cola
  expirationDate: string;
}

// Payload enviado pelo webhook Asaas
export interface AsaasWebhookEvent {
  event:
    | "PAYMENT_CREATED"
    | "PAYMENT_RECEIVED"
    | "PAYMENT_CONFIRMED"
    | "PAYMENT_OVERDUE"
    | "PAYMENT_CANCELLED"
    | "PAYMENT_REFUNDED";
  payment: AsaasCharge;
}
