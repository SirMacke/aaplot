import { z } from "zod";

export const tierSchema = z.enum(["free", "pro", "commercial"]);
export type Tier = z.infer<typeof tierSchema>;

const nullishNumber = z.number().nullish().transform((value) => value ?? null);

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total_pages: z.number().int().nonnegative(),
  has_more: z.boolean(),
});
export type Pagination = z.infer<typeof paginationSchema>;

export const modelCreatorSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string().optional(),
  })
  .passthrough();
export type ModelCreator = z.infer<typeof modelCreatorSchema>;

export const freeEvaluationsSchema = z
  .object({
    artificial_analysis_intelligence_index: nullishNumber.optional(),
    artificial_analysis_coding_index: nullishNumber.optional(),
    artificial_analysis_agentic_index: nullishNumber.optional(),
  })
  .passthrough()
  .transform((evaluations) => ({
    ...evaluations,
    artificial_analysis_intelligence_index:
      evaluations.artificial_analysis_intelligence_index ?? null,
    artificial_analysis_coding_index: evaluations.artificial_analysis_coding_index ?? null,
    artificial_analysis_agentic_index: evaluations.artificial_analysis_agentic_index ?? null,
  }));
export type FreeEvaluations = {
  artificial_analysis_intelligence_index: number | null;
  artificial_analysis_coding_index: number | null;
  artificial_analysis_agentic_index: number | null;
};

export const indexCostSchema = z
  .object({
    total_cost: nullishNumber.optional(),
    cost_per_task: z
      .object({
        total_cost: nullishNumber.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .transform((cost) => ({
    ...cost,
    total_cost: cost.total_cost ?? null,
    cost_per_task: cost.cost_per_task
      ? {
          ...cost.cost_per_task,
          total_cost: cost.cost_per_task.total_cost ?? null,
        }
      : undefined,
  }));
export type IndexCost = z.infer<typeof indexCostSchema>;

export const freePricingSchema = z
  .object({
    price_1m_input_tokens: nullishNumber.optional(),
    price_1m_output_tokens: nullishNumber.optional(),
    price_1m_cache_hit_tokens: nullishNumber.optional(),
    price_1m_cache_write_tokens: nullishNumber.optional(),
  })
  .passthrough()
  .transform((pricing) => ({
    ...pricing,
    price_1m_input_tokens: pricing.price_1m_input_tokens ?? null,
    price_1m_output_tokens: pricing.price_1m_output_tokens ?? null,
    price_1m_cache_hit_tokens: pricing.price_1m_cache_hit_tokens ?? null,
    price_1m_cache_write_tokens: pricing.price_1m_cache_write_tokens ?? null,
  }));
export type FreePricing = z.infer<typeof freePricingSchema>;

export const freePerformanceSchema = z
  .object({
    median_output_tokens_per_second: nullishNumber.optional(),
    median_time_to_first_token_seconds: nullishNumber.optional(),
    median_time_to_first_answer_token_seconds: nullishNumber.optional(),
    median_end_to_end_response_time_seconds: nullishNumber.optional(),
  })
  .passthrough()
  .transform((performance) => ({
    ...performance,
    median_output_tokens_per_second: performance.median_output_tokens_per_second ?? null,
    median_time_to_first_token_seconds: performance.median_time_to_first_token_seconds ?? null,
    median_time_to_first_answer_token_seconds:
      performance.median_time_to_first_answer_token_seconds ?? null,
    median_end_to_end_response_time_seconds:
      performance.median_end_to_end_response_time_seconds ?? null,
  }));
export type FreePerformance = z.infer<typeof freePerformanceSchema>;

const emptyIndexCost = (): IndexCost => ({ total_cost: null, cost_per_task: undefined });

const emptyEvaluations = (): FreeEvaluations => ({
  artificial_analysis_intelligence_index: null,
  artificial_analysis_coding_index: null,
  artificial_analysis_agentic_index: null,
});

const emptyPricing = (): z.infer<typeof freePricingSchema> => ({
  price_1m_input_tokens: null,
  price_1m_output_tokens: null,
  price_1m_cache_hit_tokens: null,
  price_1m_cache_write_tokens: null,
});

const emptyPerformance = (): z.infer<typeof freePerformanceSchema> => ({
  median_output_tokens_per_second: null,
  median_time_to_first_token_seconds: null,
  median_time_to_first_answer_token_seconds: null,
  median_end_to_end_response_time_seconds: null,
});

export const freeModelSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    release_date: z.string().nullish().transform((value) => value ?? null),
    model_creator: modelCreatorSchema,
    evaluations: freeEvaluationsSchema.nullish().transform((value) => value ?? emptyEvaluations()),
    artificial_analysis_intelligence_index_cost: indexCostSchema
      .nullish()
      .transform((value) => value ?? emptyIndexCost()),
    pricing: freePricingSchema.nullish().transform((value) => value ?? emptyPricing()),
    performance: freePerformanceSchema.nullish().transform((value) => value ?? emptyPerformance()),
  })
  .passthrough();
export type FreeModel = z.infer<typeof freeModelSchema>;

export const intelligenceIndexVersionSchema = z.coerce.number();

export const freeModelsResponseSchema = z.object({
  tier: tierSchema,
  intelligence_index_version: intelligenceIndexVersionSchema,
  pagination: paginationSchema,
  data: z.array(freeModelSchema),
});
export type FreeModelsResponse = z.infer<typeof freeModelsResponseSchema>;

export const listPageSchema = z.object({
  tier: tierSchema,
  intelligence_index_version: intelligenceIndexVersionSchema.optional(),
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

export function formatSchemaIssues(error: z.ZodError): string {
  const issue = error.issues[0];
  if (issue === undefined) return "invalid payload";
  const path = issue.path.length > 0 ? issue.path.join(".") : "response";
  return `${path}: ${issue.message}`;
}
