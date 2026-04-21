import * as grpc from "@grpc/grpc-js";
import { SERVER_OPTIONS, StoriesServiceDef } from "./loader";
import type { CreateStoryInput, GetStoryRequest, ListStoriesRequest, Story } from "./types";

// ── In-memory store ───────────────────────────────────────────────────────
const db = new Map<string, Story>([
  ["1", { id: "1", title: "A Floresta Mágica", author: "Ana Lima",   content: "Era uma vez uma floresta...",      category: "fantasia", age_min: 4 }],
  ["2", { id: "2", title: "O Dragão Azul",     author: "João Souza", content: "O dragão vivia numa montanha...", category: "fantasia", age_min: 6 }],
  ["3", { id: "3", title: "A Sereia Curiosa",  author: "Maria Reis", content: "No fundo do mar existia...",      category: "aventura", age_min: 5 }],
]);

function nextId(): string {
  return String(db.size + 1);
}

// ── Handlers ──────────────────────────────────────────────────────────────
function getStory(
  call: grpc.ServerUnaryCall<GetStoryRequest, Story>,
  cb: grpc.sendUnaryData<Story>
) {
  const story = db.get(call.request.id);
  if (!story) return cb({ code: grpc.status.NOT_FOUND, message: "Story not found" });
  cb(null, story);
}

function createStory(
  call: grpc.ServerUnaryCall<CreateStoryInput, Story>,
  cb: grpc.sendUnaryData<Story>
) {
  const story: Story = { id: nextId(), ...call.request };
  db.set(story.id, story);
  console.log(`Story created [${story.id}]: ${story.title}`);
  cb(null, story);
}

function listStories(
  call: grpc.ServerWritableStream<ListStoriesRequest, Story>
) {
  const { category } = call.request;
  for (const story of db.values()) {
    if (!category || story.category === category) call.write(story);
  }
  call.end();
}

// ── Bootstrap ─────────────────────────────────────────────────────────────
const server = new grpc.Server(SERVER_OPTIONS);
server.addService(StoriesServiceDef.service, { getStory, createStory, listStories });

const PORT = process.env.GRPC_PORT ?? "50051";
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) throw err;
  console.log(`gRPC server running on port ${port}`);
});
