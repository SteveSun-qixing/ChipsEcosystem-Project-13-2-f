import { z } from 'zod';

export const CreateRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required').max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(['public', 'private']).default('public'),
});

export const UpdateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const UploadCardSchema = z.object({
  roomId: z.string().uuid().optional(),
  visibility: z.enum(['public', 'private']).default('public'),
});

export const UploadBoxSchema = z.object({
  roomId: z.string().uuid().optional(),
  visibility: z.enum(['public', 'private']).default('public'),
});

export const UpdateCardSchema = z.object({
  roomId: z.string().uuid().nullable().optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

export const UpdateBoxSchema = z.object({
  roomId: z.string().uuid().nullable().optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

export const SearchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200),
  type: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter((t) => ['card', 'box', 'user'].includes(t)) : ['card', 'box', 'user'])),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export type UpdateRoomInput = z.infer<typeof UpdateRoomSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type UploadCardInput = z.infer<typeof UploadCardSchema>;
export type UploadBoxInput = z.infer<typeof UploadBoxSchema>;
export type UpdateCardInput = z.infer<typeof UpdateCardSchema>;
export type UpdateBoxInput = z.infer<typeof UpdateBoxSchema>;
export type SearchInput = z.infer<typeof SearchSchema>;
