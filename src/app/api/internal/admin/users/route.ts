import { NextRequest, NextResponse } from 'next/server'
import { isInternalWorkerAuthorized } from '@/lib/internal-auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { writeAdminAuditLog } from '@/lib/admin-audit'

export const dynamic = 'force-dynamic'

interface AdminUserRow {
  user_id: string
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

interface ResolvedTargetUser {
  userId: string
  email: string | null
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function getString(input: unknown): string {
  return String(input || '').trim()
}

async function findUserById(userId: string): Promise<ResolvedTargetUser> {
  const { data, error } = await (getSupabaseAdmin() as any)
    .from('users')
    .select('id, email')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data?.id) {
    throw new Error('User not found for provided userId')
  }

  return {
    userId: String(data.id),
    email: data.email ? normalizeEmail(String(data.email)) : null,
  }
}

async function resolveTargetUser(body: any): Promise<ResolvedTargetUser> {
  const userId = getString(body?.userId)
  if (userId) {
    return findUserById(userId)
  }

  const email = normalizeEmail(getString(body?.email))
  if (!email) {
    throw new Error('Provide userId or email')
  }

  const { data, error } = await (getSupabaseAdmin() as any)
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data?.id) {
    throw new Error('User not found for provided email')
  }

  return {
    userId: String(data.id),
    email,
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!isInternalWorkerAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activeOnly = request.nextUrl.searchParams.get('activeOnly') === 'true'

    let query = (getSupabaseAdmin() as any)
      .from('admin_users')
      .select('user_id, is_active, notes, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    const rows = (Array.isArray(data) ? data : []) as AdminUserRow[]
    const userIds = rows.map((row) => row.user_id)

    let emailByUserId = new Map<string, string>()

    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await (getSupabaseAdmin() as any)
        .from('users')
        .select('id, email')
        .in('id', userIds)

      if (usersError) {
        throw new Error(usersError.message)
      }

      emailByUserId = new Map(
        (Array.isArray(usersData) ? usersData : []).map((item: any) => [String(item.id), String(item.email || '')])
      )
    }

    return NextResponse.json({
      admins: rows.map((row) => ({
        ...row,
        email: emailByUserId.get(row.user_id) || null,
      })),
      total: rows.length,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch admin users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isInternalWorkerAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const target = await resolveTargetUser(body)
    const notesRaw = getString(body?.notes)
    const notes = notesRaw.length > 0 ? notesRaw : null
    const actorEmail = normalizeEmail(getString(body?.actorEmail || request.headers.get('x-actor-email')))

    const { error } = await (getSupabaseAdmin() as any)
      .from('admin_users')
      .upsert(
        {
          user_id: target.userId,
          is_active: true,
          notes,
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      throw new Error(error.message)
    }

    await writeAdminAuditLog({
      action: 'grant',
      actorType: 'internal_worker',
      actorEmail: actorEmail || null,
      targetUserId: target.userId,
      targetEmail: target.email,
      notes,
      source: 'internal_api',
      metadata: {
        endpoint: '/api/internal/admin/users',
      },
    })

    return NextResponse.json({ success: true, userId: target.userId, isActive: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to grant admin access' },
      { status: 400 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isInternalWorkerAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const target = await resolveTargetUser(body)
    const notesRaw = getString(body?.notes)
    const notes = notesRaw.length > 0 ? notesRaw : null
    const actorEmail = normalizeEmail(getString(body?.actorEmail || request.headers.get('x-actor-email')))

    const { error } = await (getSupabaseAdmin() as any)
      .from('admin_users')
      .update({ is_active: false })
      .eq('user_id', target.userId)

    if (error) {
      throw new Error(error.message)
    }

    await writeAdminAuditLog({
      action: 'revoke',
      actorType: 'internal_worker',
      actorEmail: actorEmail || null,
      targetUserId: target.userId,
      targetEmail: target.email,
      notes,
      source: 'internal_api',
      metadata: {
        endpoint: '/api/internal/admin/users',
      },
    })

    return NextResponse.json({ success: true, userId: target.userId, isActive: false })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to revoke admin access' },
      { status: 400 }
    )
  }
}
