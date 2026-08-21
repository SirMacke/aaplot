import { z } from "zod";

export const tierSchema = z.enum(["free", "pro", "commercial"]);
export type Tier = z.infer<typeof tierSchema>;

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total_pages: z.number().int().positive(),
  has_more: z.boolean(),
});
export type Pagination = z.infer<typeof paginationSchema>;

export const modelCreatorSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type ModelCreator = z.infer<typeof modelCreatorSchema>;

export const freeEvaluationsSchema = z.object({
  artificial_analysis_intelligence_index: z.number().nullable(),
  artificial_analysis_coding_index: z.number().nullable(),
  artificial_analysis_agentic_index: z.number().nullable(),
});
export type FreeEvaluations = z.infer<typeof freeEvaluationsSchema>;

export const indexCostSchema = z.object({
  total_cost: z.number().nullable(),
  cost_per_task: z
    .object({
      total_cost: z.number().nullable(),
    })
    .optional(),
});
export type IndexCost = z.infer<typeof indexCostSchema>;

export const freePricingSchema = z.object({
  price_1m_input_tokens: z.number().nullable(),
  price_1m_output_tokens: z.number().nullable(),
  price_1m_cache_hit_tokens: z.number().nullable().optional(),
  price_1m_cache_write_tokens: z.number().nullable().optional(),
});
export type FreePricing = z.infer<typeof freePricingSchema>;

export const freePerformanceSchema = z.object({
  median_output_tokens_per_second: z.number().nullable(),
  median_time_to_first_token_seconds: z.number().nullable(),
  median_time_to_first_answer_token_seconds: z.number().nullable(),
  median_end_to_end_response_time_seconds: z.number().nullable(),
});
export type FreePerformance = z.infer<typeof freePerformanceSchema>;

export const freeModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  release_date: z.string().nullable(),
  model_creator: modelCreatorSchema,
  evaluations: freeEvaluationsSchema,
  artificial_analysis_intelligence_index_cost: indexCostSchema,
  pricing: freePricingSchema,
  performance: freePerformanceSchema,
});
export type FreeModel = z.infer<typeof freeModelSchema>;

export const freeModelsResponseSchema = z.object({
  tier: tierSchema,
  intelligence_index_version: z.number(),
  pagination: paginationSchema,
  data: z.array(freeModelSchema),
});
export type FreeModelsResponse = z.infer<typeof freeModelsResponseSchema>;

export const listPageSchema = z.object({
  tier: tierSchema,
  intelligence_index_version: z.number().optional(),
  pagination: paginationSchema,
  data: z.array(z.unknown()),
});

export const arenaEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  model_creator: modelCreatorSchema,
  elo: z.number(),
  ci_95: z.number().nullable(),
});
export type ArenaEntry = z.infer<typeof arenaEntrySchema>;

export const arenaResponseSchema = z.object({
  tier: tierSchema,
  data: z.array(arenaEntrySchema),
});
export type ArenaResponse = z.infer<typeof arenaResponseSchema>;

export const apiErrorSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});

export const rateLimitSchema = z.object({
  limit: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  reset: z.number().int().nonnegative(),
});
export type RateLimit = z.infer<typeof rateLimitSchema>;

export const FREE_MODELS_PATH = "/language/models/free";

export type MediaArenaKind =
  | "tts"
  | "image"
  | "video"
  | "img2vid"
  | "music-instrumental"
  | "music-vocals";

export const mediaArenaPaths: Record<MediaArenaKind, string> = {
  tts: "/media/text-to-speech/models/free",
  image: "/media/text-to-image/models/free",
  video: "/media/text-to-video/models/free",
  img2vid: "/media/image-to-video/models/free",
  "music-instrumental": "/media/music/instrumental/models/free",
  "music-vocals": "/media/music/with-vocals/models/free",
};
