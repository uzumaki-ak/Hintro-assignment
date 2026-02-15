import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db/client";
import { signToken } from "../utils/jwt";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { signupSchema, loginSchema } from "../schemas/auth.schema";
import { AuthRequest } from "../types";

const router: Router = Router();

// POST /api/auth/signup - Register a new user account
router.post("/signup", validate(signupSchema), async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: "Email already registered" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, name, password: hashedPassword },
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    });

    const token = signToken({ id: user.id, email: user.email, name: user.name });

    res.status(201).json({
      success: true,
      data: { user, token },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/auth/login - Authenticate user and return JWT
router.post("/login", validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const token = signToken({ id: user.id, email: user.email, name: user.name });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/auth/me - Get current authenticated user profile
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/auth/users/search?q=query - Search users by name or email for task assignment
router.get("/users/search", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const query = (req.query.q as string) || "";
    if (query.length < 2) {
      res.json({ success: true, data: [] });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
        NOT: { id: req.user!.id },
      },
      select: { id: true, email: true, name: true, avatarUrl: true },
      take: 10,
    });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error("User search error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
