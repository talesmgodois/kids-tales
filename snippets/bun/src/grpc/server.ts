import * as grpc from "@grpc/grpc-js";
import { SERVER_OPTIONS, StoriesServiceDef } from "./loader";
import type { StoriesServiceHandlers } from "./generated/stories/StoriesService";
import type { Story } from "./generated/stories/Story";

// ── In-memory store ───────────────────────────────────────────────────────
const db = new Map<string, Story>(
  [
    { id: "1", title: "A Floresta Mágica", author: "Ana Lima",   content: "Era uma vez uma floresta...",      category: "fantasia", age_min: 4 },
    { id: "2", title: "O Dragão Azul",     author: "João Souza", content: "O dragão vivia numa montanha...", category: "fantasia", age_min: 6 },
    { id: "3", title: "A Sereia Curiosa",  author: "Maria Reis", content: "No fundo do mar existia...",      category: "aventura", age_min: 5 },
  ].map((s) => [s.id!, s])
);

function nextId(): string {
  return String(db.size + 1);
}

// ── Handlers — typed via generated StoriesServiceHandlers ─────────────────
// The compiler enforces that every RPC defined in the proto is implemented
// and that each handler's request/response types match the proto exactly.
const handlers: StoriesServiceHandlers = {
  GetStory(call, cb) {
    const story = db.get(call.request.id!);
    if (!story) return cb({ code: grpc.status.NOT_FOUND, message: "Story not found" });
    cb(null, story);
  },

  CreateStory(call, cb) {
    const story: Story = { id: nextId(), ...call.request };
    db.set(story.id!, story);
    console.log(`Story created [${story.id}]: ${story.title}`);
    cb(null, story);
  },

  ListStories(call) {
    const { category } = call.request;
    for (const story of db.values()) {
      if (!category || story.category === category) call.write(story);
    }
    call.end();
  },
};

// ── Bootstrap ─────────────────────────────────────────────────────────────
const server = new grpc.Server(SERVER_OPTIONS);
server.addService(StoriesServiceDef.service, handlers);

const PORT = process.env.GRPC_PORT ?? "50051";
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) throw err;
  console.log(`gRPC server running on port ${port}`);
});
