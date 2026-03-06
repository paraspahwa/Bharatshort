import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { generateVideo } from '@/lib/video-generator'
import { enqueueVideoJob } from '@/lib/queue'
import { ensureUserExists } from '@/lib/credits'
import { v4 as uuidv4 } from 'uuid'

// Prevent static generation
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user record exists
    await ensureUserExists(session.user.id, session.user.email)

    const body = await request.json()
    const { topic, language = 'en', duration = 60 } = body

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    // Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: session.user.id,
        title: `Video: ${topic.substring(0, 50)}`,
        topic,
        language,
        status: 'generating',
      })
      .select()
      .single()

    if (projectError || !project) {
      throw new Error('Failed to create project')
    }

    // Add to queue
    const jobId = await enqueueVideoJob(project.id, session.user.id)

    // Start generation asynchronously
    generateVideo({
      topic,
      language,
      duration,
      userId: session.user.id,
      projectId: project.id,
      jobId,
    }).catch(error => {
      console.error('Video generation error:', error)
    })

    return NextResponse.json({
      success: true,
      projectId: project.id,
      jobId,
      message: 'Video generation started',
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start video generation' },
      { status: 500 }
    )
  }
}
