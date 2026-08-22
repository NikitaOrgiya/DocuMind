import { z } from "zod";

/**
 * Contract the model must follow. `citations` are the model's claimed S-ids —
 * they are untrusted until lib/rag/citations.ts intersects them with the
 * S-ids that were actually retrieved for this question.
 */
export const structuredAnswerSchema = z.object({
  status: z.enum(["answered", "insufficient_context"]),
  answer: z.string().min(1).max(4000),
  citations: z.array(z.string().regex(/^S\d+$/)).max(20),
});

export type StructuredAnswerParsed = z.infer<typeof structuredAnswerSchema>;
