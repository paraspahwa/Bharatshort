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
          amount: number
          transaction_type: 'usage' | 'purchase' | 'bonus' | 'refund'
          description: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          project_id?: string | null
          amount: number
          transaction_type: 'usage' | 'purchase' | 'bonus' | 'refund'
          description?: string | null
        }
      }
      generation_jobs: {
        Row: {
          id: string
          project_id: string
          user_id: string
          status: 'queued' | 'processing' | 'completed' | 'failed'
          current_step: string | null
          progress: number
          error_message: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          project_id: string
          user_id: string
          status?: 'queued' | 'processing' | 'completed' | 'failed'
          current_step?: string | null
          progress?: number
          error_message?: string | null
        }
        Update: {
          status?: 'queued' | 'processing' | 'completed' | 'failed'
          current_step?: string | null
          progress?: number
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
        }
      }
    }
  }
}
