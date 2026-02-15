# TaskFlow — Real-Time Task Collaboration Platform

A full-stack, real-time task collaboration platform (Trello/Notion hybrid) built with React, Express, PostgreSQL, and Socket.IO.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue) ![Express](https://img.shields.io/badge/Express-4.21-green) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-purple) ![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black)

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** >= 18
- **pnpm** >= 8 (`npm install -g pnpm`)
- **PostgreSQL** database (free tier on [Neon](https://neon.tech))

### Setup

```bash
# 1. Clone and install dependencies
pnpm install

# 2. Configure environment
# Edit server/.env with your Neon database URL
# (see server/.env.example for reference)

# 3. Push database schema
pnpm db:push

# 4. Seed demo data
pnpm db:seed

# 5. Start both frontend and backend
pnpm dev
```

The app will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

### Demo Credentials
| Email | Password | Role |
|-------|----------|------|
| alice@demo.com | demo123 | Board Owner |
| bob@demo.com | demo123 | Board Admin |
| charlie@demo.com | demo123 | Board Member |

---

## 🏗️ Architecture

### Frontend Architecture

```
client/src/
├── components/          # Reusable UI components
│   ├── board/           # Board-specific components
│   │   ├── BoardList.tsx        # List column with tasks
│   │   ├── TaskCard.tsx         # Individual task card
│   │   ├── SortableTaskCard.tsx # DnD-enabled task card wrapper
│   │   ├── DndBoardWrapper.tsx  # DnD context provider
│   │   ├── TaskModal.tsx        # Task detail/edit modal
│   │   ├── ActivityPanel.tsx    # Activity history slide panel
│   │   ├── MemberPanel.tsx      # Member management panel
│   │   └── SearchPanel.tsx      # Task search overlay
│   └── layout/          # Layout components
│       ├── Header.tsx           # Top navigation bar
│       └── ProtectedRoute.tsx   # Auth guard wrapper
├── lib/                 # Shared utilities
│   ├── api.ts           # Axios instance with auth interceptor
│   └── socket.ts        # Socket.IO client singleton
├── pages/               # Route-level page components
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   ├── DashboardPage.tsx
│   └── BoardPage.tsx
├── stores/              # Zustand state management
│   ├── authStore.ts     # Auth state with localStorage persistence
│   └── boardStore.ts    # Board/list/task state + real-time handlers
├── types/               # TypeScript type definitions
│   └── index.ts
├── App.tsx              # Root component with routing
├── main.tsx             # Entry point
└── index.css            # Global styles + Tailwind
```

**Key Decisions:**
- **Zustand** over Redux: simpler API, built-in persistence middleware, no boilerplate
- **@dnd-kit** over react-beautiful-dnd: actively maintained, better TypeScript support, composable
- **Framer Motion**: smooth page transitions, card animations, panel slides
- **Optimistic updates**: drag-drop updates UI instantly, syncs to server in background

### Backend Architecture

```
server/src/
├── config/              # Environment configuration
│   └── env.ts
├── db/                  # Database layer
│   ├── client.ts        # Prisma singleton client
│   └── seed.ts          # Demo data seeder
├── middleware/           # Express middleware
│   ├── auth.ts          # JWT authentication guard
│   └── validate.ts      # Zod schema validation
├── routes/              # API route handlers
│   ├── auth.routes.ts   # Signup, login, user search
│   ├── board.routes.ts  # Board CRUD + member management
│   ├── list.routes.ts   # List CRUD + reorder
│   ├── task.routes.ts   # Task CRUD + move + assign
│   └── activity.routes.ts # Activity history
├── schemas/             # Zod validation schemas
│   ├── auth.schema.ts
│   ├── board.schema.ts
│   ├── list.schema.ts
│   └── task.schema.ts
├── types/               # TypeScript interfaces
│   └── index.ts
├── utils/               # Shared utilities
│   ├── jwt.ts           # Token sign/verify helpers
│   └── pagination.ts    # Pagination parser + meta builder
├── socket.ts            # Socket.IO server setup + event emitter
└── index.ts             # Express app entry point
```

**Key Decisions:**
- **REST over GraphQL**: simpler to evaluate, document, and debug for this scope
- **Prisma ORM**: type-safe queries, auto-generated types, migration support
- **Zod validation**: runtime type checking on all request bodies
- **Socket.IO rooms**: each board is a room, events broadcast to all board members

---

## 📊 Database Schema

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│    users      │     │   board_members   │     │    boards     │
├──────────────┤     ├──────────────────┤     ├──────────────┤
│ id (PK)      │◄────│ user_id (FK)     │────►│ id (PK)      │
│ email (UQ)   │     │ board_id (FK)    │     │ title        │
│ name         │     │ role (ENUM)      │     │ owner_id (FK)│
│ password     │     │ joined_at        │     │ created_at   │
│ avatar_url   │     └──────────────────┘     │ updated_at   │
│ created_at   │                               └──────┬───────┘
│ updated_at   │                                      │
└──────┬───────┘                               ┌──────┴───────┐
       │                                       │    lists      │
       │     ┌──────────────────┐              ├──────────────┤
       │     │  task_assignees   │              │ id (PK)      │
       │     ├──────────────────┤              │ title        │
       ├────►│ user_id (FK)     │              │ position     │
       │     │ task_id (FK)     │              │ board_id (FK)│
       │     │ assigned_at      │              │ created_at   │
       │     └────────┬─────────┘              │ updated_at   │
       │              │                        └──────┬───────┘
       │     ┌────────┴─────────┐                     │
       │     │     tasks         │◄────────────────────┘
       │     ├──────────────────┤
       │     │ id (PK)          │
       │     │ title            │
       │     │ description      │
       │     │ position         │
       │     │ priority (ENUM)  │
       │     │ due_date         │
       │     │ list_id (FK)     │
       │     │ created_at       │
       │     │ updated_at       │
       │     └────────┬─────────┘
       │              │
       │     ┌────────┴─────────┐
       └────►│   activities      │
             ├──────────────────┤
             │ id (PK)          │
             │ type (ENUM)      │
             │ message          │
             │ board_id (FK)    │
             │ task_id (FK?)    │
             │ user_id (FK)     │
             │ metadata (JSON)  │
             │ created_at       │
             └──────────────────┘
```

**Indexes:** `board_id` on lists, tasks, activities; `position` on tasks; `created_at` on activities; composite unique on `board_members(board_id, user_id)` and `task_assignees(task_id, user_id)`.

**Enums:** `BoardRole` (OWNER, ADMIN, MEMBER), `TaskPriority` (LOW, MEDIUM, HIGH, URGENT), `ActivityType` (13 event types).

---

## 📡 API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/auth/me` | Get current user profile |
| GET | `/api/auth/users/search?q=` | Search users by name/email |

### Boards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards?page=&search=` | List user's boards (paginated) |
| GET | `/api/boards/:id` | Get board with lists and tasks |
| POST | `/api/boards` | Create new board |
| PATCH | `/api/boards/:id` | Update board title |
| DELETE | `/api/boards/:id` | Delete board (owner only) |
| POST | `/api/boards/:id/members` | Add member by email |
| DELETE | `/api/boards/:id/members/:userId` | Remove member |

### Lists
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:boardId/lists` | Get all lists for a board |
| POST | `/api/boards/:boardId/lists` | Create new list |
| PATCH | `/api/boards/:boardId/lists/:listId` | Update list |
| DELETE | `/api/boards/:boardId/lists/:listId` | Delete list |
| PUT | `/api/boards/:boardId/lists/reorder` | Reorder lists |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:boardId/tasks/search?q=` | Search tasks |
| POST | `/api/boards/:boardId/lists/:listId/tasks` | Create task |
| PATCH | `/api/boards/:boardId/tasks/:taskId` | Update task |
| DELETE | `/api/boards/:boardId/tasks/:taskId` | Delete task |
| PUT | `/api/boards/:boardId/tasks/:taskId/move` | Move task across lists |
| POST | `/api/boards/:boardId/tasks/:taskId/assign` | Assign user |
| DELETE | `/api/boards/:boardId/tasks/:taskId/assign/:userId` | Unassign user |

### Activities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:boardId/activities?page=` | Get activity history |

**All endpoints (except auth) require `Authorization: Bearer <token>` header.**

**Response format:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

---

## 🔄 Real-Time Sync Strategy

```
Client A (Board View)          Server              Client B (Board View)
       │                         │                         │
       │── board:join ──────────►│                         │
       │                         │◄──── board:join ────────│
       │                         │                         │
       │── POST /tasks ─────────►│                         │
       │◄── 201 Created ────────│                         │
       │                         │── task:update ─────────►│
       │                         │   (TASK_CREATED)        │
       │                         │                         │
       │── PUT /tasks/:id/move ─►│                         │
       │   (optimistic update)   │                         │
       │◄── 200 OK ─────────────│                         │
       │                         │── task:move ───────────►│
       │                         │   (position update)     │
```

- **Socket.IO rooms**: each board has a room `board:{id}`
- **JWT auth on connect**: socket handshake includes token
- **Optimistic updates**: drag-drop updates local state immediately, then syncs
- **Event types**: `board:update`, `list:update`, `task:update`, `task:move`
- **Fallback**: if WebSocket fails, Socket.IO falls back to long-polling

---

## 📈 Scalability Considerations

1. **Database**: PostgreSQL with proper indexes on foreign keys and frequently queried columns. Neon supports auto-scaling and connection pooling.

2. **Real-time**: Socket.IO can be horizontally scaled with Redis adapter (`@socket.io/redis-adapter`) for multi-server deployments.

3. **API**: Stateless JWT auth allows horizontal scaling of Express servers behind a load balancer.

4. **Frontend**: Vite builds produce optimized, code-split bundles. Zustand stores are lightweight with no unnecessary re-renders.

5. **Caching**: React Query or SWR could be added for API response caching. Currently, Zustand store acts as client-side cache.

6. **Rate limiting**: Express-rate-limit should be added for production to prevent abuse.

---

## 🧪 Assumptions & Trade-offs

- **No email verification**: simplified for demo purposes
- **No file uploads**: task attachments not implemented
- **No role-based permissions on tasks**: any board member can edit any task
- **Optimistic drag-drop**: may briefly show stale state if server rejects the move
- **Single JWT secret**: in production, use RS256 with key rotation
- **No refresh tokens**: JWT expires in 7 days, user must re-login after

---

## 🛠️ Tech Stack Summary

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + TypeScript | Industry standard SPA framework |
| Styling | TailwindCSS | Utility-first, rapid UI development |
| State | Zustand | Lightweight, no boilerplate, persistence |
| Drag & Drop | @dnd-kit | Modern, composable, TypeScript-first |
| Animations | Framer Motion | Declarative, performant animations |
| Backend | Express + TypeScript | Mature, well-documented, flexible |
| ORM | Prisma | Type-safe, auto-generated client |
| Database | PostgreSQL (Neon) | Relational, ACID, scalable |
| Validation | Zod | Runtime type checking, TS inference |
| Auth | JWT (jsonwebtoken) | Stateless, scalable authentication |
| Real-time | Socket.IO | Reliable WebSocket with fallbacks |
| Build | Vite | Fast HMR, optimized production builds |
| Package Manager | pnpm | Fast, disk-efficient, workspace support |

---

## 📁 Project Structure

```
taskflow/
├── client/              # React frontend (Vite)
├── server/              # Express backend
├── package.json         # Root workspace config
├── pnpm-workspace.yaml  # Monorepo workspace definition
└── README.md            # This file
```
