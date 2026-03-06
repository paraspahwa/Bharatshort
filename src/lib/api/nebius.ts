import axios from 'axios'

const nebiusClient = axios.create({
  baseURL: process.env.NEBIUS_API_URL || 'https://api.studio.nebius.ai/v1/',
  headers: {
    'Authorization': `Bearer ${process.env.NEBIUS_API_KEY}`,
    'Content-Type': 'application/json',
  },
})

export interface ImageGenerationOptions {
  prompt: string
  model?: 'flux-schnell' | 'sdxl'
  width?: number
  height?: number
  numImages?: number
}

export interface GeneratedImage {
  url: string
  seed?: number
}

/**
 * Generate an image using Nebius AI
 */
export async function generateImage(options: ImageGenerationOptions): Promise<GeneratedImage> {
  const {
    prompt,
    model = 'flux-schnell',
    width = 1024,
    height = 576, // 16:9 aspect ratio for videos
    numImages = 1,
  } = options

  try {
    const response = await nebiusClient.post('/images/generations', {
      prompt,
      model,
      width,
      height,
      n: numImages,
    })

    const imageData = response.data.data[0]
    
    return {
      url: imageData.url,
      seed: imageData.seed,
    }
  } catch (error: any) {
    console.error('Nebius AI error:', error.response?.data || error.message)
    throw new Error(`Failed to generate image: ${error.response?.data?.error?.message || error.message}`)
  }
}

/**
 * Generate multiple images in batch
 */
export async function generateImageBatch(prompts: string[], model: 'flux-schnell' | 'sdxl' = 'flux-schnell'): Promise<GeneratedImage[]> {
  try {
    const promises = prompts.map(prompt => 
      generateImage({ prompt, model })
    )
    
    return await Promise.all(promises)
  } catch (error) {
    console.error('Error generating image batch:', error)
    throw new Error('Failed to generate image batch')
  }
}

/**
 * Enhance an image prompt for better results
 */
export function enhancePrompt(basePrompt: string): string {
  const qualityModifiers = [
    'high quality',
    'detailed',
    'professional photography',
    '8k resolution',
    'cinematic lighting',
    'vibrant colors',
    'sharp focus',
  ]
  
  return `${basePrompt}, ${qualityModifiers.join(', ')}`
}

/**
 * Generate an image optimized for video scenes
 */
export async function generateVideoSceneImage(
  scenePrompt: string,
  sceneNumber: number,
  totalScenes: number
): Promise<GeneratedImage> {
  // Enhance prompt for video use
  const enhancedPrompt = enhancePrompt(scenePrompt)
  
  // Add scene-specific styling
  const videoPrompt = `${enhancedPrompt}, suitable for short-form video content, dynamic composition, engaging visual storytelling`
  
  return generateImage({
    prompt: videoPrompt,
    model: 'flux-schnell', // Faster model for video generation
    width: 1024,
    height: 576, // 16:9 aspect ratio
  })
}
