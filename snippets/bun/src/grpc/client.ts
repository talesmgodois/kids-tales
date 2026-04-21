import * as grpc from "@grpc/grpc-js";
import { CHANNEL_OPTIONS, StoriesServiceDef } from "./loader";
import type { CreateStoryInput, Story } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────

function deadline(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}

// Converts a gRPC callback pair into a Promise. Kept as a standalone function
// so the generic type T is inferred at each call site.
function call<T>(
  fn: (cb: (err: grpc.ServiceError | null, res: T) => void) => void
): Promise<T> {
  return new Promise((resolve, reject) =>
    fn((err, res) => (err ? reject(err) : resolve(res)))
  );
}

// ── StoriesClient ─────────────────────────────────────────────────────────
// Promise-based wrapper around the generated gRPC stub. The raw stub is typed
// as `any` because @grpc/proto-loader uses dynamic loading (no generated
// stubs). All public methods are fully typed via the types.ts interfaces.
export class StoriesClient {
  private readonly rpc: InstanceType<grpc.ServiceClientConstructor>;

  constructor(address = `localhost:${process.env.GRPC_PORT ?? "50051"}`) {
    this.rpc = new StoriesServiceDef(
      address,
      grpc.credentials.createInsecure(),
      CHANNEL_OPTIONS
    );
  }

  getStory(id: string, timeoutSeconds = 5): Promise<Story> {
    return call<Story>((cb) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.rpc as any).getStory({ id }, { deadline: deadline(timeoutSeconds) }, cb)
    );
  }

  createStory(input: CreateStoryInput, timeoutSeconds = 5): Promise<Story> {
    return call<Story>((cb) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.rpc as any).createStory(input, { deadline: deadline(timeoutSeconds) }, cb)
    );
  }

  listStories(category = ""): Promise<Story[]> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = (this.rpc as any).listStories({ category });
      const results: Story[] = [];
      stream.on("data", (s: Story) => results.push(s));
      stream.on("end",  ()          => resolve(results));
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

// 2. Unary — create (custom 10 s deadline for a write operation)
const created = await client.createStory(
  { title: "O Robô Sonhador", author: "Lucas Alves", content: "No futuro, existia um robô que sonhava...", category: "ficcao", age_min: 7 },
  10
);
console.log("CreateStory →", created);

// 3. Server streaming — filtered by category
console.log("\nListStories (fantasia):");
const fantasias = await client.listStories("fantasia");
fantasias.forEach((s) => console.log(`  [${s.id}] ${s.title} — ${s.author}`));

// 4. Server streaming — all stories
console.log("\nListStories (all):");
const all = await client.listStories();
all.forEach((s) => console.log(`  [${s.id}] ${s.title} (${s.category})`));

client.close();
