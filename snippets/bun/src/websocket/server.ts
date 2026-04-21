import { Elysia } from "elysia";
import type { ClientMessage, ConnectionState, ServerMessage } from "./types";

// ── Room registry ─────────────────────────────────────────────────────────
const rooms = new Map<string, Set<string>>();

function roomList() {
  return [...rooms.entries()]
    .filter(([, users]) => users.size > 0)
    .map(([room, users]) => ({ room, online: users.size }));
}

function joinRoom(room: string, username: string) {
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room)!.add(username);
}

function leaveRoom(room: string, username: string) {
  rooms.get(room)?.delete(username);
  if (rooms.get(room)?.size === 0) rooms.delete(room);
}

// ── WS helpers ────────────────────────────────────────────────────────────

// Elysia stores per-connection data in ws.data; this accessor removes the
// repeated double-cast that would otherwise appear in every handler.
function stateOf(ws: { data: unknown }): ConnectionState {
  return ws.data as unknown as ConnectionState;
}

interface WsLike {
  unsubscribe(room: string): void;
  publish(room: string, msg: ServerMessage): void;
  send(msg: ServerMessage): void;
}

// Unsubscribes from the current room, updates the registry, and broadcasts
// the "left" event. Pass sendToSelf=true when the client explicitly left
// (so they get an acknowledgement); false on room-switch or disconnect.
function doLeave(ws: WsLike, state: ConnectionState, sendToSelf = false) {
  if (!state.room || !state.username) return;

  ws.unsubscribe(state.room);
  leaveRoom(state.room, state.username);

  const msg: ServerMessage = {
    type: "left",
    room: state.room,
    username: state.username,
    onlineCount: rooms.get(state.room)?.size ?? 0,
  };

  ws.publish(state.room, msg);
  if (sendToSelf) ws.send(msg);

  state.room = null;
  state.username = null;
}

// ── Server ────────────────────────────────────────────────────────────────
const app = new Elysia()
  .get("/", () => ({
    name: "kids-tales websocket API",
    ws: "ws://localhost:3002/ws",
    protocol: {
      join:    { type: "join",    room: "<id>", username: "<name>" },
      message: { type: "message", room: "<id>", text: "<text>" },
      leave:   { type: "leave",   room: "<id>" },
    },
  }))
  .get("/rooms", () => roomList())

  .ws("/ws", {
    open(ws) {
      const state = stateOf(ws);
      state.username = null;
      state.room = null;
      ws.send({ type: "rooms", list: roomList() } satisfies ServerMessage);
    },

    message(ws, raw) {
      const state = stateOf(ws);
      let msg: ClientMessage;

      try {
        msg = typeof raw === "string" ? JSON.parse(raw) : (raw as ClientMessage);
      } catch {
        ws.send({ type: "error", reason: "Invalid JSON" } satisfies ServerMessage);
        return;
      }

      if (msg.type === "join") {
        doLeave(ws, state); // leave previous room silently on room-switch
        state.username = msg.username;
        state.room = msg.room;
        joinRoom(msg.room, msg.username);
        ws.subscribe(msg.room);

        const joined: ServerMessage = {
          type: "joined",
          room: msg.room,
          username: msg.username,
          onlineCount: rooms.get(msg.room)!.size,
        };
        ws.publish(msg.room, joined);
        ws.send(joined);
        return;
      }

      if (msg.type === "message") {
        if (!state.username) {
          ws.send({ type: "error", reason: "Join a room first" } satisfies ServerMessage);
          return;
        }
        const chat: ServerMessage = {
          type: "message",
          room: msg.room,
          username: state.username,
          text: msg.text,
          at: new Date().toISOString(),
        };
        ws.publish(msg.room, chat);
        ws.send(chat);
        return;
      }

      if (msg.type === "leave") {
        doLeave(ws, state, true); // acknowledge the leave to sender
      }
    },

    close(ws) {
      doLeave(ws, stateOf(ws)); // broadcast disconnect silently
    },
  })

  .listen(3002);

console.log("WebSocket server running");
console.log("  HTTP → http://localhost:3002");
console.log("  WS   → ws://localhost:3002/ws");
