// Pipeline Service
// Pipeline calculations extracted from ExecutiveDashboard and PipelineVisualizer

export interface PipelineStageDefaults {
  avgDays: number;
  avgDaysInStage: number;
  conversion: number;
  conversionRate: number;
  /** Per-stage conversion placeholder when no real data (e.g. Pipeline flowData) */
  flowConversion: number;
}

/** Placeholder conversion for a stage: 20% if count > 0, else 0 */
export function getConversionRate(count: number): number {
  return count > 0 ? 20 : 0;
}

/** Actual conversion rate: (converted / total) * 100, rounded. Returns 0 if total is 0. */
export function calculateConversionRate(converted: number, total: number): number {
  return total > 0 ? Math.round((converted / total) * 100) : 0;
}

/** Default values for pipeline stage cards when real data is unavailable */
export function getPipelineStageDefaults(): PipelineStageDefaults {
  return {
    avgDays: 21,
    avgDaysInStage: 0,
    conversion: 20,
    conversionRate: 0,
    flowConversion: 0,
  };
}
