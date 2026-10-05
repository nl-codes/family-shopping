import { z } from "zod";
export const itemInput = z.object({
  name: z.string().trim().min(1).max(160),
  quantity: z.string().trim().min(1).max(60),
  category: z.string().trim().min(1).max(60),
  estimatedPrice: z.number().nonnegative().nullable().optional(),
  isRecurring: z.boolean().default(false),
});
