import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestAuth } from '@/lib/request-auth'
import { isDashboardAdmin } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    if (!process.env.WORKER_SECRET) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const auth = await resolveRequestAuth(request)
    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await isDashboardAdmin(auth.user.id)
    return NextResponse.json({ isAdmin: admin })
  } catch {
    return NextResponse.json({ isAdmin: false })
  }
}
