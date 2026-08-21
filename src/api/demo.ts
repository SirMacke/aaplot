import type { FreeModel, FreeModelsResponse } from "./schemas.js";

interface DemoSeed {
  slug: string;
  name: string;
  creator: string;
  release: string;
  outputPrice: number;
  inputPrice: number;
  intelligence: number;
  coding: number;
  agentic: number;
  speed: number;
  totalCost: number;
}

const SEEDS: DemoSeed[] = [
  { slug: "kestrel-1", name: "Kestrel 1", creator: "Kestrel Labs", release: "2026-03-02", outputPrice: 0.6, inputPrice: 0.3, intelligence: 61.2, coding: 52.4, agentic: 48.1, speed: 240, totalCost: 3.1 },
  { slug: "nimbus-mini-3", name: "Nimbus Mini 3", creator: "Nimbus AI", release: "2026-02-14", outputPrice: 0.9, inputPrice: 0.2, intelligence: 63.8, coding: 50.2, agentic: 51.6, speed: 310, totalCost: 4.6 },
  { slug: "quarry-8b", name: "Quarry 8B", creator: "Quarry Systems", release: "2025-11-20", outputPrice: 0.35, inputPrice: 0.18, intelligence: 57.4, coding: 47.0, agentic: 42.3, speed: 285, totalCost: 2.2 },
  { slug: "halcyon-t", name: "Halcyon Turbo", creator: "Halcyon", release: "2026-04-01", outputPrice: 1.2, inputPrice: 0.6, intelligence: 65.1, coding: 58.9, agentic: 55.4, speed: 260, totalCost: 6.9 },
  { slug: "bramble-3b", name: "Bramble 3B", creator: "Bramble", release: "2025-09-12", outputPrice: 0.15, inputPrice: 0.1, intelligence: 52.6, coding: 40.1, agentic: 38.0, speed: 350, totalCost: 1.1 },
  { slug: "lumen-lite", name: "Lumen Lite", creator: "Lumen Forge", release: "2026-01-27", outputPrice: 0.5, inputPrice: 0.25, intelligence: 60.0, coding: 49.5, agentic: 45.2, speed: 205, totalCost: 3.4 },
  { slug: "kestrel-1-max", name: "Kestrel 1 Max", creator: "Kestrel Labs", release: "2026-05-19", outputPrice: 15.0, inputPrice: 5.0, intelligence: 71.8, coding: 66.3, agentic: 62.7, speed: 180, totalCost: 95 },
  { slug: "nimbus-omni", name: "Nimbus Omni", creator: "Nimbus AI", release: "2026-03-30", outputPrice: 25.0, inputPrice: 8.0, intelligence: 74.2, coding: 69.0, agentic: 68.1, speed: 150, totalCost: 130 },
  { slug: "quarry-frontier", name: "Quarry Frontier", creator: "Quarry Systems", release: "2025-12-08", outputPrice: 40.0, inputPrice: 15.0, intelligence: 76.5, coding: 72.4, agentic: 71.0, speed: 120, totalCost: 210 },
  { slug: "halcyon-pro", name: "Halcyon Pro", creator: "Halcyon", release: "2026-02-02", outputPrice: 12.5, inputPrice: 4.0, intelligence: 70.6, coding: 68.8, agentic: 64.3, speed: 165, totalCost: 88 },
  { slug: "lumen-forge-x2", name: "Lumen Forge X2", creator: "Lumen Forge", release: "2026-06-11", outputPrice: 60.0, inputPrice: 20.0, intelligence: 77.9, coding: 74.1, agentic: 72.8, speed: 95, totalCost: 260 },
  { slug: "bramble-72b", name: "Bramble 72B", creator: "Bramble", release: "2025-10-05", outputPrice: 8.5, inputPrice: 3.0, intelligence: 69.4, coding: 64.9, agentic: 60.2, speed: 190, totalCost: 72 },
  { slug: "kestrel-flash", name: "Kestrel Flash", creator: "Kestrel Labs", release: "2025-08-30", outputPrice: 0.08, inputPrice: 0.05, intelligence: 31.4, coding: 24.0, agentic: 21.5, speed: 420, totalCost: 0.6 },
  { slug: "nimbus-nano", name: "Nimbus Nano", creator: "Nimbus AI", release: "2025-07-22", outputPrice: 0.12, inputPrice: 0.06, intelligence: 34.9, coding: 26.8, agentic: 24.0, speed: 380, totalCost: 0.8 },
  { slug: "quarry-mini", name: "Quarry Mini", creator: "Quarry Systems", release: "2025-12-01", outputPrice: 0.2, inputPrice: 0.1, intelligence: 40.2, coding: 33.5, agentic: 30.8, speed: 300, totalCost: 1.2 },
  { slug: "halcyon-s", name: "Halcyon S", creator: "Halcyon", release: "2025-05-14", outputPrice: 0.07, inputPrice: 0.04, intelligence: 27.6, coding: 19.4, agentic: 18.2, speed: 460, totalCost: 0.5 },
  { slug: "bramble-basic", name: "Bramble Basic", creator: "Bramble", release: "2026-01-05", outputPrice: 0.25, inputPrice: 0.12, intelligence: 44.0, coding: 38.2, agentic: 34.6, speed: 275, totalCost: 1.6 },
  { slug: "lumen-sprint", name: "Lumen Sprint", creator: "Lumen Forge", release: "2025-10-19", outputPrice: 0.18, inputPrice: 0.09, intelligence: 38.5, coding: 30.1, agentic: 28.3, speed: 330, totalCost: 1.0 },
  { slug: "kestrel-legacy-xl", name: "Kestrel Legacy XL", creator: "Kestrel Labs", release: "2024-11-11", outputPrice: 22.0, inputPrice: 9.0, intelligence: 48.3, coding: 40.5, agentic: 37.9, speed: 110, totalCost: 140 },
  { slug: "nimbus-echo", name: "Nimbus Echo", creator: "Nimbus AI", release: "2025-03-08", outputPrice: 18.0, inputPrice: 7.0, intelligence: 51.2, coding: 44.6, agentic: 41.0, speed: 125, totalCost: 120 },
  { slug: "quarry-titan", name: "Quarry Titan", creator: "Quarry Systems", release: "2025-06-25", outputPrice: 35.0, inputPrice: 14.0, intelligence: 55.0, coding: 47.8, agentic: 44.2, speed: 105, totalCost: 190 },
  { slug: "halcyon-max", name: "Halcyon Max", creator: "Halcyon", release: "2025-09-30", outputPrice: 28.0, inputPrice: 11.0, intelligence: 58.6, coding: 52.0, agentic: 49.5, speed: 130, totalCost: 165 },
  { slug: "bramble-xl", name: "Bramble XL", creator: "Bramble", release: "2024-12-17", outputPrice: 9.5, inputPrice: 3.5, intelligence: 46.7, coding: 39.9, agentic: 36.0, speed: 160, totalCost: 80 },
  { slug: "lumen-titan-2", name: "Lumen Titan 2", creator: "Lumen Forge", release: "2026-04-28", outputPrice: 50.0, inputPrice: 18.0, intelligence: 60.4, coding: 55.3, agentic: 52.1, speed: 90, totalCost: 230 },
  { slug: "kestrel-1-mid", name: "Kestrel 1 Mid", creator: "Kestrel Labs", release: "2026-05-02", outputPrice: 2.4, inputPrice: 1.0, intelligence: 62.9, coding: 56.0, agentic: 53.3, speed: 230, totalCost: 14 },
  { slug: "nimbus-flow", name: "Nimbus Flow", creator: "Nimbus AI", release: "2026-02-25", outputPrice: 3.8, inputPrice: 1.4, intelligence: 64.7, coding: 60.1, agentic: 57.0, speed: 210, totalCost: 20 },
  { slug: "quarry-blend", name: "Quarry Blend", creator: "Quarry Systems", release: "2026-01-15", outputPrice: 6.0, inputPrice: 2.2, intelligence: 67.3, coding: 63.5, agentic: 59.8, speed: 175, totalCost: 34 },
  { slug: "halcyon-studio", name: "Halcyon Studio", creator: "Halcyon", release: "2025-12-20", outputPrice: 4.5, inputPrice: 1.8, intelligence: 66.0, coding: 62.2, agentic: 58.6, speed: 195, totalCost: 26 },
  { slug: "bramble-path", name: "Bramble Path", creator: "Bramble", release: "2026-03-18", outputPrice: 2.9, inputPrice: 1.2, intelligence: 63.5, coding: 57.8, agentic: 54.9, speed: 220, totalCost: 16 },
  { slug: "lumen-axis", name: "Lumen Axis", creator: "Lumen Forge", release: "2026-04-09", outputPrice: 5.5, inputPrice: 2.0, intelligence: 66.8, coding: 61.4, agentic: 60.0, speed: 185, totalCost: 30 },
  { slug: "kestrel-orbit", name: "Kestrel Orbit", creator: "Kestrel Labs", release: "2026-02-11", outputPrice: 7.5, inputPrice: 2.8, intelligence: 68.1, coding: 64.0, agentic: 61.5, speed: 170, totalCost: 42 },
  { slug: "nimbus-quant", name: "Nimbus Quant", creator: "Nimbus AI", release: "2026-05-27", outputPrice: 11.0, inputPrice: 4.2, intelligence: 70.0, coding: 65.8, agentic: 63.0, speed: 155, totalCost: 58 },
  { slug: "quarry-pulse", name: "Quarry Pulse", creator: "Quarry Systems", release: "2026-03-07", outputPrice: 1.6, inputPrice: 0.7, intelligence: 59.8, coding: 51.7, agentic: 47.8, speed: 250, totalCost: 9 },
  { slug: "halcyon-drift", name: "Halcyon Drift", creator: "Halcyon", release: "2025-11-02", outputPrice: 0.95, inputPrice: 0.45, intelligence: 56.3, coding: 45.9, agentic: 43.0, speed: 295, totalCost: 5.2 },
];

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function demoModels(): FreeModel[] {
  return SEEDS.map((seed, index) => ({
    id: `demo-model-${index + 1}`,
    name: seed.name,
    slug: seed.slug,
    release_date: seed.release,
    model_creator: { id: `demo-creator-${seed.creator}`, name: seed.creator },
    evaluations: {
      artificial_analysis_intelligence_index: seed.intelligence,
      artificial_analysis_coding_index: seed.coding,
      artificial_analysis_agentic_index: seed.agentic,
    },
    artificial_analysis_intelligence_index_cost: {
      total_cost: seed.totalCost,
      cost_per_task: { total_cost: round(seed.totalCost / 120) },
    },
    pricing: {
      price_1m_input_tokens: seed.inputPrice,
      price_1m_output_tokens: seed.outputPrice,
      price_1m_cache_hit_tokens: round(seed.inputPrice * 0.25),
      price_1m_cache_write_tokens: round(seed.inputPrice * 1.25),
    },
    performance: {
      median_output_tokens_per_second: seed.speed,
      median_time_to_first_token_seconds: 0.5,
      median_time_to_first_answer_token_seconds: 2.4,
      median_end_to_end_response_time_seconds: 4.2,
    },
  }));
}

export function demoModelsResponse(): FreeModelsResponse {
  return {
    tier: "free",
    intelligence_index_version: 4.1,
    pagination: { page: 1, page_size: 200, total_pages: 1, has_more: false },
    data: demoModels(),
  };
}
