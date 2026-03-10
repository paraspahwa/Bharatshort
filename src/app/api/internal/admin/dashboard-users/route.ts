import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isDashboardAdmin } from '@/lib/admin-access'
import { writeAdminAuditLog } from '@/lib/admin-audit'
import { resolveRequestAuth } from '@/lib/request-auth'

export const dynamic = 'force-dynamic'

interface AuthorizedSession {
  userId: string
  email: string
}

interface ResolvedTargetUser {
  userId: string
  email: string | null
}

function getString(input: unknown): string {
  return String(input || '').trim()
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

async function authorizeAdminSession(
  request: NextRequest
): Promise<{ ok: true; session: AuthorizedSession } | { ok: false; response: NextResponse }> {
  if (!process.env.WORKER_SECRET) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not found' }, { status: 404 }),
    }
  }

  const auth = await resolveRequestAuth(request)
  if (!auth?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const isAdmin = await isDashboardAdmin(auth.user.id)
  if (!isAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return {
    ok: true,
    session: {
      userId: auth.user.id,
      email: normalizeEmail(auth.user.email || ''),
    },
  }
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
    const auth = await authorizeAdminSession(request)
    if (!auth.ok) {
      return auth.response
    }

    const { data, error } = await (getSupabaseAdmin() as any)
      .from('admin_users')
      .select('user_id, is_active, notes, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      throw new Error(error.message)
    }

    const rows = Array.isArray(data) ? data : []
    const userIds = rows.map((row: any) => row.user_id)

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
      admins: rows.map((row: any) => ({
        ...row,
        email: emailByUserId.get(String(row.user_id)) || null,
      })),
      total: rows.length,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch dashboard admin users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeAdminSession(request)
    if (!auth.ok) {
      return auth.response
    }

    const body = await request.json().catch(() => ({}))
    const target = await resolveTargetUser(body)
    const notesRaw = getString(body?.notes)
    const notes = notesRaw.length > 0 ? notesRaw : null

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
      actorType: 'dashboard_admin',
      actorUserId: auth.session.userId,
      actorEmail: auth.session.email,
      targetUserId: target.userId,
      targetEmail: target.email,
      notes,
      source: 'dashboard_proxy',
      metadata: {
        endpoint: '/api/internal/admin/dashboard-users',
        userAgent: request.headers.get('user-agent') || null,
      },
    })

    return NextResponse.json({ success: true, userId: target.userId, isActive: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to grant dashboard admin access' },
      { status: 400 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authorizeAdminSession(request)
    if (!auth.ok) {
      return auth.response
    }

    const body = await request.json().catch(() => ({}))
    const target = await resolveTargetUser(body)
    const notesRaw = getString(body?.notes)
    const notes = notesRaw.length > 0 ? notesRaw : null

    if (target.userId === auth.session.userId) {
      const { count, error: countError } = await (getSupabaseAdmin() as any)
        .from('admin_users')
        .select('user_id', { count: 'exact', head: true })
        .eq('is_active', true)

      if (countError) {
        throw new Error(countError.message)
      }

      if ((count || 0) <= 1) {
        return NextResponse.json(
          { error: 'Cannot revoke the last active admin account' },
          { status: 400 }
        )
      }
    }

    const { error } = await (getSupabaseAdmin() as any)
      .from('admin_users')
      .update({ is_active: false })
      .eq('user_id', target.userId)

    if (error) {
      throw new Error(error.message)
    }

    await writeAdminAuditLog({
      action: 'revoke',
      actorType: 'dashboard_admin',
      actorUserId: auth.session.userId,
      actorEmail: auth.session.email,
      targetUserId: target.userId,
      targetEmail: target.email,
      notes,
      source: 'dashboard_proxy',
      metadata: {
        endpoint: '/api/internal/admin/dashboard-users',
        userAgent: request.headers.get('user-agent') || null,
      },
    })

    return NextResponse.json({ success: true, userId: target.userId, isActive: false })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to revoke dashboard admin access' },
      { status: 400 }
    )
  }
}
