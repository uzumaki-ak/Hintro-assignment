import { z } from "zod";

export const createBoardSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
});

export const updateBoardSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
});

export const addMemberSchema = z.object({
  email: z.string().email("Invalid email format"),
  role: z.enum(["ADMIN", "MEMBER"]).optional().default("MEMBER"),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
