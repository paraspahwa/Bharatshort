import axios from 'axios'

const haiperClient = axios.create({
  baseURL: process.env.HAIPER_API_URL || 'https://api.haiper.ai/v1/',
  headers: {
    'Authorization': `Bearer ${process.env.HAIPER_API_KEY}`,
    'Content-Type': 'application/json',
  },
})

export interface VideoGenerationOptions {
  imageUrl: string
  prompt?: string
  duration?: number // seconds (typically 4-6 seconds)
  aspectRatio?: '16:9' | '9:16' | '1:1'
}

export interface GeneratedVideo {
  id: string
  url?: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  thumbnailUrl?: string
}

/**
 * Generate a video from an image using Haiper AI
 */
export async function generateVideoFromImage(options: VideoGenerationOptions): Promise<GeneratedVideo> {
  const {
    imageUrl,
    prompt = 'smooth camera movement, cinematic',
    duration = 5,
    aspectRatio = '16:9',
  } = options

  try {
    const response = await haiperClient.post('/videos/image-to-video', {
      image_url: imageUrl,
      prompt,
      duration,
      aspect_ratio: aspectRatio,
    })

    return {
      id: response.data.id,
      status: response.data.status,
      url: response.data.url,
      thumbnailUrl: response.data.thumbnail_url,
    }
  } catch (error: any) {
    console.error('Haiper AI error:', error.response?.data || error.message)
    throw new Error(`Failed to generate video: ${error.response?.data?.error?.message || error.message}`)
  }
}

/**
 * Check the status of a video generation job
 */
export async function checkVideoStatus(videoId: string): Promise<GeneratedVideo> {
  try {
    const response = await haiperClient.get(`/videos/${videoId}`)
    
    return {
      id: response.data.id,
      status: response.data.status,
      url: response.data.url,
      thumbnailUrl: response.data.thumbnail_url,
    }
  } catch (error: any) {
    console.error('Error checking video status:', error.response?.data || error.message)
    throw new Error(`Failed to check video status: ${error.message}`)
  }
}

/**
 * Wait for video generation to complete
 */
export async function waitForVideoCompletion(
  videoId: string,
  maxWaitTime: number = 120000, // 2 minutes
  pollInterval: number = 3000 // 3 seconds
): Promise<GeneratedVideo> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < maxWaitTime) {
    const status = await checkVideoStatus(videoId)
    
    if (status.status === 'completed') {
      return status
    }
    
    if (status.status === 'failed') {
      throw new Error('Video generation failed')
    }
    
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }
  
  throw new Error('Video generation timed out')
}

/**
 * Generate videos for multiple images
 */
export async function generateVideosBatch(
  images: { url: string; prompt?: string }[]
): Promise<GeneratedVideo[]> {
  try {
    // Start all video generations
    const videoPromises = images.map(image =>
      generateVideoFromImage({
        imageUrl: image.url,
        prompt: image.prompt,
      })
    )
    
    const videos = await Promise.all(videoPromises)
    
    // Wait for all videos to complete
    const completedVideos = await Promise.all(
      videos.map(video => waitForVideoCompletion(video.id))
    )
    
    return completedVideos
  } catch (error) {
    console.error('Error generating video batch:', error)
    throw new Error('Failed to generate video batch')
  }
}

/**
 * Cancel a video generation job
 */
export async function cancelVideoGeneration(videoId: string): Promise<void> {
  try {
    await haiperClient.delete(`/videos/${videoId}`)
  } catch (error: any) {
    console.error('Error canceling video:', error.response?.data || error.message)
    throw new Error(`Failed to cancel video: ${error.message}`)
  }
}
