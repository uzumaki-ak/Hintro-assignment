import { create } from "zustand";
import api from "@/lib/api";
import { Board, List, Task, Activity, PaginationMeta } from "@/types";

interface BoardState {
  // Board list (dashboard)
  boards: Board[];
  boardsMeta: PaginationMeta | null;
  boardsLoading: boolean;

  // Active board (board view)
  activeBoard: Board | null;
  activeBoardLoading: boolean;

  // Activities
  activities: Activity[];
  activitiesMeta: PaginationMeta | null;
  activitiesLoading: boolean;

  // Actions - Boards
  fetchBoards: (page?: number, search?: string) => Promise<void>;
  fetchBoard: (id: string) => Promise<void>;
  createBoard: (title: string) => Promise<Board>;
  updateBoard: (id: string, title: string) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  addMember: (boardId: string, email: string) => Promise<void>;
  removeMember: (boardId: string, userId: string) => Promise<void>;

  // Actions - Lists
  createList: (boardId: string, title: string) => Promise<void>;
  updateList: (boardId: string, listId: string, title: string) => Promise<void>;
  deleteList: (boardId: string, listId: string) => Promise<void>;

  // Actions - Tasks
  createTask: (boardId: string, listId: string, title: string) => Promise<void>;
  updateTask: (boardId: string, taskId: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (boardId: string, taskId: string) => Promise<void>;
  moveTask: (boardId: string, taskId: string, targetListId: string, position: number) => Promise<void>;
  assignTask: (boardId: string, taskId: string, userId: string) => Promise<void>;
  unassignTask: (boardId: string, taskId: string, userId: string) => Promise<void>;

  // Actions - Activities
  fetchActivities: (boardId: string, page?: number) => Promise<void>;

  // Actions - Search
  searchTasks: (boardId: string, query: string) => Promise<Task[]>;

  // Real-time update handlers
  handleBoardUpdate: (data: { type: string; payload: unknown }) => void;
  handleListUpdate: (data: { type: string; payload: unknown }) => void;
  handleTaskUpdate: (data: { type: string; payload: unknown }) => void;
  handleTaskMove: (data: { taskId: string; fromListId: string; toListId: string; position: number; task: Task }) => void;

  // Optimistic local state updates for drag-drop
  moveTaskLocal: (taskId: string, fromListId: string, toListId: string, newPosition: number) => void;
}

export const useBoardStore = create<BoardState>()((set, get) => ({
  boards: [],
  boardsMeta: null,
  boardsLoading: false,
  activeBoard: null,
  activeBoardLoading: false,
  activities: [],
  activitiesMeta: null,
  activitiesLoading: false,

  // Fetches paginated board list for dashboard
  fetchBoards: async (page = 1, search = "") => {
    set({ boardsLoading: true });
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      const { data } = await api.get(`/boards?${params}`);
      set({ boards: data.data, boardsMeta: data.meta, boardsLoading: false });
    } catch {
      set({ boardsLoading: false });
    }
  },

  // Fetches a single board with all lists and tasks
  fetchBoard: async (id: string) => {
    set({ activeBoardLoading: true });
    try {
      const { data } = await api.get(`/boards/${id}`);
      set({ activeBoard: data.data, activeBoardLoading: false });
    } catch {
      set({ activeBoardLoading: false });
    }
  },

  createBoard: async (title: string) => {
    const { data } = await api.post("/boards", { title });
    const board = data.data as Board;
    set((state) => ({ boards: [board, ...state.boards] }));
    return board;
  },

  updateBoard: async (id: string, title: string) => {
    const { data } = await api.patch(`/boards/${id}`, { title });
    set((state) => ({
      boards: state.boards.map((b) => (b.id === id ? { ...b, ...data.data } : b)),
      activeBoard: state.activeBoard?.id === id ? { ...state.activeBoard, ...data.data } : state.activeBoard,
    }));
  },

  deleteBoard: async (id: string) => {
    await api.delete(`/boards/${id}`);
    set((state) => ({
      boards: state.boards.filter((b) => b.id !== id),
      activeBoard: state.activeBoard?.id === id ? null : state.activeBoard,
    }));
  },

  addMember: async (boardId: string, email: string) => {
    const { data } = await api.post(`/boards/${boardId}/members`, { email });
    set((state) => {
      if (!state.activeBoard || state.activeBoard.id !== boardId) return state;
      return {
        activeBoard: {
          ...state.activeBoard,
          members: [...state.activeBoard.members, data.data],
        },
      };
    });
  },

  removeMember: async (boardId: string, userId: string) => {
    await api.delete(`/boards/${boardId}/members/${userId}`);
    set((state) => {
      if (!state.activeBoard || state.activeBoard.id !== boardId) return state;
      return {
        activeBoard: {
          ...state.activeBoard,
          members: state.activeBoard.members.filter((m) => m.userId !== userId),
        },
      };
    });
  },

  // List CRUD
  createList: async (boardId: string, title: string) => {
    const { data } = await api.post(`/boards/${boardId}/lists`, { title });
    set((state) => {
      if (!state.activeBoard || state.activeBoard.id !== boardId) return state;
      const existing = state.activeBoard.lists?.find((l) => l.id === data.data.id);
      const nextList = { ...data.data, tasks: data.data.tasks || existing?.tasks || [] };
      const lists = existing
        ? state.activeBoard.lists!.map((l) => (l.id === data.data.id ? { ...l, ...nextList } : l))
        : [...(state.activeBoard.lists || []), nextList];
      return {
        activeBoard: {
          ...state.activeBoard,
          lists,
        },
      };
    });
  },

  updateList: async (boardId: string, listId: string, title: string) => {
    const { data } = await api.patch(`/boards/${boardId}/lists/${listId}`, { title });
    set((state) => {
      if (!state.activeBoard?.lists) return state;
      return {
        activeBoard: {
          ...state.activeBoard,
          lists: state.activeBoard.lists.map((l) => (l.id === listId ? { ...l, ...data.data } : l)),
        },
      };
    });
  },

  deleteList: async (boardId: string, listId: string) => {
    await api.delete(`/boards/${boardId}/lists/${listId}`);
    set((state) => {
      if (!state.activeBoard?.lists) return state;
      return {
        activeBoard: {
          ...state.activeBoard,
          lists: state.activeBoard.lists.filter((l) => l.id !== listId),
        },
      };
    });
  },

  // Task CRUD
  createTask: async (boardId: string, listId: string, title: string) => {
    const { data } = await api.post(`/boards/${boardId}/lists/${listId}/tasks`, { title });
    set((state) => {
      if (!state.activeBoard?.lists) return state;
      const taskId = data.data.id;
      return {
        activeBoard: {
          ...state.activeBoard,
          lists: state.activeBoard.lists.map((l) => {
            if (l.id !== listId) return l;
            const existingTask = l.tasks.find((t) => t.id === taskId);
            if (existingTask) {
              return {
                ...l,
                tasks: l.tasks.map((t) => (t.id === taskId ? { ...t, ...data.data } : t)),
              };
            }
            return { ...l, tasks: [...l.tasks, data.data] };
          }),
        },
      };
    });
  },

  updateTask: async (boardId: string, taskId: string, updateData: Partial<Task>) => {
    const { data } = await api.patch(`/boards/${boardId}/tasks/${taskId}`, updateData);
    set((state) => {
      if (!state.activeBoard?.lists) return state;
      return {
        activeBoard: {
          ...state.activeBoard,
          lists: state.activeBoard.lists.map((l) => ({
            ...l,
            tasks: l.tasks.map((t) => (t.id === taskId ? { ...t, ...data.data } : t)),
          })),
        },
      };
    });
  },

  deleteTask: async (boardId: string, taskId: string) => {
    await api.delete(`/boards/${boardId}/tasks/${taskId}`);
    set((state) => {
      if (!state.activeBoard?.lists) return state;
      return {
        activeBoard: {
          ...state.activeBoard,
          lists: state.activeBoard.lists.map((l) => ({
            ...l,
            tasks: l.tasks.filter((t) => t.id !== taskId),
          })),
        },
      };
    });
  },

  moveTask: async (boardId: string, taskId: string, targetListId: string, position: number) => {
    await api.put(`/boards/${boardId}/tasks/${taskId}/move`, { targetListId, position });
  },

  assignTask: async (boardId: string, taskId: string, userId: string) => {
    const { data } = await api.post(`/boards/${boardId}/tasks/${taskId}/assign`, { userId });
    set((state) => {
      if (!state.activeBoard?.lists) return state;
      return {
        activeBoard: {
          ...state.activeBoard,
          lists: state.activeBoard.lists.map((l) => ({
            ...l,
            tasks: l.tasks.map((t) =>
              t.id === taskId ? { ...t, assignees: [...t.assignees, data.data] } : t
            ),
          })),
        },
      };
    });
  },

  unassignTask: async (boardId: string, taskId: string, userId: string) => {
    await api.delete(`/boards/${boardId}/tasks/${taskId}/assign/${userId}`);
    set((state) => {
      if (!state.activeBoard?.lists) return state;
      return {
        activeBoard: {
          ...state.activeBoard,
          lists: state.activeBoard.lists.map((l) => ({
            ...l,
            tasks: l.tasks.map((t) =>
              t.id === taskId ? { ...t, assignees: t.assignees.filter((a) => a.userId !== userId) } : t
            ),
          })),
        },
      };
    });
  },

  fetchActivities: async (boardId: string, page = 1) => {
    set({ activitiesLoading: true });
    try {
      const { data } = await api.get(`/boards/${boardId}/activities?page=${page}&limit=20`);
      set({
        activities: page === 1 ? data.data : [...get().activities, ...data.data],
        activitiesMeta: data.meta,
        activitiesLoading: false,
      });
    } catch {
      set({ activitiesLoading: false });
    }
  },

  searchTasks: async (boardId: string, query: string) => {
    const { data } = await api.get(`/boards/${boardId}/tasks/search?q=${encodeURIComponent(query)}`);
    return data.data as Task[];
  },

  // Optimistic local move for instant drag-drop feedback
  moveTaskLocal: (taskId: string, fromListId: string, toListId: string, newPosition: number) => {
    set((state) => {
      if (!state.activeBoard?.lists) return state;

      const lists = state.activeBoard.lists.map((l) => ({ ...l, tasks: [...l.tasks] }));
      const sourceList = lists.find((l) => l.id === fromListId);
      const targetList = lists.find((l) => l.id === toListId);

      if (!sourceList || !targetList) return state;

      const taskIndex = sourceList.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) return state;

      const [task] = sourceList.tasks.splice(taskIndex, 1);
      task.listId = toListId;
      task.position = newPosition;
      targetList.tasks.splice(newPosition, 0, task);

      // Reindex positions
      sourceList.tasks.forEach((t, i) => (t.position = i));
      targetList.tasks.forEach((t, i) => (t.position = i));

      return { activeBoard: { ...state.activeBoard, lists } };
    });
  },

  // Socket event handlers for real-time sync
  handleBoardUpdate: (data: { type: string; payload: unknown }) => {
    const { type, payload } = data;
    if (type === "BOARD_UPDATED") {
      set((state) => ({
        activeBoard: state.activeBoard ? { ...state.activeBoard, ...(payload as Partial<Board>) } : null,
      }));
    } else if (type === "MEMBER_ADDED" || type === "MEMBER_REMOVED") {
      // Refetch board to get updated members
      const boardId = get().activeBoard?.id;
      if (boardId) get().fetchBoard(boardId);
    }
  },

  handleListUpdate: (data: { type: string; payload: unknown }) => {
    const { type, payload } = data;
    const board = get().activeBoard;
    if (!board?.lists) return;

    if (type === "LIST_CREATED") {
      const newList = payload as List;
      const existingList = board.lists.find((l) => l.id === newList.id);
      const normalizedList = {
        ...newList,
        tasks: newList.tasks || existingList?.tasks || [],
      };
      const lists = existingList
        ? board.lists.map((l) => (l.id === newList.id ? { ...l, ...normalizedList } : l))
        : [...board.lists, normalizedList];
      set({
        activeBoard: {
          ...board,
          lists,
        },
      });
    } else if (type === "LIST_UPDATED") {
      const updated = payload as List;
      set({
        activeBoard: {
          ...board,
          lists: board.lists.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)),
        },
      });
    } else if (type === "LIST_DELETED") {
      const { id } = payload as { id: string };
      set({
        activeBoard: { ...board, lists: board.lists.filter((l) => l.id !== id) },
      });
    }
  },

  handleTaskUpdate: (data: { type: string; payload: unknown }) => {
    const { type, payload } = data;
    const board = get().activeBoard;
    if (!board?.lists) return;

    if (type === "TASK_CREATED") {
      const task = payload as Task & { listId: string };
      set({
        activeBoard: {
          ...board,
          lists: board.lists.map((l) => {
            if (l.id !== task.listId) return l;
            const existingTask = l.tasks.find((t) => t.id === task.id);
            if (existingTask) {
              return {
                ...l,
                tasks: l.tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t)),
              };
            }
            return { ...l, tasks: [...l.tasks, task] };
          }),
        },
      });
    } else if (type === "TASK_UPDATED" || type === "TASK_ASSIGNED" || type === "TASK_UNASSIGNED") {
      // Refetch board for simplicity on assignment changes
      const boardId = board.id;
      get().fetchBoard(boardId);
    } else if (type === "TASK_DELETED") {
      const { id, listId } = payload as { id: string; listId: string };
      set({
        activeBoard: {
          ...board,
          lists: board.lists.map((l) =>
            l.id === listId ? { ...l, tasks: l.tasks.filter((t) => t.id !== id) } : l
          ),
        },
      });
    }
  },

  handleTaskMove: (data) => {
    const board = get().activeBoard;
    if (!board?.lists) return;

    const { taskId, fromListId, toListId, task } = data;
    const lists = board.lists.map((l) => ({ ...l, tasks: [...l.tasks] }));

    const sourceList = lists.find((l) => l.id === fromListId);
    const targetList = lists.find((l) => l.id === toListId);

    if (sourceList) {
      sourceList.tasks = sourceList.tasks.filter((t) => t.id !== taskId);
    }

    if (targetList && task) {
      // Remove if already exists (prevent duplicates)
      targetList.tasks = targetList.tasks.filter((t) => t.id !== taskId);
      targetList.tasks.push(task);
      targetList.tasks.sort((a, b) => a.position - b.position);
    }

    set({ activeBoard: { ...board, lists } });
  },
}));
