import { getSupabaseAdmin } from './supabase'

type CostStage =
  | 'script_generation'
  | 'image_generation'
  | 'video_generation'
  | 'voice_generation'
  | 'post_processing'
  | 'storage_upload'
  | 'worker_failure'

export interface GenerationCostEventInput {
  jobId?: string
  projectId: string
  userId: string
  stage: CostStage
  provider: string
  operation: string
  usageUnit: string
  usageQuantity: number
  unitCostUsd?: number
  estimatedCostUsd?: number
  metadata?: Record<string, any>
}

const UNIT_COST_DEFAULTS = {
  scriptPerRequestUsd: getEnvNumber('COST_SCRIPT_PER_REQUEST_USD', 0.01),
  imagePerSceneUsd: getEnvNumber('COST_IMAGE_PER_SCENE_USD', 0.015),
  videoPerSecondUsd: getEnvNumber('COST_VIDEO_PER_SECOND_USD', 0.02),
  voicePerCharacterUsd: getEnvNumber('COST_VOICE_PER_CHARACTER_USD', 0.00002),
  processingPerSecondUsd: getEnvNumber('COST_PROCESSING_PER_SECOND_USD', 0.0001),
  storagePerMbUsd: getEnvNumber('COST_STORAGE_PER_MB_USD', 0.0002),
}

function getEnvNumber(name: string, fallback: number): number {
  const value = process.env[name]
  if (!value) {
    return fallback
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback
  }

  return parsed
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}

export async function recordGenerationCostEvent(
  input: GenerationCostEventInput
): Promise<void> {
  try {
    const quantity = Number.isFinite(input.usageQuantity) ? input.usageQuantity : 0
    const unitCost = roundUsd(input.unitCostUsd ?? 0)
    const estimatedCost = roundUsd(
      input.estimatedCostUsd ?? Math.max(0, quantity) * unitCost
    )

    await (getSupabaseAdmin() as any).from('generation_cost_events').insert({
      job_id: input.jobId || null,
      project_id: input.projectId,
      user_id: input.userId,
      stage: input.stage,
      provider: input.provider,
      operation: input.operation,
      usage_unit: input.usageUnit,
      usage_quantity: quantity,
      unit_cost_usd: unitCost,
      estimated_cost_usd: estimatedCost,
      currency: 'USD',
      metadata: input.metadata || null,
    })
  } catch (error) {
    // Cost telemetry should never block generation flow.
    console.error('Failed to record generation cost event:', error)
  }
}

export function getEstimatedUnitCostUsd(kind: keyof typeof UNIT_COST_DEFAULTS): number {
  return UNIT_COST_DEFAULTS[kind]
}