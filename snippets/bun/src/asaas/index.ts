import { asaas } from "./client";

// ── 1. Busca ou cria o cliente ────────────────────────────────────────────
const cpfCnpj = "000.000.000-00";

let customer = await asaas.findCustomerByCpfCnpj(cpfCnpj);

if (!customer) {
  customer = await asaas.createCustomer({
    name: "Maria Silva",
    cpfCnpj,
    email: "maria@exemplo.com",
    mobilePhone: "11999999999",
  });
  console.log("Cliente criado:", customer.id);
}

// ── 2. Gera a cobrança Pix ────────────────────────────────────────────────
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const dueDate = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD

const charge = await asaas.createPixCharge({
  customer: customer.id,
  value: 29.9,
  dueDate,
  description: "Kids Tales — Pacote Mensal",
  externalReference: "order_123",
});

console.log("Cobrança criada:", charge.id, "| Status:", charge.status);

// ── 3. Obtém o QR code e o código copia e cola ───────────────────────────
const pix = await asaas.getPixQrCode(charge.id);

console.log("\n=== PIX COPIA E COLA ===");
console.log(pix.payload);
console.log("\n=== QR CODE (base64) ===");
console.log(`data:image/png;base64,${pix.encodedImage}`);
console.log("\nVálido até:", pix.expirationDate);

// ── 4. Consulta status do pagamento ──────────────────────────────────────
const updated = await asaas.getCharge(charge.id);
console.log("\nStatus atual:", updated.status);
// PENDING → RECEIVED ou CONFIRMED após o pagamento
