import { getSupabaseAdmin } from './supabase'

export interface CreditCost {
  scriptGeneration: number
  imageGeneration: number
  videoGeneration: number // per second
  voiceGeneration: number // per second
  totalEstimate: number
}

/**
 * Ensure user record exists in the database (creates if missing)
 */
export async function ensureUserExists(
  userId: string,
  email?: string
): Promise<void> {
  try {
    const { data: user } = await getSupabaseAdmin()
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    // If user doesn't exist, create them
    if (!user) {
      await (getSupabaseAdmin() as any).from('users').insert({
        id: userId,
        email: email || '',
        credits: 100, // Default credits
      })
    }
  } catch (error) {
    console.error('Error ensuring user exists:', error)
    // Don't throw - this is non-critical
  }
}

/**
 * Credit costs for different operations
 */
export const CREDIT_COSTS = {
  SCRIPT_GENERATION: 5,
  IMAGE_GENERATION: 3,
  VIDEO_GENERATION_PER_SECOND: 2,
  VOICE_GENERATION_PER_SECOND: 0.5,
  CAPTIONS: 1,
}

/**
 * Calculate estimated credits for a video project
 */
export function calculateProjectCredits(
  numberOfScenes: number,
  totalDuration: number
): CreditCost {
  const scriptGeneration = CREDIT_COSTS.SCRIPT_GENERATION
  const imageGeneration = numberOfScenes * CREDIT_COSTS.IMAGE_GENERATION
  const videoGeneration = totalDuration * CREDIT_COSTS.VIDEO_GENERATION_PER_SECOND
  const voiceGeneration = totalDuration * CREDIT_COSTS.VOICE_GENERATION_PER_SECOND

  return {
    scriptGeneration,
    imageGeneration,
    videoGeneration,
    voiceGeneration,
    totalEstimate: Math.ceil(
      scriptGeneration + imageGeneration + videoGeneration + voiceGeneration
    ),
  }
}

/**
 * Check if user has enough credits
 */
export async function checkUserCredits(
  userId: string,
  requiredCredits: number
): Promise<{ hasEnough: boolean; currentCredits: number }> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('users')
      .select('credits')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw error

    const credits = (data as any)?.credits || 0

    return {
      hasEnough: credits >= requiredCredits,
      currentCredits: credits,
    }
  } catch (error) {
    console.error('Error checking credits:', error)
    // Return false if user doesn't exist or error occurs
    return {
      hasEnough: false,
      currentCredits: 0,
    }
  }
}

/**
 * Deduct credits from user account
 */
export async function deductCredits(
  userId: string,
  projectId: string,
  amount: number,
  description: string
): Promise<{ success: boolean; remainingCredits: number }> {
  try {
    // Use the database function for atomic credit deduction
    const { data, error } = await (getSupabaseAdmin() as any).rpc('deduct_credits', {
      p_user_id: userId,
      p_project_id: projectId,
      p_amount: amount,
      p_description: description,
    })

    if (error) throw error

    if (!data) {
      throw new Error('Insufficient credits')
    }

    // Get updated credit balance
    const { data: userData } = await getSupabaseAdmin()
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single()

    return {
      success: true,
      remainingCredits: (userData as any)?.credits || 0,
    }
  } catch (error) {
    console.error('Error deducting credits:', error)
    throw new Error('Failed to deduct credits')
  }
}

/**
 * Deduct credits exactly once per (jobId, chargeKey).
 */
export async function deductCreditsIdempotent(
  userId: string,
  projectId: string,
  jobId: string,
  amount: number,
  description: string,
  chargeKey: string
): Promise<{ success: boolean; remainingCredits: number }> {
  try {
    const { data, error } = await (getSupabaseAdmin() as any).rpc('deduct_credits_idempotent', {
      p_user_id: userId,
      p_project_id: projectId,
      p_job_id: jobId,
      p_amount: amount,
      p_description: description,
      p_charge_key: chargeKey,
    })

    if (error) throw error

    if (!data) {
      throw new Error('Insufficient credits')
    }

    const { data: userData } = await getSupabaseAdmin()
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single()

    return {
      success: true,
      remainingCredits: (userData as any)?.credits || 0,
    }
  } catch (error) {
    console.error('Error deducting idempotent credits:', error)
    throw new Error('Failed to deduct idempotent credits')
  }
}

