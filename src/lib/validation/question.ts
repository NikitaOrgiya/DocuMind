import { z } from "zod";

export const questionSchema = z
  .string()
  .trim()
  .min(3, "Вопрос должен содержать не менее 3 символов.")
  .max(2000, "Вопрос должен содержать не более 2000 символов.");

export const chatRequestSchema = z.object({
  question: questionSchema,
  sessionId: z.string().uuid().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
