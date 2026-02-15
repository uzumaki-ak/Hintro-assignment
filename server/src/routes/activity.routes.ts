import { Router, Response } from "express";
import { prisma } from "../db/client";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";
import { parsePagination, buildPaginationMeta } from "../utils/pagination";

const router: Router = Router({ mergeParams: true });

// All activity routes require authentication
router.use(authenticate);

// GET /api/boards/:boardId/activities - Get activity history for a board with pagination
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const boardId = req.params.boardId as string;
    const { page, limit, skip } = parsePagination(req);

    // Verify board access
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: req.user!.id },
          { members: { some: { userId: req.user!.id } } },
        ],
      },
    });

    if (!board) {
      res.status(404).json({ success: false, error: "Board not found" });
      return;
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where: { boardId: boardId },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          task: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.activity.count({ where: { boardId: boardId } }),
    ]);

    res.json({
      success: true,
      data: activities,
      meta: buildPaginationMeta(total, { page, limit, skip }),
    });
  } catch (error) {
    console.error("Get activities error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
