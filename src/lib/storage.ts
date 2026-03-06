import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

// Configure Cloudflare R2 client (S3-compatible)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.R2_BUCKET_NAME!
const PUBLIC_URL = process.env.R2_PUBLIC_URL!

export interface UploadOptions {
  folder?: string
  contentType?: string
  makePublic?: boolean
}

/**
 * Upload a file to Cloudflare R2
 */
export async function uploadFile(
  file: Buffer,
  filename: string,
  options: UploadOptions = {}
): Promise<{ key: string; url: string }> {
  try {
    const { folder = 'uploads', contentType = 'application/octet-stream', makePublic = true } = options

    const key = `${folder}/${uuidv4()}-${filename}`

    await r2Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
        CacheControl: 'max-age=31536000',
      })
    )

    // Generate public URL
    const url = `${PUBLIC_URL}/${key}`

    return { key, url }
  } catch (error) {
    console.error('Error uploading file:', error)
    throw new Error('Failed to upload file')
  }
}

/**
 * Upload an image
 */
export async function uploadImage(
  imageBuffer: Buffer,
  filename: string = 'image.jpg'
): Promise<{ key: string; url: string }> {
  return uploadFile(imageBuffer, filename, {
    folder: 'images',
    contentType: 'image/jpeg',
    makePublic: true,
  })
}

/**
 * Upload a video
 */
export async function uploadVideo(
  videoBuffer: Buffer,
  filename: string = 'video.mp4'
): Promise<{ key: string; url: string }> {
  return uploadFile(videoBuffer, filename, {
    folder: 'videos',
    contentType: 'video/mp4',
    makePublic: true,
  })
}

/**
 * Upload an audio file
 */
export async function uploadAudio(
  audioBuffer: Buffer,
  filename: string = 'audio.mp3'
): Promise<{ key: string; url: string }> {
  return uploadFile(audioBuffer, filename, {
    folder: 'audio',
    contentType: 'audio/mpeg',
    makePublic: true,
  })
}

/**
 * Download a file from R2
 */
export async function downloadFile(key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    const response = await r2Client.send(command)
    const chunks: Uint8Array[] = []

    if (!response.Body) {
      throw new Error('No file body received')
    }

    // @ts-ignore
    for await (const chunk of response.Body) {
      chunks.push(chunk)
    }

    return Buffer.concat(chunks)
  } catch (error) {
    console.error('Error downloading file:', error)
    throw new Error('Failed to download file')
  }
}

/**
 * Delete a file from R2
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    )
  } catch (error) {
    console.error('Error deleting file:', error)
    throw new Error('Failed to delete file')
  }
}

/**
 * Generate a signed URL for temporary access
 */
export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    return await getSignedUrl(r2Client, command, { expiresIn })
  } catch (error) {
    console.error('Error generating signed URL:', error)
    throw new Error('Failed to generate signed URL')
  }
}

/**
 * Download file from URL
 */
export async function downloadFromUrl(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('Error downloading from URL:', error)
    throw new Error('Failed to download from URL')
  }
}

/**
 * Upload from URL (download and re-upload to R2)
 */
export async function uploadFromUrl(
  url: string,
  filename: string,
  options: UploadOptions = {}
): Promise<{ key: string; url: string }> {
  const buffer = await downloadFromUrl(url)
  return uploadFile(buffer, filename, options)
}
