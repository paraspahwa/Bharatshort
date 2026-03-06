import ffmpeg from 'fluent-ffmpeg'
import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import os from 'os'

const TEMP_DIR = os.tmpdir()

/**
 * Create a temporary file path
 */
function getTempPath(extension: string): string {
  return path.join(TEMP_DIR, `${uuidv4()}.${extension}`)
}

/**
 * Combine multiple video clips into one
 */
export async function combineVideos(
  videoBuffers: Buffer[],
  outputPath?: string
): Promise<Buffer> {
  const output = outputPath || getTempPath('mp4')
  const tempFiles: string[] = []

  try {
    // Write all buffers to temp files
    for (const buffer of videoBuffers) {
      const tempFile = getTempPath('mp4')
      await fs.writeFile(tempFile, buffer)
      tempFiles.push(tempFile)
    }

    // Create concat file list
    const concatListPath = getTempPath('txt')
    const concatContent = tempFiles.map(file => `file '${file}'`).join('\n')
    await fs.writeFile(concatListPath, concatContent)

    // Combine videos using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions([
          '-c copy', // Copy streams without re-encoding
          '-movflags +faststart', // Optimize for web streaming
        ])
        .output(output)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run()
    })

    // Read the output file
    const outputBuffer = await fs.readFile(output)

    // Clean up temp files
    await Promise.all([
      ...tempFiles.map(file => fs.unlink(file).catch(() => {})),
      fs.unlink(concatListPath).catch(() => {}),
      fs.unlink(output).catch(() => {}),
    ])

    return outputBuffer
  } catch (error) {
    console.error('Error combining videos:', error)
    throw new Error('Failed to combine videos')
  }
}

/**
 * Add audio to video
 */
export async function addAudioToVideo(
  videoBuffer: Buffer,
  audioBuffer: Buffer,
  outputPath?: string
): Promise<Buffer> {
  const output = outputPath || getTempPath('mp4')
  const videoPath = getTempPath('mp4')
  const audioPath = getTempPath('mp3')

  try {
    await fs.writeFile(videoPath, videoBuffer)
    await fs.writeFile(audioPath, audioBuffer)

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .outputOptions([
          '-c:v copy', // Copy video stream
          '-c:a aac', // Encode audio as AAC
          '-shortest', // Match shortest input duration
          '-movflags +faststart',
        ])
        .output(output)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run()
    })

    const outputBuffer = await fs.readFile(output)

    // Clean up
    await Promise.all([
      fs.unlink(videoPath).catch(() => {}),
      fs.unlink(audioPath).catch(() => {}),
      fs.unlink(output).catch(() => {}),
    ])

    return outputBuffer
  } catch (error) {
    console.error('Error adding audio to video:', error)
    throw new Error('Failed to add audio to video')
  }
}

/**
 * Add text captions to video
 */
export async function addCaptionsToVideo(
  videoBuffer: Buffer,
  captions: { text: string; startTime: number; endTime: number }[],
  outputPath?: string
): Promise<Buffer> {
  const output = outputPath || getTempPath('mp4')
  const videoPath = getTempPath('mp4')
  const srtPath = getTempPath('srt')

  try {
    await fs.writeFile(videoPath, videoBuffer)

    // Generate SRT subtitle file
    const srtContent = captions
      .map((caption, index) => {
        const start = formatSRTTime(caption.startTime)
        const end = formatSRTTime(caption.endTime)
        return `${index + 1}\n${start} --> ${end}\n${caption.text}\n`
      })
      .join('\n')

    await fs.writeFile(srtPath, srtContent)

    // Add subtitles using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(videoPath)
        .outputOptions([
          `-vf subtitles=${srtPath}:force_style='Fontsize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Bold=1,Alignment=2'`,
          '-c:a copy',
          '-movflags +faststart',
        ])
        .output(output)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run()
    })

    const outputBuffer = await fs.readFile(output)

    // Clean up
    await Promise.all([
      fs.unlink(videoPath).catch(() => {}),
      fs.unlink(srtPath).catch(() => {}),
      fs.unlink(output).catch(() => {}),
    ])

    return outputBuffer
  } catch (error) {
    console.error('Error adding captions to video:', error)
    throw new Error('Failed to add captions to video')
  }
}

/**
 * Format time for SRT subtitle format (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds % 1) * 1000)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`
}

/**
 * Get video metadata
 */
export async function getVideoMetadata(videoBuffer: Buffer): Promise<{
  duration: number
  width: number
  height: number
  fps: number
}> {
  const videoPath = getTempPath('mp4')

  try {
    await fs.writeFile(videoPath, videoBuffer)

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        fs.unlink(videoPath).catch(() => {})

        if (err) {
          return reject(err)
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video')
        if (!videoStream) {
          return reject(new Error('No video stream found'))
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          fps: eval(videoStream.r_frame_rate || '30') || 30,
        })
      })
    })
  } catch (error) {
    console.error('Error getting video metadata:', error)
    throw new Error('Failed to get video metadata')
  }
}

/**
 * Resize video to specific dimensions
 */
export async function resizeVideo(
  videoBuffer: Buffer,
  width: number,
  height: number,
  outputPath?: string
): Promise<Buffer> {
  const output = outputPath || getTempPath('mp4')
  const videoPath = getTempPath('mp4')

  try {
    await fs.writeFile(videoPath, videoBuffer)

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(videoPath)
        .outputOptions([
          `-vf scale=${width}:${height}`,
          '-c:a copy',
          '-movflags +faststart',
        ])
        .output(output)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run()
    })

    const outputBuffer = await fs.readFile(output)

    // Clean up
    await Promise.all([
      fs.unlink(videoPath).catch(() => {}),
      fs.unlink(output).catch(() => {}),
    ])

    return outputBuffer
  } catch (error) {
    console.error('Error resizing video:', error)
    throw new Error('Failed to resize video')
  }
}

/**
 * Extract thumbnail from video
 */
export async function extractThumbnail(
  videoBuffer: Buffer,
  timeInSeconds: number = 0
): Promise<Buffer> {
  const videoPath = getTempPath('mp4')
  const thumbnailPath = getTempPath('jpg')

  try {
    await fs.writeFile(videoPath, videoBuffer)

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(videoPath)
        .screenshots({
          timestamps: [timeInSeconds],
          filename: path.basename(thumbnailPath),
          folder: path.dirname(thumbnailPath),
          size: '1280x720',
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
    })

    const thumbnailBuffer = await fs.readFile(thumbnailPath)

    // Clean up
    await Promise.all([
      fs.unlink(videoPath).catch(() => {}),
      fs.unlink(thumbnailPath).catch(() => {}),
    ])

    return thumbnailBuffer
  } catch (error) {
    console.error('Error extracting thumbnail:', error)
    throw new Error('Failed to extract thumbnail')
  }
}
