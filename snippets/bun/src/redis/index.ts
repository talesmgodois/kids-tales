import redis from "./client";

// ── 1. String simples ─────────────────────────────────────────────────────
await redis.set("app:name", "Kids Tales");
const name = await redis.get("app:name");
console.log("get app:name →", name); // "Kids Tales"

// ── 2. String com TTL (expiração em segundos) ─────────────────────────────
await redis.set("session:abc123", JSON.stringify({ userId: 42, role: "admin" }), "EX", 3600);
const raw = await redis.get("session:abc123");
const session = JSON.parse(raw!);
console.log("sessão →", session);
console.log("TTL restante →", await redis.ttl("session:abc123"), "s");

// ── 3. Hash (objeto estruturado) ──────────────────────────────────────────
await redis.hset("user:42", {
  name: "Maria Silva",
  email: "maria@exemplo.com",
  plan: "premium",
});

const user = await redis.hgetall("user:42");
console.log("user:42 →", user);

const email = await redis.hget("user:42", "email");
console.log("email →", email);

// ── 4. Lista (fila simples) ───────────────────────────────────────────────
await redis.rpush("queue:emails", "email:1", "email:2", "email:3");
const next = await redis.lpop("queue:emails");
console.log("próximo da fila →", next); // "email:1"
console.log("tamanho da fila →", await redis.llen("queue:emails")); // 2

// ── 5. Set (sem duplicatas) ───────────────────────────────────────────────
await redis.sadd("story:1:readers", "user:10", "user:20", "user:10"); // user:10 só entra uma vez
const readers = await redis.smembers("story:1:readers");
console.log("leitores da história 1 →", readers);

// ── 6. Contador atômico ───────────────────────────────────────────────────
await redis.set("story:1:views", 0);
await redis.incr("story:1:views");
await redis.incr("story:1:views");
const views = await redis.get("story:1:views");
console.log("views →", views); // "2"

// ── 7. Verifica existência e remove ──────────────────────────────────────
const exists = await redis.exists("app:name");
console.log("app:name existe →", Boolean(exists));

await redis.del("app:name");
console.log("após del, existe →", Boolean(await redis.exists("app:name")));

redis.disconnect();