/**
 * Add credits to user account
 */
export async function addCredits(
  userId: string,
  amount: number,
  transactionType: 'purchase' | 'bonus' | 'refund' = 'purchase',
  description?: string
): Promise<number> {
  try {
    // First get current credits
    const { data: userData, error: getUserError } = await getSupabaseAdmin()
      .from('users')
      .select('credits')
      .eq('id', userId)
      .maybeSingle()

    if (getUserError) throw getUserError

    const currentCredits = (userData as any)?.credits || 0
    const newCredits = currentCredits + amount

    // Update credits
    const { data: updatedUser, error: userError } = await (getSupabaseAdmin() as any)
      .from('users')
      .update({ credits: newCredits })
      .eq('id', userId)
      .select('credits')
      .maybeSingle()

    if (userError) throw userError

    // Record transaction
    await (getSupabaseAdmin() as any).from('credit_transactions').insert({
      user_id: userId,
      amount: amount,
      transaction_type: transactionType,
      description: description || `${transactionType} of ${amount} credits`,
    })

    return (updatedUser as any)?.credits || newCredits
  } catch (error) {
    console.error('Error adding credits:', error)
    return 0
  }
}

/**
 * Get user's credit transaction history
 */
export async function getCreditHistory(
  userId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error getting credit history:', error)
    throw new Error('Failed to get credit history')
  }
}

/**
 * Get credit usage summary for a user
 */
export async function getCreditUsageSummary(userId: string): Promise<{
  totalSpent: number
  totalAdded: number
  currentBalance: number
  videoCount: number
}> {
  try {
    const { data: transactions, error: txError } = await getSupabaseAdmin()
      .from('credit_transactions')
      .select('amount, transaction_type')
      .eq('user_id', userId)

    // If table doesn't exist, return default values
    if (txError && txError.code === 'PGRST205') {
      console.warn('credit_transactions table not found, returning default values')
      
      const { data: user } = await getSupabaseAdmin()
        .from('users')
        .select('credits, total_videos_created')
        .eq('id', userId)
        .maybeSingle()
      
      const userData = user as any
      return {
        totalSpent: 0,
        totalAdded: 0,
        currentBalance: userData?.credits || 0,
        videoCount: userData?.total_videos_created || 0,
      }
    }

    if (txError) throw txError

    const { data: user, error: userError } = await getSupabaseAdmin()
      .from('users')
      .select('credits, total_videos_created')
      .eq('id', userId)
      .maybeSingle()

    if (userError) throw userError

    const totalSpent = transactions
      ?.filter((tx: any) => tx.amount < 0)
      .reduce((sum, tx: any) => sum + Math.abs(tx.amount), 0) || 0

    const totalAdded = transactions
      ?.filter((tx: any) => tx.amount > 0)
      .reduce((sum, tx: any) => sum + tx.amount, 0) || 0

    const userData = user as any
    return {
      totalSpent,
      totalAdded,
      currentBalance: userData?.credits || 0,
      videoCount: userData?.total_videos_created || 0,
    }
  } catch (error) {
    console.error('Error getting credit usage summary:', error)
    // Return default values instead of throwing to allow app to work without full migration
    return {
      totalSpent: 0,
      totalAdded: 0,
      currentBalance: 0,
      videoCount: 0,
    }
  }
}

/**
 * Update project credits used
 */
export async function updateProjectCredits(
  projectId: string,
  creditsUsed: number
): Promise<void> {
  try {
    await (getSupabaseAdmin() as any)
      .from('projects')
      .update({ credits_used: creditsUsed })
      .eq('id', projectId)
  } catch (error) {
    console.error('Error updating project credits:', error)
    throw new Error('Failed to update project credits')
  }
}
