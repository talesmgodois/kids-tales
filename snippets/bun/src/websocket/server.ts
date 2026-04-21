import { Elysia } from "elysia";
import type { ClientMessage, ConnectionState, ServerMessage } from "./types";

// In-memory registry: room → set of usernames currently connected
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

const app = new Elysia()
  // ── HTTP ──────────────────────────────────────────────────────────────────
  .get("/", () => ({
    name: "kids-tales websocket API",
    ws: "ws://localhost:3002/ws",
    docs: {
      join:    { type: "join",    room: "<id>", username: "<name>" },
      message: { type: "message", room: "<id>", text: "<text>" },
      leave:   { type: "leave",   room: "<id>" },
    },
  }))
  .get("/rooms", () => roomList())

  // ── WebSocket ─────────────────────────────────────────────────────────────
  .ws("/ws", {
    // Initialise per-connection state
    open(ws) {
      (ws.data as unknown as ConnectionState).username = null;
      (ws.data as unknown as ConnectionState).room = null;

      const reply: ServerMessage = { type: "rooms", list: roomList() };
      ws.send(reply);
    },

    message(ws, raw) {
      const state = ws.data as unknown as ConnectionState;
      let msg: ClientMessage;

      try {
        msg = typeof raw === "string" ? JSON.parse(raw) : (raw as ClientMessage);
      } catch {
        const err: ServerMessage = { type: "error", reason: "Invalid JSON" };
        ws.send(err);
        return;
      }

      if (msg.type === "join") {
        // Leave previous room if already in one
        if (state.room && state.username) {
          ws.unsubscribe(state.room);
          leaveRoom(state.room, state.username);
          const leftMsg: ServerMessage = {
            type: "left",
            room: state.room,
            username: state.username,
            onlineCount: rooms.get(state.room)?.size ?? 0,
          };
          ws.publish(state.room, leftMsg);
        }

        state.username = msg.username;
        state.room = msg.room;
        joinRoom(msg.room, msg.username);
        ws.subscribe(msg.room);

        const joinedMsg: ServerMessage = {
          type: "joined",
          room: msg.room,
          username: msg.username,
          onlineCount: rooms.get(msg.room)!.size,
        };
        // Broadcast to room (including sender)
        ws.publish(msg.room, joinedMsg);
        ws.send(joinedMsg);
        return;
      }

      if (msg.type === "message") {
        if (!state.username) {
          ws.send({ type: "error", reason: "Join a room first" } as ServerMessage);
          return;
        }
        const chatMsg: ServerMessage = {
          type: "message",
          room: msg.room,
          username: state.username,
          text: msg.text,
          at: new Date().toISOString(),
        };
        ws.publish(msg.room, chatMsg);
        ws.send(chatMsg);
        return;
      }

      if (msg.type === "leave") {
        if (!state.room || !state.username) return;
        ws.unsubscribe(state.room);
        leaveRoom(state.room, state.username);
        const leftMsg: ServerMessage = {
          type: "left",
          room: state.room,
          username: state.username,
          onlineCount: rooms.get(state.room)?.size ?? 0,
        };
        ws.publish(state.room, leftMsg);
        ws.send(leftMsg);
        state.room = null;
        return;
      }
    },

    close(ws) {
      const state = ws.data as unknown as ConnectionState;
      if (!state.room || !state.username) return;

      ws.unsubscribe(state.room);
      leaveRoom(state.room, state.username);
      const leftMsg: ServerMessage = {
        type: "left",
        room: state.room,
        username: state.username,
        onlineCount: rooms.get(state.room)?.size ?? 0,
      };
      ws.publish(state.room, leftMsg);
    },
  })

  .listen(3002);

console.log(`WebSocket server running`);
console.log(`  HTTP → http://localhost:3002`);
console.log(`  WS   → ws://localhost:3002/ws`);
