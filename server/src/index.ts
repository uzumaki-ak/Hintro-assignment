import express, { Express } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { env } from "./config/env";
import { initSocket } from "./socket";
import authRoutes from "./routes/auth.routes";
import boardRoutes from "./routes/board.routes";
import listRoutes from "./routes/list.routes";
import taskRoutes from "./routes/task.routes";
import activityRoutes from "./routes/activity.routes";

const app: Express = express();
const httpServer = createServer(app);

// Rate limiting - prevent spam/abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
  message: { success: false, error: "Too many authentication attempts, please try again later." },
});

// Middleware
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(limiter); // Apply general rate limit to all requests

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/auth", authLimiter, authRoutes); // Stricter rate limit for auth
app.use("/api/boards", boardRoutes);
app.use("/api/boards/:boardId/lists", listRoutes);
app.use("/api/boards/:boardId/lists/:listId/tasks", taskRoutes);
app.use("/api/boards/:boardId/tasks", taskRoutes);
app.use("/api/boards/:boardId/activities", activityRoutes);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, error: "Internal server error" });
});

// Initialize WebSocket server
initSocket(httpServer, env.CLIENT_URL);

// Start listening
httpServer.listen(env.PORT, () => {
  console.log(`[Server] Running on http://localhost:${env.PORT}`);
  console.log(`[Server] Environment: ${env.NODE_ENV}`);
});

export default app;
