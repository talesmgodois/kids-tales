import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMessage, DisplayMessage, RoomInfo, ServerMessage } from "../types";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3002/ws";
const HTTP_URL = import.meta.env.VITE_HTTP_URL ?? "http://localhost:3002";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected";

export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const roomRef = useRef<string | null>(null);
  const usernameRef = useRef<string | null>(null);

  const pushMessage = useCallback((msg: DisplayMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleServerMessage = useCallback(
    (raw: string) => {
      const msg = JSON.parse(raw) as ServerMessage;

      if (msg.type === "rooms") {
        setRooms(msg.list);
        return;
      }

      if (msg.type === "joined") {
        setCurrentRoom(msg.room);
        setOnlineCount(msg.onlineCount);
        pushMessage({
          id: crypto.randomUUID(),
          kind: "system",
          text: `${msg.username} entrou na sala`,
        });
        return;
      }

      if (msg.type === "left") {
        setOnlineCount(msg.onlineCount);
        pushMessage({
          id: crypto.randomUUID(),
          kind: "system",
          text: `${msg.username} saiu da sala`,
        });
        if (msg.username === usernameRef.current) {
          setCurrentRoom(null);
          setMessages([]);
        }
        return;
      }

      if (msg.type === "message") {
        pushMessage({
          id: crypto.randomUUID(),
          kind: "chat",
          text: msg.text,
          username: msg.username,
          at: msg.at,
        });
        return;
      }

      if (msg.type === "error") {
        pushMessage({
          id: crypto.randomUUID(),
          kind: "system",
          text: `Erro: ${msg.reason}`,
        });
      }
    },
    [pushMessage]
  );

  // Establish the WebSocket connection once on mount
  useEffect(() => {
    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setStatus("connected");
    ws.onclose = () => {
      setStatus("disconnected");
      setCurrentRoom(null);
    };
    ws.onerror = () => setStatus("disconnected");
    ws.onmessage = (e) => handleServerMessage(e.data);

    return () => ws.close();
  }, [handleServerMessage]);

  const send = useCallback((msg: ClientMessage) => {
    wsRef.current?.send(JSON.stringify(msg));
  }, []);

  const join = useCallback(
    (room: string, username: string) => {
      roomRef.current = room;
      usernameRef.current = username;
      send({ type: "join", room, username });
    },
    [send]
  );

  const sendMessage = useCallback(
    (text: string) => {
      if (!roomRef.current) return;
      send({ type: "message", room: roomRef.current, text });
    },
    [send]
  );

  const leave = useCallback(() => {
    if (!roomRef.current) return;
    send({ type: "leave", room: roomRef.current });
    roomRef.current = null;
  }, [send]);

  // Fetch room list via HTTP for the join form
  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`${HTTP_URL}/rooms`);
      const data: RoomInfo[] = await res.json();
      setRooms(data);
    } catch {
      // server may not be up yet; silently ignore
    }
  }, []);

  return {
    status,
    messages,
    rooms,
    onlineCount,
    currentRoom,
    join,
    sendMessage,
    leave,
    fetchRooms,
  };
}
