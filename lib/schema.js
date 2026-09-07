import { z } from 'zod';

export const StudyItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  options: z.array(z.string()).min(2),
  correctIndex: z.number(),
  explanation: z.string().optional()
});

export const StudyPayloadSchema = z.object({
  topic: z.string(),
  cards: z.array(StudyItemSchema).min(1)
});