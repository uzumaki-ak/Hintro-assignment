// User model returned from API
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt?: string;
}

// Board model with relations
export interface Board {
  id: string;
  title: string;
  ownerId: string;
  owner: User;
  members: BoardMember[];
  lists?: List[];
  _count?: { lists: number };
  createdAt: string;
  updatedAt: string;
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  user: User;
  joinedAt: string;
}

// List model with tasks
export interface List {
  id: string;
  title: string;
  position: number;
  boardId: string;
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

// Task model with assignees
export interface Task {
  id: string;
  title: string;
  description: string | null;
  position: number;
  priority: TaskPriority;
  dueDate: string | null;
  listId: string;
  assignees: TaskAssignee[];
  list?: { id: string; title: string };
  createdAt: string;
  updatedAt: string;
}

export interface TaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  user: User;
  assignedAt: string;
}

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

// Activity log entry
export interface Activity {
  id: string;
  type: string;
  message: string;
  boardId: string;
  taskId: string | null;
  userId: string;
  user: User;
  task: { id: string; title: string } | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Auth payloads
export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  email: string;
  name: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
