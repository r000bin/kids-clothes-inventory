import { supabase } from './supabase'

const BUCKET = 'photos'
const SIGNED_URL_TTL = 60 * 60 // seconds

const urlCache = new Map<string, { url: string; expiresAt: number }>()

/** A signed URL for a private photo, cached until shortly before it expires. */
export async function photoUrl(path: string): Promise<string | null> {
  const hit = urlCache.get(path)
  if (hit && hit.expiresAt > Date.now()) return hit.url

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL)
  if (error || !data) return null

  urlCache.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + (SIGNED_URL_TTL - 60) * 1000,
  })
  return data.signedUrl
}

/**
 * Phone cameras produce 3-5 MB photos. We only ever show them as a thumbnail or
 * a full-screen preview, so shrink before upload to keep storage and mobile data
 * use small.
 */
export async function shrinkImage(file: File, maxEdge = 1280, quality = 0.72): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process the image on this device.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )
  if (!blob) throw new Error('Could not process the image on this device.')
  return blob
}

export async function uploadPhoto(file: File): Promise<string> {
  const blob = await shrinkImage(file)
  const path = `items/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

export async function deletePhoto(path: string): Promise<void> {
  urlCache.delete(path)
  await supabase.storage.from(BUCKET).remove([path])
}
