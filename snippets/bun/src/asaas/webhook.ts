import type { AsaasWebhookEvent } from "./types";

// Handlers por evento — adicione sua lógica aqui
const handlers: Partial<
  Record<AsaasWebhookEvent["event"], (event: AsaasWebhookEvent) => Promise<void>>
> = {
  async PAYMENT_RECEIVED(event) {
    console.log(`Pagamento recebido: ${event.payment.id} — R$ ${event.payment.value}`);
    // ex: liberar acesso à história comprada
  },

  async PAYMENT_CONFIRMED(event) {
    console.log(`Pagamento confirmado: ${event.payment.id}`);
    // ex: emitir nota fiscal
  },

  async PAYMENT_OVERDUE(event) {
    console.log(`Pagamento vencido: ${event.payment.id}`);
    // ex: enviar e-mail de lembrete
  },
};

// Função para processar o payload recebido no endpoint de webhook
export async function handleWebhook(payload: unknown): Promise<void> {
  const event = payload as AsaasWebhookEvent;
  const handler = handlers[event.event];

  if (handler) {
    await handler(event);
  } else {
    console.log(`Evento ignorado: ${event.event}`);
  }
}

// Servidor HTTP mínimo para receber o webhook
// Monte em /asaas/webhook na sua aplicação ou use standalone:
//   bun run src/asaas/webhook.ts
if (import.meta.main) {
  Bun.serve({
    port: 3001,
    async fetch(req) {
      if (req.method !== "POST" || new URL(req.url).pathname !== "/webhook") {
        return new Response("Not Found", { status: 404 });
      }

      const body = await req.json();
      await handleWebhook(body);
      return new Response("OK");
    },
  });

  console.log("Webhook Asaas escutando em http://localhost:3001/webhook");
}
