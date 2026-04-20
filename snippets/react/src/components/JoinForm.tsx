import { useEffect, useState } from "react";
import type { RoomInfo } from "../types";

interface Props {
  rooms: RoomInfo[];
  status: string;
  onJoin: (room: string, username: string) => void;
  onFetchRooms: () => void;
}

export function JoinForm({ rooms, status, onJoin, onFetchRooms }: Props) {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");

  useEffect(() => {
    onFetchRooms();
  }, [onFetchRooms]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && room.trim()) {
      onJoin(room.trim(), username.trim());
    }
  };

  const isConnected = status === "connected";

  return (
    <div className="join-wrapper">
      <div className="join-card">
        <h1 className="join-title">📚 Kids Tales Chat</h1>
        <p className="join-subtitle">Entre em uma sala de leitura em tempo real</p>

        <form onSubmit={handleSubmit} className="join-form">
          <label className="field-label">
            Seu nome
            <input
              className="field-input"
              type="text"
              placeholder="ex: Maria"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
              required
            />
          </label>

          <label className="field-label">
            Sala de leitura
            <input
              className="field-input"
              type="text"
              placeholder="ex: historia-1"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              maxLength={40}
              list="rooms-list"
              required
            />
            <datalist id="rooms-list">
              {rooms.map((r) => (
                <option key={r.room} value={r.room}>
                  {r.online} online
                </option>
              ))}
            </datalist>
          </label>

          <button
            className="join-btn"
            type="submit"
            disabled={!isConnected || !username.trim() || !room.trim()}
          >
            {isConnected ? "Entrar na sala" : `Conectando…`}
          </button>
        </form>

        {rooms.length > 0 && (
          <div className="rooms-list">
            <p className="rooms-title">Salas ativas</p>
            {rooms.map((r) => (
              <button
                key={r.room}
                className="room-chip"
                onClick={() => setRoom(r.room)}
              >
                {r.room}
                <span className="room-online">{r.online} online</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
