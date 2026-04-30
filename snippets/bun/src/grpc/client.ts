import * as grpc from "@grpc/grpc-js";
import { CHANNEL_OPTIONS, StoriesServiceDef } from "./loader";
import type { StoriesServiceClient } from "./generated/stories/StoriesService";
import type { Story__Output } from "./generated/stories/Story";
import type { CreateStoryRequest } from "./generated/stories/CreateStoryRequest";

// ── Helpers ───────────────────────────────────────────────────────────────

function deadline(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}

// Converts a gRPC callback pair into a Promise, with the type inferred at
// each call site. Kept standalone so callers read like regular async code.
function call<T>(
  fn: (cb: (err: grpc.ServiceError | null, res: T) => void) => void
): Promise<T> {
  return new Promise((resolve, reject) =>
    fn((err, res) => (err ? reject(err) : resolve(res)))
  );
}

// ── StoriesClient ─────────────────────────────────────────────────────────
// rpc is typed as StoriesServiceClient (generated from the proto), so every
// method call is checked against the actual proto signature — no `any` casts.
export class StoriesClient {
  private readonly rpc: StoriesServiceClient;

  constructor(address = `localhost:${process.env.GRPC_PORT ?? "50051"}`) {
    this.rpc = new StoriesServiceDef(
      address,
      grpc.credentials.createInsecure(),
      CHANNEL_OPTIONS
    ) as StoriesServiceClient;
  }

  getStory(id: string, timeoutSeconds = 5): Promise<Story__Output> {
    return call<Story__Output>((cb) =>
      this.rpc.getStory({ id }, { deadline: deadline(timeoutSeconds) }, cb)
    );
  }

  createStory(input: CreateStoryRequest, timeoutSeconds = 5): Promise<Story__Output> {
    return call<Story__Output>((cb) =>
      this.rpc.createStory(input, { deadline: deadline(timeoutSeconds) }, cb)
    );
  }

  listStories(category = ""): Promise<Story__Output[]> {
    return new Promise((resolve, reject) => {
      const stream = this.rpc.listStories({ category });
      const results: Story__Output[] = [];
      stream.on("data",  (s: Story__Output) => results.push(s));
      stream.on("end",   ()                  => resolve(results));
      stream.on("error", reject);
    });
  }

  close() {
    this.rpc.close();
  }
}

// ── Examples ──────────────────────────────────────────────────────────────
const client = new StoriesClient();

// 1. Unary — fetch by ID
const story = await client.getStory("1");
console.log("GetStory →", story);

// 2. Unary — create (10 s deadline for write)
const created = await client.createStory(
  { title: "O Robô Sonhador", author: "Lucas Alves", content: "No futuro...", category: "ficcao", age_min: 7 },
  10
);
console.log("CreateStory →", created);

// 3. Server streaming — filtered
console.log("\nListStories (fantasia):");
const fantasias = await client.listStories("fantasia");
fantasias.forEach((s) => console.log(`  [${s.id}] ${s.title} — ${s.author}`));

// 4. Server streaming — all
console.log("\nListStories (all):");
const all = await client.listStories();
all.forEach((s) => console.log(`  [${s.id}] ${s.title} (${s.category})`));

client.close();
