// Messages sent by the client → server
export type ClientMessage =
  | { type: "join";    room: string; username: string }
  | { type: "message"; room: string; text: string }
  | { type: "leave";   room: string }

// Messages sent by the server → client
export type ServerMessage =
  | { type: "joined";  room: string; username: string; onlineCount: number }
  | { type: "message"; room: string; username: string; text: string; at: string }
  | { type: "left";    room: string; username: string; onlineCount: number }
  | { type: "error";   reason: string }
  | { type: "rooms";   list: Array<{ room: string; online: number }> }

// Per-connection state stored in ws.data
export interface ConnectionState {
  username: string | null;
  room: string | null;
}
