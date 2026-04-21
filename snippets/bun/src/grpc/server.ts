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

// ── In-memory store ───────────────────────────────────────────────────────
interface Story {
  id: string;
  title: string;
  author: string;
  content: string;
  category: string;
  age_min: number;
}

const db = new Map<string, Story>([
  ["1", { id: "1", title: "A Floresta Mágica",    author: "Ana Lima",   content: "Era uma vez uma floresta...", category: "fantasia", age_min: 4 }],
  ["2", { id: "2", title: "O Dragão Azul",        author: "João Souza", content: "O dragão vivia numa montanha...", category: "fantasia", age_min: 6 }],
  ["3", { id: "3", title: "A Sereia Curiosa",     author: "Maria Reis", content: "No fundo do mar existia...",   category: "aventura", age_min: 5 }],
]);

// ── Handlers ──────────────────────────────────────────────────────────────
function getStory(
  call: grpc.ServerUnaryCall<{ id: string }, Story>,
  cb: grpc.sendUnaryData<Story>
) {
  const story = db.get(call.request.id);
  if (!story) {
    return cb({ code: grpc.status.NOT_FOUND, message: "Story not found" });
  }
  cb(null, story);
}

function createStory(
  call: grpc.ServerUnaryCall<Omit<Story, "id">, Story>,
  cb: grpc.sendUnaryData<Story>
) {
  const id = String(db.size + 1);
  const story: Story = { id, ...call.request };
  db.set(id, story);
  console.log(`Created story ${id}: ${story.title}`);
  cb(null, story);
}

function listStories(call: grpc.ServerWritableStream<{ category: string }, Story>) {
  const { category } = call.request;
  for (const story of db.values()) {
    if (!category || story.category === category) {
      call.write(story);
    }
  }
  call.end();
}

// ── Bootstrap ─────────────────────────────────────────────────────────────
const server = new grpc.Server();
server.addService(stories.StoriesService.service, {
  getStory,
  createStory,
  listStories,
});

const PORT = process.env.GRPC_PORT ?? "50051";
server.bindAsync(
  `0.0.0.0:${PORT}`,
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) throw err;
    console.log(`gRPC server running on port ${port}`);
  }
);
