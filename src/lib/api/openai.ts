import OpenAI from 'openai'

let openaiInstance: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openaiInstance = new OpenAI({ apiKey })
  }
  return openaiInstance
}

export interface ScriptScene {
  sequence: number
  text: string
  imagePrompt: string
  duration: number
}

export interface GeneratedScript {
  title: string
  scenes: ScriptScene[]
  totalDuration: number
}

/**
 * Generate a video script based on a topic
 */
export async function generateScript(
  topic: string,
  language: string = 'en',
  duration: number = 60
): Promise<GeneratedScript> {
  const prompt = `You are a professional short-form video script writer. Create an engaging ${duration}-second video script about: "${topic}"

Requirements:
- Language: ${language === 'hi' ? 'Hindi (Devanagari script)' : 'English'}
- Total duration: ${duration} seconds
- Create 4-6 scenes, each 8-12 seconds long
- Each scene should have captivating narration text
- Include detailed image generation prompts for each scene
- Make it engaging for social media (YouTube Shorts, Instagram Reels, TikTok)
- Use simple, conversational language
- Include a strong hook in the first scene
- End with a call-to-action

Return ONLY a JSON object in this exact format:
{
  "title": "Video title",
  "scenes": [
    {
      "sequence": 1,
      "text": "Narration text for this scene",
      "imagePrompt": "Detailed visual description for AI image generation",
      "duration": 10
    }
  ]
}`

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert video script writer specializing in short-form content. Always return valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    
    // Calculate total duration
    const totalDuration = result.scenes.reduce((sum: number, scene: ScriptScene) => sum + scene.duration, 0)
    
    return {
      title: result.title,
      scenes: result.scenes,
      totalDuration,
    }
  } catch (error) {
    console.error('Error generating script:', error)
    throw new Error('Failed to generate script')
  }
}

/**
 * Generate captions/subtitles from text
 */
export async function generateCaptions(text: string, language: string = 'en'): Promise<string[]> {
  const prompt = `Break this text into short subtitle segments (5-8 words each) suitable for video captions:

"${text}"

Return ONLY a JSON array of strings, each being one caption segment.`

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a subtitle generator. Always return a valid JSON array.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0].message.content || '{"captions":[]}')
    return result.captions || result.segments || []
  } catch (error) {
    console.error('Error generating captions:', error)
    throw new Error('Failed to generate captions')
  }
}

/**
 * Transcribe audio to text using Whisper
 */
export async function transcribeAudio(audioFile: Buffer, filename: string): Promise<string> {
  try {
    // Convert Buffer to Uint8Array for compatibility
    const uint8Array = new Uint8Array(audioFile)
    const blob = new Blob([uint8Array], { type: 'audio/mp3' })
    const file = new File([blob], filename, { type: 'audio/mp3' })
    
    const transcription = await getOpenAIClient().audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'text',
    })

    return transcription
  } catch (error) {
    console.error('Error transcribing audio:', error)
    throw new Error('Failed to transcribe audio')
  }
}

/**
 * Improve or refine a script
 */
export async function refineScript(originalScript: string, instructions: string): Promise<string> {
  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional script editor. Improve scripts while maintaining their core message.',
        },
        {
          role: 'user',
          content: `Original script:\n${originalScript}\n\nUser instructions: ${instructions}\n\nProvide the improved script.`,
        },
      ],
      temperature: 0.7,
    })

    return completion.choices[0].message.content || originalScript
  } catch (error) {
    console.error('Error refining script:', error)
    throw new Error('Failed to refine script')
  }
}
