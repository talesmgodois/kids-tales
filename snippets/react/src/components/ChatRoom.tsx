import { useEffect, useRef, useState } from "react";
import type { DisplayMessage } from "../types";

interface Props {
  room: string;
  onlineCount: number;
  messages: DisplayMessage[];
  onSend: (text: string) => void;
  onLeave: () => void;
}

export function ChatRoom({ room, onlineCount, messages, onSend, onLeave }: Props) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text.trim());
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        onSend(text.trim());
        setText("");
      }
    }
  };

  return (
    <div className="chat-wrapper">
      <header className="chat-header">
        <div className="chat-room-info">
          <span className="chat-room-name">#{room}</span>
          <span className="chat-online">
            <span className="online-dot" /> {onlineCount} online
          </span>
        </div>
        <button className="leave-btn" onClick={onLeave}>
          Sair
        </button>
      </header>

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">Nenhuma mensagem ainda. Diga olá!</p>
        )}
        {messages.map((msg) =>
          msg.kind === "system" ? (
            <div key={msg.id} className="msg-system">
              {msg.text}
            </div>
          ) : (
            <div key={msg.id} className="msg-chat">
              <span className="msg-author">{msg.username}</span>
              <span className="msg-text">{msg.text}</span>
              <span className="msg-time">
                {msg.at ? new Date(msg.at).toLocaleTimeString() : ""}
              </span>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-bar" onSubmit={handleSubmit}>
        <textarea
          className="chat-input"
          placeholder="Digite uma mensagem… (Enter para enviar)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button className="send-btn" type="submit" disabled={!text.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}
