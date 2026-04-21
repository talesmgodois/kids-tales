// Mirrors the protocol defined in snippets/bun/src/websocket/types.ts

export type ClientMessage =
  | { type: "join";    room: string; username: string }
  | { type: "message"; room: string; text: string }
  | { type: "leave";   room: string }

export type ServerMessage =
  | { type: "joined";  room: string; username: string; onlineCount: number }
  | { type: "message"; room: string; username: string; text: string; at: string }
  | { type: "left";    room: string; username: string; onlineCount: number }
  | { type: "error";   reason: string }
  | { type: "rooms";   list: RoomInfo[] }

export interface RoomInfo {
  room: string;
  online: number;
}

// Normalised entry for the chat message list
export interface DisplayMessage {
  id: string;
  kind: "chat" | "system";
  text: string;
  username?: string;
  at?: string;
}
