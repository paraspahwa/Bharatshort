import axios from 'axios'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'

/**
 * Generate Hindi text-to-speech using Bhashini AI
 */
export async function generateHindiVoice(
  text: string,
  gender: 'male' | 'female' = 'female'
): Promise<Buffer> {
  try {
    const response = await axios.post(
      'https://dhruva-api.bhashini.gov.in/services/inference/pipeline',
      {
        pipelineTasks: [
          {
            taskType: 'tts',
            config: {
              language: {
                sourceLanguage: 'hi',
              },
              serviceId: 'ai4bharat/indic-tts',
              gender: gender,
            },
          },
        ],
        inputData: {
          input: [
            {
              source: text,
            },
          ],
        },
      },
      {
        headers: {
          'Authorization': process.env.BHASHINI_API_KEY,
          'Content-Type': 'application/json',
          'userID': process.env.BHASHINI_USER_ID,
        },
      }
    )

    // Convert base64 audio to buffer
    const audioBase64 = response.data.pipelineResponse[0].audio[0].audioContent
    return Buffer.from(audioBase64, 'base64')
  } catch (error: any) {
    console.error('Bhashini AI error:', error.response?.data || error.message)
    throw new Error(`Failed to generate Hindi voice: ${error.message}`)
  }
}

/**
 * Generate text-to-speech using Google Cloud TTS (for non-Hindi languages)
 */
export async function generateVoice(
  text: string,
  languageCode: string = 'en-US',
  gender: 'MALE' | 'FEMALE' | 'NEUTRAL' = 'NEUTRAL',
  voiceName?: string
): Promise<Buffer> {
  try {
    // Initialize Google Cloud TTS client
    const client = new TextToSpeechClient({
      apiKey: process.env.GOOGLE_CLOUD_TTS_API_KEY,
    })

    // Construct the request
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode,
        ssmlGender: gender,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
      },
    })

    if (!response.audioContent) {
      throw new Error('No audio content received')
    }

    return Buffer.from(response.audioContent as Uint8Array)
  } catch (error: any) {
    console.error('Google TTS error:', error)
    throw new Error(`Failed to generate voice: ${error.message}`)
  }
}

/**
 * Generate voice based on language (routes to appropriate TTS service)
 */
export async function generateVoiceForLanguage(
  text: string,
  language: string = 'en',
  gender: 'male' | 'female' = 'female'
): Promise<Buffer> {
  // Use Bhashini for Hindi
  if (language === 'hi') {
    return generateHindiVoice(text, gender)
  }

  // Use Google TTS for other languages
  const languageMap: Record<string, { code: string; voiceName?: string }> = {
    'en': { code: 'en-US', voiceName: 'en-US-Neural2-F' },
    'es': { code: 'es-ES', voiceName: 'es-ES-Neural2-A' },
    'fr': { code: 'fr-FR', voiceName: 'fr-FR-Neural2-A' },
    'de': { code: 'de-DE', voiceName: 'de-DE-Neural2-A' },
    'ja': { code: 'ja-JP', voiceName: 'ja-JP-Neural2-B' },
    'ko': { code: 'ko-KR', voiceName: 'ko-KR-Neural2-A' },
  }

  const langConfig = languageMap[language] || { code: 'en-US' }
  const googleGender = gender === 'male' ? 'MALE' : 'FEMALE'

  return generateVoice(text, langConfig.code, googleGender, langConfig.voiceName)
}

/**
 * Combine multiple text segments into a single audio file
 */
export async function generateVoiceForScenes(
  scenes: { text: string }[],
  language: string = 'en',
  gender: 'male' | 'female' = 'female'
): Promise<Buffer[]> {
  try {
    const audioPromises = scenes.map(scene =>
      generateVoiceForLanguage(scene.text, language, gender)
    )

    return await Promise.all(audioPromises)
  } catch (error) {
    console.error('Error generating voice for scenes:', error)
    throw new Error('Failed to generate voice for scenes')
  }
}

/**
 * Get available voices for a language
 */
export function getAvailableVoices(language: string): string[] {
  const voiceMap: Record<string, string[]> = {
    'en': ['en-US-Neural2-F', 'en-US-Neural2-D', 'en-US-Neural2-A'],
    'hi': ['female', 'male'],
    'es': ['es-ES-Neural2-A', 'es-ES-Neural2-B'],
    'fr': ['fr-FR-Neural2-A', 'fr-FR-Neural2-B'],
    'de': ['de-DE-Neural2-A', 'de-DE-Neural2-B'],
  }

  return voiceMap[language] || voiceMap['en']
}
