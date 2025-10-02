import { z } from 'zod';
import { ARTIST_TYPE_VALUES } from '@types';

export const createCollectiveSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters")
    .refine(val => val.trim().length > 0, "Title cannot be empty"),
  description: z.string()
    .min(1, "Description is required")
    .max(4096, "Description must be less than 4096 characters")
    .refine(val => val.trim().length > 0, "Description cannot be empty"),
  rules: z.array(z.string().max(100, "Rule must be less than 100 characters")).nullable(),
  artist_types: z.array(z.enum(ARTIST_TYPE_VALUES)).min(1, "Select at least one artist type"),
  picture: z.instanceof(File).optional().nullable(),
});

export type CreateCollectiveFormData = z.infer<typeof createCollectiveSchema>;