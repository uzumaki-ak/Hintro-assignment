import { Router, Response } from "express";
import { prisma } from "../db/client";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createTaskSchema, updateTaskSchema, moveTaskSchema, assignTaskSchema } from "../schemas/task.schema";
import { AuthRequest } from "../types";
import { emitBoardEvent } from "../socket";

const router: Router = Router({ mergeParams: true });

// All task routes require authentication
router.use(authenticate);

// Helper to verify board access for the current user
async function verifyBoardAccess(boardId: string, userId: string) {
  return prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
  });
}

// GET /api/boards/:boardId/tasks/search?q=query - Search tasks within a board
router.get("/search", async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const board = await verifyBoardAccess(boardId, req.user!.id);
    if (!board) {
      res.status(404).json({ success: false, error: "Board not found" });
      return;
    }

    const query = (req.query.q as string) || "";
    if (query.length < 1) {
      res.json({ success: true, data: [] });
      return;
    }

    const tasks = await prisma.task.findMany({
      where: {
        list: { boardId: boardId },
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        list: { select: { id: true, title: true } },
        assignees: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Search tasks error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/boards/:boardId/lists/:listId/tasks - Create a task in a list
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const listId = req.params.listId as string;
    const board = await verifyBoardAccess(boardId, req.user!.id);
    if (!board) {
      res.status(404).json({ success: false, error: "Board not found" });
      return;
    }

    const list = await prisma.list.findFirst({
      where: { id: listId, boardId: boardId },
    });

    if (!list) {
      res.status(404).json({ success: false, error: "List not found" });
      return;
    }

    // Auto-calculate position if not provided
    let position = req.body.position;
    if (position === undefined) {
      const lastTask = await prisma.task.findFirst({
        where: { listId: listId },
        orderBy: { position: "desc" },
      });
      position = lastTask ? lastTask.position + 1 : 0;
    }

    const task = await prisma.task.create({
      data: {
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority || "MEDIUM",
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        position,
        listId: listId,
      },
      include: {
        assignees: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
    });

    await prisma.activity.create({
      data: {
        type: "TASK_CREATED",
        message: `${req.user!.name} created task "${req.body.title}" in ${list.title}`,
        boardId: boardId,
        taskId: task.id,
        userId: req.user!.id,
      },
    });

    emitBoardEvent(boardId, "task:update", { type: "TASK_CREATED", payload: { ...task, listId: listId } });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// PATCH /api/boards/:boardId/tasks/:taskId - Update a task
router.patch("/:taskId", validate(updateTaskSchema), async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const taskId = req.params.taskId as string;
    const board = await verifyBoardAccess(boardId, req.user!.id);
    if (!board) {
      res.status(404).json({ success: false, error: "Board not found" });
      return;
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, list: { boardId: boardId } },
    });

    if (!task) {
      res.status(404).json({ success: false, error: "Task not found" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.priority !== undefined) updateData.priority = req.body.priority;
    if (req.body.dueDate !== undefined) updateData.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignees: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        list: { select: { id: true, title: true } },
      },
    });

    await prisma.activity.create({
      data: {
        type: "TASK_UPDATED",
        message: `${req.user!.name} updated task "${updated.title}"`,
        boardId: boardId,
        taskId: task.id,
        userId: req.user!.id,
      },
    });

    emitBoardEvent(boardId, "task:update", { type: "TASK_UPDATED", payload: updated });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// DELETE /api/boards/:boardId/tasks/:taskId - Delete a task
router.delete("/:taskId", async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const taskId = req.params.taskId as string;
    const board = await verifyBoardAccess(boardId, req.user!.id);
    if (!board) {
      res.status(404).json({ success: false, error: "Board not found" });
      return;
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, list: { boardId: boardId } },
    });

    if (!task) {
      res.status(404).json({ success: false, error: "Task not found" });
      return;
    }

    await prisma.task.delete({ where: { id: taskId } });

    await prisma.activity.create({
      data: {
        type: "TASK_DELETED",
        message: `${req.user!.name} deleted task "${task.title}"`,
        boardId: boardId,
        userId: req.user!.id,
      },
    });

    emitBoardEvent(boardId, "task:update", { type: "TASK_DELETED", payload: { id: task.id, listId: task.listId } });

    res.json({ success: true, data: { id: task.id } });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// PUT /api/boards/:boardId/tasks/:taskId/move - Move a task to a different list/position
router.put("/:taskId/move", validate(moveTaskSchema), async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const taskId = req.params.taskId as string;
    const board = await verifyBoardAccess(boardId, req.user!.id);
    if (!board) {
      res.status(404).json({ success: false, error: "Board not found" });
      return;
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, list: { boardId: boardId } },
      include: { list: { select: { title: true } } },
    });

    if (!task) {
      res.status(404).json({ success: false, error: "Task not found" });
      return;
    }

    const targetList = await prisma.list.findFirst({
      where: { id: req.body.targetListId, boardId: boardId },
    });

    if (!targetList) {
      res.status(404).json({ success: false, error: "Target list not found" });
      return;
    }

    const fromListId = task.listId;

    // Shift positions in target list to make room
    await prisma.task.updateMany({
      where: {
        listId: req.body.targetListId,
        position: { gte: req.body.position },
      },
      data: { position: { increment: 1 } },
    });

    // Move the task
    const moved = await prisma.task.update({
      where: { id: taskId },
      data: {
        listId: req.body.targetListId,
        position: req.body.position,
      },
      include: {
        assignees: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
    });

    // Reindex positions in the source list to close the gap
    const sourceTasks = await prisma.task.findMany({
      where: { listId: fromListId },
      orderBy: { position: "asc" },
    });
    await prisma.$transaction(
      sourceTasks.map((t: { id: string }, idx: number) =>
        prisma.task.update({ where: { id: t.id }, data: { position: idx } })
      )
    );

    await prisma.activity.create({
      data: {
        type: "TASK_MOVED",
        message: `${req.user!.name} moved "${task.title}" from ${task.list.title} to ${targetList.title}`,
        boardId: boardId,
        taskId: task.id,
        userId: req.user!.id,
        metadata: { fromListId, toListId: req.body.targetListId },
      },
    });

    emitBoardEvent(boardId, "task:move", {
      taskId: task.id,
      fromListId,
      toListId: req.body.targetListId,
      position: req.body.position,
      task: moved,
    });

    res.json({ success: true, data: moved });
  } catch (error) {
    console.error("Move task error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/boards/:boardId/tasks/:taskId/assign - Assign a user to a task
router.post("/:taskId/assign", validate(assignTaskSchema), async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const taskId = req.params.taskId as string;
    const board = await verifyBoardAccess(boardId, req.user!.id);
    if (!board) {
      res.status(404).json({ success: false, error: "Board not found" });
      return;
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, list: { boardId: boardId } },
    });

    if (!task) {
      res.status(404).json({ success: false, error: "Task not found" });
      return;
    }

    // Verify the user to assign is a board member
    const isMember = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: boardId, userId: req.body.userId } },
    });

    if (!isMember) {
      res.status(400).json({ success: false, error: "User is not a board member" });
      return;
    }

    // Check if already assigned
    const existing = await prisma.taskAssignee.findUnique({
      where: { taskId_userId: { taskId: taskId, userId: req.body.userId } },
    });

    if (existing) {
      res.status(409).json({ success: false, error: "User already assigned to this task" });
      return;
    }

    const assignee = await prisma.taskAssignee.create({
      data: { taskId: taskId, userId: req.body.userId },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    await prisma.activity.create({
      data: {
        type: "TASK_ASSIGNED",
        message: `${req.user!.name} assigned ${assignee.user.name} to "${task.title}"`,
        boardId: boardId,
        taskId: task.id,
        userId: req.user!.id,
      },
    });

    emitBoardEvent(boardId, "task:update", { type: "TASK_ASSIGNED", payload: { taskId: task.id, assignee } });

    res.status(201).json({ success: true, data: assignee });
  } catch (error) {
    console.error("Assign task error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// DELETE /api/boards/:boardId/tasks/:taskId/assign/:userId - Unassign a user from a task
router.delete("/:taskId/assign/:userId", async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const taskId = req.params.taskId as string;
    const userId = req.params.userId as string;
    const board = await verifyBoardAccess(boardId, req.user!.id);
    if (!board) {
      res.status(404).json({ success: false, error: "Board not found" });
      return;
    }

    await prisma.taskAssignee.delete({
      where: { taskId_userId: { taskId: taskId, userId: userId } },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true },
    });

    await prisma.activity.create({
      data: {
        type: "TASK_UNASSIGNED",
        message: `${req.user!.name} unassigned ${user?.name || "a user"} from "${task?.title}"`,
        boardId: boardId,
        taskId: taskId,
        userId: req.user!.id,
      },
    });

    emitBoardEvent(boardId, "task:update", {
      type: "TASK_UNASSIGNED",
      payload: { taskId: taskId, userId: userId },
    });

    res.json({ success: true, data: { taskId: taskId, userId: userId } });
  } catch (error) {
    console.error("Unassign task error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
