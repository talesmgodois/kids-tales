import type {
  AsaasCharge,
  AsaasCustomer,
  AsaasEnv,
  CreateChargeInput,
  CreateCustomerInput,
  PixQrCode,
} from "./types";

const BASE_URLS: Record<AsaasEnv, string> = {
  sandbox: "https://sandbox.asaas.com/api/v3",
  production: "https://api.asaas.com/v3",
};

export class AsaasClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(apiKey: string, env: AsaasEnv = "sandbox") {
    this.baseUrl = BASE_URLS[env];
    this.headers = {
      "Content-Type": "application/json",
      access_token: apiKey,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ errors: [] }));
      const msg = error.errors?.[0]?.description ?? res.statusText;
      throw new Error(`Asaas ${method} ${path} → ${res.status}: ${msg}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Clientes ──────────────────────────────────────────────────────────────

  async createCustomer(input: CreateCustomerInput): Promise<AsaasCustomer> {
    return this.request("POST", "/customers", input);
  }

  async findCustomerByCpfCnpj(
    cpfCnpj: string
  ): Promise<AsaasCustomer | null> {
    const data = await this.request<{ data: AsaasCustomer[] }>(
      "GET",
      `/customers?cpfCnpj=${cpfCnpj}`
    );
    return data.data[0] ?? null;
  }

  // ── Cobranças Pix ─────────────────────────────────────────────────────────

  async createPixCharge(input: CreateChargeInput): Promise<AsaasCharge> {
    return this.request("POST", "/payments", {
      ...input,
      billingType: "PIX",
    });
  }

  async getPixQrCode(chargeId: string): Promise<PixQrCode> {
    return this.request("GET", `/payments/${chargeId}/pixQrCode`);
  }

  async getCharge(chargeId: string): Promise<AsaasCharge> {
    return this.request("GET", `/payments/${chargeId}`);
  }

  async cancelCharge(chargeId: string): Promise<void> {
    await this.request("DELETE", `/payments/${chargeId}`);
  }
}

// Instância pronta para importar
const env = (process.env.ASAAS_ENV ?? "sandbox") as AsaasEnv;
const apiKey = process.env.ASAAS_API_KEY ?? "";

export const asaas = new AsaasClient(apiKey, env);
