import { Request } from "express";

// Extends Express Request with authenticated user payload
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

// Standard API response envelope
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: PaginationMeta;
}

// Pagination metadata returned with list endpoints
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Pagination query params parsed from request
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

// Socket event payloads
export interface SocketEvents {
  "board:update": { boardId: string; type: string; payload: unknown };
  "board:join": { boardId: string };
  "board:leave": { boardId: string };
  "task:move": { taskId: string; fromListId: string; toListId: string; position: number };
  "task:update": { boardId: string; task: unknown };
  "list:update": { boardId: string; list: unknown };
  "activity:new": { boardId: string; activity: unknown };
}
