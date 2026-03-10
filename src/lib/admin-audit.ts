import { getSupabaseAdmin } from './supabase'

type AdminAuditAction = 'grant' | 'revoke'
type AdminAuditActorType = 'dashboard_admin' | 'internal_worker'
type AdminAuditSource = 'dashboard_proxy' | 'internal_api'

interface AdminAuditEvent {
  action: AdminAuditAction
  actorType: AdminAuditActorType
  actorUserId?: string | null
  actorEmail?: string | null
  targetUserId: string
  targetEmail?: string | null
  notes?: string | null
  source: AdminAuditSource
  metadata?: Record<string, any> | null
}

export async function writeAdminAuditLog(event: AdminAuditEvent): Promise<void> {
  const { error } = await (getSupabaseAdmin() as any)
    .from('admin_audit_logs')
    .insert({
      action: event.action,
      actor_type: event.actorType,
      actor_user_id: event.actorUserId || null,
      actor_email: event.actorEmail || null,
      target_user_id: event.targetUserId,
      target_email: event.targetEmail || null,
      notes: event.notes || null,
      source: event.source,
      metadata: event.metadata || null,
    })

  if (error) {
    throw new Error(error.message)
  }
}
