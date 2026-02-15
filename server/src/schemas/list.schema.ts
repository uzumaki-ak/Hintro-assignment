import { z } from "zod";

export const createListSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  position: z.number().int().min(0).optional(),
});

export const updateListSchema = z.object({
  title: z.string().min(1, "Title is required").max(100).optional(),
  position: z.number().int().min(0).optional(),
});

export const reorderListsSchema = z.object({
  listIds: z.array(z.string()).min(1, "At least one list ID required"),
});

export type CreateListInput = z.infer<typeof createListSchema>;
export type UpdateListInput = z.infer<typeof updateListSchema>;
export type ReorderListsInput = z.infer<typeof reorderListsSchema>;
