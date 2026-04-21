import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const PROTO = path.join(import.meta.dir, "stories.proto");

const pkgDef = protoLoader.loadSync(PROTO, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const { stories } = grpc.loadPackageDefinition(pkgDef) as any;

const PORT = process.env.GRPC_PORT ?? "50051";
const client = new stories.StoriesService(
  `localhost:${PORT}`,
  grpc.credentials.createInsecure()
);

// ── Helpers que envolvem callbacks em Promises ────────────────────────────
function getStory(id: string): Promise<any> {
  return new Promise((resolve, reject) => {
    client.getStory({ id }, (err: grpc.ServiceError, res: any) => {
      err ? reject(err) : resolve(res);
    });
  });
}

function createStory(input: {
  title: string;
  author: string;
  content: string;
  category: string;
  age_min: number;
}): Promise<any> {
  return new Promise((resolve, reject) => {
    client.createStory(input, (err: grpc.ServiceError, res: any) => {
      err ? reject(err) : resolve(res);
    });
  });
}

function listStories(category = ""): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const stream = client.listStories({ category });
    const results: any[] = [];
    stream.on("data", (story: any) => results.push(story));
    stream.on("end", () => resolve(results));
    stream.on("error", reject);
  });
}

// ── Exemplos ──────────────────────────────────────────────────────────────

// 1. Unary — busca uma história por ID
const story = await getStory("1");
console.log("GetStory →", story);

// 2. Unary — cria uma nova história
const created = await createStory({
  title: "O Robô Sonhador",
  author: "Lucas Alves",
  content: "No futuro, existia um robô que sonhava...",
  category: "ficcao",
  age_min: 7,
});
console.log("CreateStory →", created);

// 3. Server streaming — lista todas as histórias de fantasia
console.log("\nListStories (fantasia):");
const fantasias = await listStories("fantasia");
fantasias.forEach((s) => console.log(`  [${s.id}] ${s.title} — ${s.author}`));

// 4. Server streaming — lista todas
console.log("\nListStories (todas):");
const todas = await listStories();
todas.forEach((s) => console.log(`  [${s.id}] ${s.title} (${s.category})`));

client.close();
