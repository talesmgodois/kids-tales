import * as grpc from "@grpc/grpc-js";
import { StoriesServiceDef } from "./loader";
import type { CreateStoryInput, Story } from "./types";

// ── StoriesClient ─────────────────────────────────────────────────────────
// Wraps the gRPC callback API in a promise-based interface.
// The inner `rpc` field is typed as `any` because @grpc/proto-loader uses
// dynamic loading — no generated stubs. Everything the caller sees is typed.
export class StoriesClient {
  private readonly rpc: InstanceType<grpc.ServiceClientConstructor>;

  constructor(address = `localhost:${process.env.GRPC_PORT ?? "50051"}`) {
    this.rpc = new StoriesServiceDef(address, grpc.credentials.createInsecure());
  }

  getStory(id: string): Promise<Story> {
    return new Promise((resolve, reject) => {
      (this.rpc as any).getStory({ id }, callback(resolve, reject));
    });
  }

  createStory(input: CreateStoryInput): Promise<Story> {
    return new Promise((resolve, reject) => {
      (this.rpc as any).createStory(input, callback(resolve, reject));
    });
  }

  listStories(category = ""): Promise<Story[]> {
    return new Promise((resolve, reject) => {
      const stream = (this.rpc as any).listStories({ category });
      const results: Story[] = [];
      stream.on("data", (s: Story) => results.push(s));
      stream.on("end", () => resolve(results));
      stream.on("error", reject);
    });
  }

  close() {
    this.rpc.close();
  }
}

function callback<T>(
  resolve: (v: T) => void,
  reject: (e: grpc.ServiceError) => void
) {
  return (err: grpc.ServiceError | null, res: T) =>
    err ? reject(err) : resolve(res);
}

// ── Examples ──────────────────────────────────────────────────────────────
const client = new StoriesClient();

// 1. Unary — fetch by ID
const story = await client.getStory("1");
console.log("GetStory →", story);

// 2. Unary — create
const created = await client.createStory({
  title: "O Robô Sonhador",
  author: "Lucas Alves",
  content: "No futuro, existia um robô que sonhava...",
  category: "ficcao",
  age_min: 7,
});
console.log("CreateStory →", created);

// 3. Server streaming — filtered
console.log("\nListStories (fantasia):");
const fantasias = await client.listStories("fantasia");
fantasias.forEach((s) => console.log(`  [${s.id}] ${s.title} — ${s.author}`));

// 4. Server streaming — all
console.log("\nListStories (todas):");
const todas = await client.listStories();
todas.forEach((s) => console.log(`  [${s.id}] ${s.title} (${s.category})`));

client.close();
