import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// Creates or returns existing socket connection with JWT auth
export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem("token");
    socket = io("/", {
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socket;
}

// Connects the socket if not already connected
export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

// Disconnects and cleans up the socket instance
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Joins a board room to receive real-time updates
export function joinBoard(boardId: string): void {
  const s = getSocket();
  s.emit("board:join", boardId);
}

// Leaves a board room
export function leaveBoard(boardId: string): void {
  const s = getSocket();
  s.emit("board:leave", boardId);
}
