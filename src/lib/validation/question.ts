import { z } from "zod";

export const questionSchema = z
  .string()
  .trim()
  .min(3, "Question must be at least 3 characters.")
  .max(2000, "Question must be at most 2000 characters.");

export const chatRequestSchema = z.object({
  question: questionSchema,
  sessionId: z.string().uuid().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
