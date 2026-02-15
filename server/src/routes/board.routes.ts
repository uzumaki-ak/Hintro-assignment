import { Router, Response } from "express";
import { prisma } from "../db/client";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createBoardSchema, updateBoardSchema, addMemberSchema } from "../schemas/board.schema";
import { AuthRequest } from "../types";
import { parsePagination, buildPaginationMeta } from "../utils/pagination";
import { emitBoardEvent } from "../socket";

const router: Router = Router();

// All board routes require authentication
router.use(authenticate);

// GET /api/boards - List all boards the user owns or is a member of
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const search = (req.query.search as string) || "";

    const where = {
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { userId: req.user!.id } } },
      ],
      ...(search && { title: { contains: search, mode: "insensitive" as const } }),
    };

    const [boards, total] = await Promise.all([
      prisma.board.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
          members: {
            include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          },
          _count: { select: { lists: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.board.count({ where }),
    ]);

    res.json({
      success: true,
      data: boards,
      meta: buildPaginationMeta(total, { page, limit, skip }),
    });
  } catch (error) {
    console.error("List boards error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/boards/:id - Get a single board with all lists and tasks
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.id as string;
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: req.user!.id },
          { members: { some: { userId: req.user!.id } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        lists: {
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
        },
      },
    });

    if (!board) {
      res.status(404).json({ success: false, error: "Board not found" });
      return;
    }

    res.json({ success: true, data: board });
  } catch (error) {
    console.error("Get board error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/boards - Create a new board
router.post("/", validate(createBoardSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { title } = req.body;

    const board = await prisma.board.create({
      data: {
        title,
        ownerId: req.user!.id,
        members: {
          create: { userId: req.user!.id, role: "OWNER" },
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        _count: { select: { lists: true } },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: "BOARD_CREATED",
        message: `${req.user!.name} created board "${title}"`,
        boardId: board.id,
        userId: req.user!.id,
      },
    });

    res.status(201).json({ success: true, data: board });
  } catch (error) {
    console.error("Create board error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// PATCH /api/boards/:id - Update board title
router.patch("/:id", validate(updateBoardSchema), async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.id as string;
    const board = await prisma.board.findFirst({
      where: { id: boardId, ownerId: req.user!.id },
    });

    if (!board) {
      res.status(404).json({ success: false, error: "Board not found or unauthorized" });
      return;
    }

    const updated = await prisma.board.update({
      where: { id: boardId },
      data: { title: req.body.title },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
    });

    await prisma.activity.create({
      data: {
        type: "BOARD_UPDATED",
        message: `${req.user!.name} renamed board to "${req.body.title}"`,
        boardId: board.id,
        userId: req.user!.id,
      },
    });

    emitBoardEvent(board.id, "board:update", { type: "BOARD_UPDATED", payload: updated });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update board error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// DELETE /api/boards/:id - Delete a board (owner only)
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.id as string;
    const board = await prisma.board.findFirst({
      where: { id: boardId, ownerId: req.user!.id },
    });

    if (!board) {
      res.status(404).json({ success: false, error: "Board not found or unauthorized" });
      return;
    }

    await prisma.board.delete({ where: { id: boardId } });

    emitBoardEvent(board.id, "board:update", { type: "BOARD_DELETED", payload: { id: board.id } });

    res.json({ success: true, data: { id: board.id } });
  } catch (error) {
    console.error("Delete board error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/boards/:id/members - Add a member to the board
router.post("/:id/members", validate(addMemberSchema), async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.id as string;
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: req.user!.id },
          { members: { some: { userId: req.user!.id, role: { in: ["OWNER", "ADMIN"] } } } },
        ],
      },
    });

    if (!board) {
      res.status(404).json({ success: false, error: "Board not found or unauthorized" });
      return;
    }

    const userToAdd = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!userToAdd) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    // Check if already a member
    const existingMember = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: board.id, userId: userToAdd.id } },
    });

    if (existingMember) {
      res.status(409).json({ success: false, error: "User is already a member" });
      return;
    }

    const member = await prisma.boardMember.create({
      data: {
        boardId: board.id,
        userId: userToAdd.id,
        role: req.body.role || "MEMBER",
      },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    await prisma.activity.create({
      data: {
        type: "MEMBER_ADDED",
        message: `${req.user!.name} added ${userToAdd.name} to the board`,
        boardId: board.id,
        userId: req.user!.id,
      },
    });

    emitBoardEvent(board.id, "board:update", { type: "MEMBER_ADDED", payload: member });

    res.status(201).json({ success: true, data: member });
  } catch (error) {
    console.error("Add member error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// DELETE /api/boards/:id/members/:userId - Remove a member from the board
router.delete("/:id/members/:userId", async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.id as string;
    const userId = req.params.userId as string;
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: req.user!.id },
          { members: { some: { userId: req.user!.id, role: { in: ["OWNER", "ADMIN"] } } } },
        ],
      },
    });

    if (!board) {
      res.status(404).json({ success: false, error: "Board not found or unauthorized" });
      return;
    }

    // Prevent removing the owner
    if (userId === board.ownerId) {
      res.status(400).json({ success: false, error: "Cannot remove the board owner" });
      return;
    }

    await prisma.boardMember.delete({
      where: { boardId_userId: { boardId: board.id, userId: userId } },
    });

    const removedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    await prisma.activity.create({
      data: {
        type: "MEMBER_REMOVED",
        message: `${req.user!.name} removed ${removedUser?.name || "a user"} from the board`,
        boardId: board.id,
        userId: req.user!.id,
      },
    });

    emitBoardEvent(board.id, "board:update", { type: "MEMBER_REMOVED", payload: { userId: userId } });

    res.json({ success: true, data: { userId: userId } });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
