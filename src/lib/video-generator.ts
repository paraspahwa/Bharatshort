import { generateScript, ScriptScene } from './api/openai'
import { generateVideoSceneImage } from './api/nebius'
import { generateVideoFromImage, waitForVideoCompletion } from './api/haiper'
import { generateVoiceForLanguage } from './api/tts'
import { uploadImage, uploadVideo, uploadAudio, downloadFromUrl } from './storage'
import { combineVideos, addAudioToVideo, addCaptionsToVideo, extractThumbnail } from './video-processor'
import { checkUserCredits, deductCredits, deductCreditsIdempotent, calculateProjectCredits } from './credits'
import { getSupabaseAdmin } from './supabase'
import { heartbeatGenerationJob, updateJobStatus } from './queue'

export interface VideoGenerationOptions {
  topic: string
  language?: string
  duration?: number
  userId: string
  projectId: string
  jobId?: string
}

export interface VideoGenerationResult {
  success: boolean
  projectId: string
  videoUrl: string
  thumbnailUrl: string
  creditsUsed: number
  error?: string
}

/**
 * Main video generation pipeline
 */
export async function generateVideo(
  options: VideoGenerationOptions
): Promise<VideoGenerationResult> {
  const { topic, language = 'en', duration = 60, userId, projectId, jobId } = options

  try {
    // Step 1: Check credits
    await updateProgress(jobId, 5, 'Checking credits')
    const estimatedCredits = calculateProjectCredits(5, duration)
    const { hasEnough } = await checkUserCredits(userId, estimatedCredits.totalEstimate)

    if (!hasEnough) {
      throw new Error('Insufficient credits')
    }

    // Step 2: Generate script (or resume from persisted script)
    let script: { title: string; scenes: ScriptScene[]; totalDuration: number } | null = null
    await updateProgress(jobId, 10, 'Generating script')

    const { data: existingProject } = await (getSupabaseAdmin() as any)
      .from('projects')
      .select('title, script, duration, video_url, thumbnail_url, status')
      .eq('id', projectId)
      .maybeSingle()

    if (existingProject?.video_url && existingProject?.thumbnail_url) {
      await updateProgress(jobId, 100, 'Completed')
      return {
        success: true,
        projectId,
        videoUrl: existingProject.video_url,
        thumbnailUrl: existingProject.thumbnail_url,
        creditsUsed: 0,
      }
    }

    if (existingProject?.script) {
      try {
        script = JSON.parse(existingProject.script) as {
          title: string
          scenes: ScriptScene[]
          totalDuration: number
        }
      } catch (error) {
        script = null
      }
    }

    if (!script) {
      script = await generateScript(topic, language, duration)

      // Save script to database
      await (getSupabaseAdmin() as any)
        .from('projects')
        .update({
          title: script.title,
          script: JSON.stringify(script),
          duration: script.totalDuration,
        })
        .eq('id', projectId)

      // Deduct credits for script generation once.
      if (jobId) {
        await deductCreditsIdempotent(
          userId,
          projectId,
          jobId,
          5,
          'Script generation',
          'script_generation'
        )
      } else {
        await deductCredits(userId, projectId, 5, 'Script generation')
      }
    }

    // Step 3: Generate images for each scene
    await updateProgress(jobId, 20, 'Generating images')
    const imageUrls: string[] = []

    const { data: existingScenesData } = await (getSupabaseAdmin() as any)
      .from('scenes')
      .select('sequence_order, image_url, video_url, text_content, image_prompt, duration')
      .eq('project_id', projectId)

    const existingScenes = new Map<number, any>()
    ;(existingScenesData || []).forEach((scene: any) => {
      existingScenes.set(scene.sequence_order, scene)
    })
    
    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i]
      const existingScene = existingScenes.get(i + 1)

      if (existingScene?.image_url) {
        imageUrls.push(existingScene.image_url)
      } else {
        const image = await generateVideoSceneImage(scene.imagePrompt, i + 1, script.scenes.length)

        // Download and upload to our storage
        const imageBuffer = await downloadFromUrl(image.url)
        const { url } = await uploadImage(imageBuffer, `scene-${i + 1}.jpg`)
        imageUrls.push(url)

        // Upsert scene row
        await (getSupabaseAdmin() as any).from('scenes').upsert({
          project_id: projectId,
          sequence_order: i + 1,
          text_content: scene.text,
          image_prompt: scene.imagePrompt,
          image_url: url,
          duration: scene.duration,
        }, {
          onConflict: 'project_id,sequence_order',
        })

        // Deduct credits for newly generated images only.
        if (jobId) {
          await deductCreditsIdempotent(
            userId,
            projectId,
            jobId,
            3,
            `Image generation - Scene ${i + 1}`,
            `image_scene_${i + 1}`
          )
        } else {
          await deductCredits(userId, projectId, 3, `Image generation - Scene ${i + 1}`)
        }
      }
      
      await updateProgress(jobId, 20 + (i + 1) * (20 / script.scenes.length), `Generated image ${i + 1}/${script.scenes.length}`)
    }

    // Step 4: Generate videos from images
    await updateProgress(jobId, 40, 'Generating video clips')
    const videoUrls: string[] = []
    
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i]
      const scene = script.scenes[i]
      const existingScene = existingScenes.get(i + 1)

      if (existingScene?.video_url) {
        videoUrls.push(existingScene.video_url)
      } else {
        const videoGeneration = await generateVideoFromImage({
          imageUrl,
          prompt: 'smooth cinematic movement, professional quality',
          duration: scene.duration,
        })

        // Wait for video to complete
        const completedVideo = await waitForVideoCompletion(videoGeneration.id)

        if (!completedVideo.url) {
          throw new Error(`Failed to generate video for scene ${i + 1}`)
        }

        // Download and upload to our storage
        const videoBuffer = await downloadFromUrl(completedVideo.url)
        const { url } = await uploadVideo(videoBuffer, `scene-${i + 1}.mp4`)
        videoUrls.push(url)

        // Update scene with video URL
        await (getSupabaseAdmin() as any)
          .from('scenes')
          .update({ video_url: url })
          .eq('project_id', projectId)
          .eq('sequence_order', i + 1)

        // Deduct credits for newly generated videos only.
        const videoCredits = Math.ceil(scene.duration * 2)
        if (jobId) {
          await deductCreditsIdempotent(
            userId,
            projectId,
            jobId,
            videoCredits,
            `Video generation - Scene ${i + 1}`,
            `video_scene_${i + 1}`
          )
        } else {
          await deductCredits(userId, projectId, videoCredits, `Video generation - Scene ${i + 1}`)
        }
      }
      
      await updateProgress(jobId, 40 + (i + 1) * (25 / script.scenes.length), `Generated video ${i + 1}/${script.scenes.length}`)
    }

    // Step 5: Generate voice narration
    await updateProgress(jobId, 65, 'Generating voice narration')
    const audioBuffers: Buffer[] = []
    
    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i]
      const audioBuffer = await generateVoiceForLanguage(scene.text, language)
      audioBuffers.push(audioBuffer)
    }

    // Combine all audio segments
    // For simplicity, we'll use the first audio for now
    // In production, you'd want to concatenate them properly with timing
    const voiceCredits = Math.ceil(duration * 0.5)
    if (jobId) {
      await deductCreditsIdempotent(
        userId,
        projectId,
        jobId,
        voiceCredits,
        'Voice narration',
        'voice_narration'
      )
    } else {
      await deductCredits(userId, projectId, voiceCredits, 'Voice narration')
    }

    // Step 6: Combine everything
    await updateProgress(jobId, 75, 'Combining video clips')
    
    // Download all video clips
    const videoBuffers = await Promise.all(
      videoUrls.map(url => downloadFromUrl(url))
    )

    // Combine videos
    let finalVideo = await combineVideos(videoBuffers)
    
    // Add audio
    await updateProgress(jobId, 85, 'Adding voice narration')
    if (audioBuffers.length > 0) {
      finalVideo = await addAudioToVideo(finalVideo, audioBuffers[0])
    }

    // Add captions
    await updateProgress(jobId, 90, 'Adding captions')
    const captions = script.scenes.map((scene, index) => {
      const startTime = script.scenes.slice(0, index).reduce((sum, s) => sum + s.duration, 0)
      return {
        text: scene.text,
        startTime,
        endTime: startTime + scene.duration,
      }
    })
    
    finalVideo = await addCaptionsToVideo(finalVideo, captions)

    // Upload final video
    await updateProgress(jobId, 95, 'Uploading final video')
    const { url: finalVideoUrl } = await uploadVideo(finalVideo, `final-${projectId}.mp4`)

    // Extract and upload thumbnail
    const thumbnail = await extractThumbnail(finalVideo, 1)
    const { url: thumbnailUrl } = await uploadImage(thumbnail, `thumbnail-${projectId}.jpg`)

    // Update project with final URLs
    await (getSupabaseAdmin() as any)
      .from('projects')
      .update({
        video_url: finalVideoUrl,
        thumbnail_url: thumbnailUrl,
        status: 'completed',
      })
      .eq('id', projectId)

    // Update user's video count
    try {
      await (getSupabaseAdmin() as any).rpc('increment', {
        table_name: 'users',
        row_id: userId,
        column_name: 'total_videos_created',
        increment_by: 1,
      })
    } catch (error) {
      // Ignore if function doesn't exist
      console.error('Could not increment video count:', error)
    }

    await updateProgress(jobId, 100, 'Completed')

    return {
      success: true,
      projectId,
      videoUrl: finalVideoUrl,
      thumbnailUrl,
      creditsUsed: estimatedCredits.totalEstimate,
    }
  } catch (error: any) {
    console.error('Error generating video:', error)

    // Update project status
    await (getSupabaseAdmin() as any)
      .from('projects')
      .update({
        status: 'failed',
      })
      .eq('id', projectId)

    if (jobId) {
      await updateJobStatus(jobId, {
        status: 'failed',
        error: error.message,
      })
    }

    return {
      success: false,
      projectId,
      videoUrl: '',
      thumbnailUrl: '',
      creditsUsed: 0,
      error: error.message,
    }
  }
}

/**
 * Update job progress
 */
async function updateProgress(
  jobId: string | undefined,
  progress: number,
  step: string
): Promise<void> {
  if (!jobId) return

  await updateJobStatus(jobId, {
    progress: Math.round(progress),
    currentStep: step,
    status: progress >= 100 ? 'completed' : 'processing',
  })

  await heartbeatGenerationJob(jobId, 180, Math.round(progress), step).catch(() => {
    // Keep Redis updates as a fallback channel even when SQL heartbeat fails.
  })

  await (getSupabaseAdmin() as any)
    .from('generation_jobs')
    .update({
      progress: Math.round(progress),
      current_step: step,
      status: progress >= 100 ? 'completed' : 'processing',
      last_heartbeat_at: new Date().toISOString(),
      lease_expires_at: new Date(Date.now() + 180000).toISOString(),
      ...(progress >= 100 ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', jobId)
    .catch(() => {
      // Progress mirroring should not break generation execution.
    })
}
