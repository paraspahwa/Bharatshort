import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isDashboardAdmin } from '@/lib/admin-access'
import { resolveRequestAuth } from '@/lib/request-auth'

export const dynamic = 'force-dynamic'

interface AuthorizedSession {
  userId: string
}

async function authorizeAdminSession(request: NextRequest): Promise<{ ok: true; session: AuthorizedSession } | { ok: false; response: NextResponse }> {
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
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdminSession(request)
    if (!auth.ok) {
      return auth.response
    }

    const limitParam = Number.parseInt(request.nextUrl.searchParams.get('limit') || '25', 10)
    const limit = Math.max(1, Math.min(100, Number.isNaN(limitParam) ? 25 : limitParam))
    const pageParam = Number.parseInt(request.nextUrl.searchParams.get('page') || '1', 10)
    const page = Math.max(1, Number.isNaN(pageParam) ? 1 : pageParam)
    const actionFilter = String(request.nextUrl.searchParams.get('action') || '').trim().toLowerCase()
    const searchQuery = String(request.nextUrl.searchParams.get('query') || '').trim().toLowerCase()
    const start = (page - 1) * limit
    const end = start + limit

    let builder = (getSupabaseAdmin() as any)
      .from('admin_audit_logs')
      .select('id, action, actor_type, actor_user_id, actor_email, target_user_id, target_email, notes, source, metadata, created_at')
      .order('created_at', { ascending: false })
      .range(start, end)

    if (actionFilter === 'grant' || actionFilter === 'revoke') {
      builder = builder.eq('action', actionFilter)
    }

    if (searchQuery) {
      const escapedQuery = searchQuery.replace(/[%_,]/g, (match) => `\\${match}`)
      builder = builder.or(`actor_email.ilike.%${escapedQuery}%,target_email.ilike.%${escapedQuery}%`)
    }

    const { data, error } = await builder

    if (error) {
      throw new Error(error.message)
    }

    const rows = Array.isArray(data) ? data : []
    const hasMore = rows.length > limit

    return NextResponse.json({
      logs: hasMore ? rows.slice(0, limit) : rows,
      limit,
      page,
      action: actionFilter || null,
      query: searchQuery || null,
      hasMore,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch admin audit logs' },
      { status: 500 }
    )
  }
}
