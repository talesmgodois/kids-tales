import { ChatRoom } from "./components/ChatRoom";
import { JoinForm } from "./components/JoinForm";
import { useWebSocket } from "./hooks/useWebSocket";

export default function App() {
  const {
    status,
    messages,
    rooms,
    onlineCount,
    currentRoom,
    join,
    sendMessage,
    leave,
    fetchRooms,
  } = useWebSocket();

  if (currentRoom) {
    return (
      <ChatRoom
        room={currentRoom}
        onlineCount={onlineCount}
        messages={messages}
        onSend={sendMessage}
        onLeave={leave}
      />
    );
  }

  return (
    <JoinForm
      rooms={rooms}
      status={status}
      onJoin={join}
      onFetchRooms={fetchRooms}
    />
  );
}
