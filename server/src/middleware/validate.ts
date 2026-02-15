import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

// Validates request body against a Zod schema, returns 400 with errors on failure
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
        res.status(400).json({ success: false, error: messages.join(", ") });
        return;
      }
      next(error);
    }
  };
}
