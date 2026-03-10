import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabaseAdmin: SupabaseClient<Database> | null = null

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!url || !key) {
      throw new Error('Missing Supabase environment variables')
    }
    
    _supabaseAdmin = createClient<Database>(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  
  return _supabaseAdmin
}

// Deprecated: Use getSupabaseAdmin() instead
// Export for backward compatibility
export const supabaseAdmin = {
  get auth() {
    return getSupabaseAdmin().auth
  },
  from(table: string) {
    return getSupabaseAdmin().from(table)
  },
  rpc(...args: any[]) {
    return (getSupabaseAdmin() as any).rpc(...args)
  }
}

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          credits: number
          total_videos_created: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          credits?: number
          total_videos_created?: number
        }
        Update: {
          email?: string
          full_name?: string | null
          credits?: number
          total_videos_created?: number
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          title: string
          topic: string
          status: 'draft' | 'generating' | 'completed' | 'failed'
          script: string | null
          video_url: string | null
          thumbnail_url: string | null
          duration: number | null
          language: string
          credits_used: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          title: string
          topic: string
          status?: 'draft' | 'generating' | 'completed' | 'failed'
          script?: string | null
          video_url?: string | null
          thumbnail_url?: string | null
          duration?: number | null
          language?: string
          credits_used?: number
        }
        Update: {
          title?: string
          topic?: string
          status?: 'draft' | 'generating' | 'completed' | 'failed'
          script?: string | null
          video_url?: string | null
          thumbnail_url?: string | null
          duration?: number | null
          language?: string
          credits_used?: number
        }
      }
      scenes: {
        Row: {
          id: string
          project_id: string
          sequence_order: number
          text_content: string
          image_prompt: string | null
          image_url: string | null
          video_url: string | null
          duration: number | null
          created_at: string
        }
        Insert: {
          project_id: string
          sequence_order: number
          text_content: string
          image_prompt?: string | null
          image_url?: string | null
          video_url?: string | null
          duration?: number | null
        }
        Update: {
          sequence_order?: number
          text_content?: string
          image_prompt?: string | null
          image_url?: string | null
          video_url?: string | null
          duration?: number | null
        }
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          payment_order_id: string | null
          amount: number
          transaction_type: 'usage' | 'purchase' | 'bonus' | 'refund'
          description: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          project_id?: string | null
          payment_order_id?: string | null
          amount: number
          transaction_type: 'usage' | 'purchase' | 'bonus' | 'refund'
          description?: string | null
        }
      }
      payment_order_reconciliation_runs: {
        Row: {
          id: string
          actor: string
          repair_mode: boolean
          scanned_count: number
          repaired_count: number
          created_at: string
        }
        Insert: {
          actor?: string
          repair_mode?: boolean
          scanned_count?: number
          repaired_count?: number
        }
      }
      payment_orders: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          credits: number
          currency: string
          amount_subunits: number
          status: 'created' | 'paid' | 'failed' | 'refunded'
          razorpay_order_id: string
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          geo_country_code: string | null
          metadata: Record<string, any> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          plan_id: string
          credits: number
          currency: string
          amount_subunits: number
          status?: 'created' | 'paid' | 'failed' | 'refunded'
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          geo_country_code?: string | null
          metadata?: Record<string, any> | null
        }
        Update: {
          plan_id?: string
          credits?: number
          currency?: string
          amount_subunits?: number
          status?: 'created' | 'paid' | 'failed' | 'refunded'
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          geo_country_code?: string | null
          metadata?: Record<string, any> | null
        }
      }
      admin_users: {
        Row: {
          user_id: string
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          is_active?: boolean
          notes?: string | null
        }
        Update: {
          is_active?: boolean
          notes?: string | null
        }
      }
      admin_audit_logs: {
        Row: {
          id: string
          action: string
          actor_type: string
          actor_user_id: string | null
          actor_email: string | null
          target_user_id: string
          target_email: string | null
          notes: string | null
          source: string
          metadata: Record<string, any> | null
          created_at: string
        }
        Insert: {
          action: string
          actor_type: string
          actor_user_id?: string | null
          actor_email?: string | null
          target_user_id: string
          target_email?: string | null
          notes?: string | null
          source: string
          metadata?: Record<string, any> | null
        }
        Update: {
          action?: string
          actor_type?: string
          actor_user_id?: string | null
          actor_email?: string | null
          target_user_id?: string
          target_email?: string | null
          notes?: string | null
          source?: string
          metadata?: Record<string, any> | null
        }
      }
      generation_jobs: {
        Row: {
          id: string
          project_id: string
          user_id: string
          status: 'queued' | 'processing' | 'completed' | 'failed'
          idempotency_key: string | null
          attempt_count: number
          retry_at: string | null
          max_attempts: number
          lease_expires_at: string | null
          last_heartbeat_at: string | null
          current_step: string | null
          progress: number
          error_message: string | null
          error_code: string | null
          error_stage: string | null
          error_context: Record<string, any> | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          project_id: string
          user_id: string
          status?: 'queued' | 'processing' | 'completed' | 'failed'
          idempotency_key?: string | null
          attempt_count?: number
          retry_at?: string | null
          max_attempts?: number
          lease_expires_at?: string | null
          last_heartbeat_at?: string | null
          current_step?: string | null
          progress?: number
          error_message?: string | null
          error_code?: string | null
          error_stage?: string | null
          error_context?: Record<string, any> | null
        }
        Update: {
          status?: 'queued' | 'processing' | 'completed' | 'failed'
          idempotency_key?: string | null
          attempt_count?: number
          retry_at?: string | null
          max_attempts?: number
          lease_expires_at?: string | null
          last_heartbeat_at?: string | null
          current_step?: string | null
          progress?: number
          error_message?: string | null
          error_code?: string | null
          error_stage?: string | null
          error_context?: Record<string, any> | null
          started_at?: string | null
          completed_at?: string | null
        }
      }
    }
  }
}
