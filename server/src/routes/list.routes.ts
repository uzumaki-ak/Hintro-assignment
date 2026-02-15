import { Router, Response } from "express";
import { prisma } from "../db/client";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createListSchema, updateListSchema, reorderListsSchema } from "../schemas/list.schema";
import { AuthRequest } from "../types";
import { emitBoardEvent } from "../socket";

const router: Router = Router({ mergeParams: true });

// All list routes require authentication
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

// GET /api/boards/:boardId/lists - Get all lists for a board
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const board = await verifyBoardAccess(boardId, req.user!.id);
    if (!board) {
      res.status(404).json({ success: false, error: "Board not found" });
      return;
    }

    const lists = await prisma.list.findMany({
      where: { boardId: boardId },
      orderBy: { position: "asc" },
      include: {
        tasks: {
          orderBy: { position: "asc" },
          include: {
            assignees: {
              include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
            },
          },
        },
      },
    });

    res.json({ success: true, data: lists });
  } catch (error) {
    console.error("Get lists error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/boards/:boardId/lists - Create a new list in a board
router.post("/", validate(createListSchema), async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const board = await verifyBoardAccess(boardId, req.user!.id);
    if (!board) {
      res.status(404).json({ success: false, error: "Board not found" });
      return;
    }

    // Auto-calculate position if not provided
    let position = req.body.position;
    if (position === undefined) {
      const lastList = await prisma.list.findFirst({
        where: { boardId: boardId },
        orderBy: { position: "desc" },
      });
      position = lastList ? lastList.position + 1 : 0;
    }

    const list = await prisma.list.create({
      data: {
        title: req.body.title,
        position,
        boardId: boardId,
      },
      include: { tasks: true },
    });

    await prisma.activity.create({
      data: {
        type: "LIST_CREATED",
        message: `${req.user!.name} created list "${req.body.title}"`,
        boardId: boardId,
        userId: req.user!.id,
      },
    });

    emitBoardEvent(boardId, "list:update", { type: "LIST_CREATED", payload: list });

    res.status(201).json({ success: true, data: list });
  } catch (error) {
    console.error("Create list error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// PATCH /api/boards/:boardId/lists/:listId - Update a list
router.patch("/:listId", validate(updateListSchema), async (req: AuthRequest, res: Response) => {
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

    const updated = await prisma.list.update({
      where: { id: listId },
      data: {
        ...(req.body.title && { title: req.body.title }),
        ...(req.body.position !== undefined && { position: req.body.position }),
      },
      include: {
        tasks: {
          orderBy: { position: "asc" },
          include: {
            assignees: {
              include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
            },
          },
        },
      },
    });

    await prisma.activity.create({
      data: {
        type: "LIST_UPDATED",
        message: `${req.user!.name} updated list "${updated.title}"`,
        boardId: boardId,
        userId: req.user!.id,
      },
    });

    emitBoardEvent(boardId, "list:update", { type: "LIST_UPDATED", payload: updated });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update list error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// DELETE /api/boards/:boardId/lists/:listId - Delete a list and all its tasks
router.delete("/:listId", async (req: AuthRequest, res: Response) => {
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

    await prisma.list.delete({ where: { id: listId } });

    await prisma.activity.create({
      data: {
        type: "LIST_DELETED",
        message: `${req.user!.name} deleted list "${list.title}"`,
        boardId: boardId,
        userId: req.user!.id,
      },
    });

    emitBoardEvent(boardId, "list:update", { type: "LIST_DELETED", payload: { id: list.id } });

    res.json({ success: true, data: { id: list.id } });
  } catch (error) {
    console.error("Delete list error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// PUT /api/boards/:boardId/lists/reorder - Reorder lists by providing ordered list IDs
router.put("/reorder", validate(reorderListsSchema), async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const board = await verifyBoardAccess(boardId, req.user!.id);
    if (!board) {
      res.status(404).json({ success: false, error: "Board not found" });
      return;
    }

    const { listIds } = req.body;

    // Batch update positions in a transaction
    await prisma.$transaction(
      listIds.map((id: string, index: number) =>
        prisma.list.update({
          where: { id },
          data: { position: index },
        })
      )
    );

    emitBoardEvent(boardId, "list:update", { type: "LISTS_REORDERED", payload: { listIds } });

    res.json({ success: true, data: { listIds } });
  } catch (error) {
    console.error("Reorder lists error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
