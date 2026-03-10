import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { processOneGenerationJob } from '@/lib/generation-worker'
import { isInternalWorkerAuthorized } from '@/lib/internal-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (!isInternalWorkerAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await processOneGenerationJob()
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to process generation job' },
      { status: 500 }
    )
  }
}
