import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyToken } from "./utils/jwt";

let io: Server;

// Initializes Socket.IO server with CORS and JWT auth on connection
export function initSocket(httpServer: HttpServer, clientUrl: string): Server {
  io = new Server(httpServer, {
    cors: {
      origin: clientUrl,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Authenticate socket connections via JWT in auth handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error("Invalid token"));
    }

    // Attach user data to socket for later use
    (socket as Socket & { user: typeof payload }).user = payload;
    next();
  });

  io.on("connection", (socket) => {
    const user = (socket as Socket & { user: { id: string; name: string } }).user;
    console.log(`[Socket] User connected: ${user.name} (${user.id})`);

    // Join a board room to receive real-time updates for that board
    socket.on("board:join", (boardId: string) => {
      socket.join(`board:${boardId}`);
      console.log(`[Socket] ${user.name} joined board:${boardId}`);
    });

    // Leave a board room when navigating away
    socket.on("board:leave", (boardId: string) => {
      socket.leave(`board:${boardId}`);
      console.log(`[Socket] ${user.name} left board:${boardId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] User disconnected: ${user.name}`);
    });
  });

  return io;
}

// Emits an event to all clients in a board room
export function emitBoardEvent(boardId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`board:${boardId}`).emit(event, data);
  }
}

// Returns the Socket.IO server instance
export function getIO(): Server {
  return io;
}
