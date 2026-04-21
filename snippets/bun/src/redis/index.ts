import redis, { getJson, setJson } from "./client";

// ── 1. String simples ─────────────────────────────────────────────────────
await redis.set("app:name", "Kids Tales");
const name = await redis.get("app:name");
console.log("get app:name →", name);

// ── 2. JSON com TTL usando helper tipado ──────────────────────────────────
interface Session { userId: number; role: string }

await setJson<Session>("session:abc123", { userId: 42, role: "admin" }, 3600);
const session = await getJson<Session>("session:abc123");
console.log("sessão →", session);
console.log("TTL restante →", await redis.ttl("session:abc123"), "s");

// ── 3. Hash (objeto estruturado) ──────────────────────────────────────────
await redis.hset("user:42", { name: "Maria Silva", email: "maria@exemplo.com", plan: "premium" });

const user = await redis.hgetall("user:42");
console.log("user:42 →", user);

const email = await redis.hget("user:42", "email");
console.log("email →", email);

// ── 4. Lista (fila simples) ───────────────────────────────────────────────
await redis.rpush("queue:emails", "email:1", "email:2", "email:3");
const next = await redis.lpop("queue:emails");
console.log("próximo da fila →", next);
console.log("tamanho da fila →", await redis.llen("queue:emails"));

// ── 5. Set (sem duplicatas) ───────────────────────────────────────────────
await redis.sadd("story:1:readers", "user:10", "user:20", "user:10");
const readers = await redis.smembers("story:1:readers");
console.log("leitores da história 1 →", readers);

// ── 6. Contador atômico ───────────────────────────────────────────────────
await redis.set("story:1:views", 0);
await redis.incr("story:1:views");
await redis.incr("story:1:views");
console.log("views →", await redis.get("story:1:views"));

// ── 7. Verifica existência e remove ──────────────────────────────────────
console.log("app:name existe →", Boolean(await redis.exists("app:name")));
await redis.del("app:name");
console.log("após del, existe →", Boolean(await redis.exists("app:name")));

redis.disconnect();
