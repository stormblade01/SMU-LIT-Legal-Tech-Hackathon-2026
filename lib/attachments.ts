/**
 * Reads a File and resolves its contents as a Base64 data URL
 * (e.g. `data:image/png;base64,iVBORw0KGgo...`).
 *
 * Used to prepare uploaded evidence for the AI SDK `sendMessage` `files`
 * option, which accepts data URLs in a `FileUIPart`.
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error(`Could not read file "${file.name}" as a data URL.`))
      }
    }
    reader.onerror = () =>
      reject(reader.error ?? new Error(`Failed to read "${file.name}".`))

    reader.readAsDataURL(file)
  })
}

/** Maximum dimension (px) images are downscaled to before upload. */
const MAX_IMAGE_DIMENSION = 1600
/** JPEG quality used when re-encoding large images. */
const COMPRESS_QUALITY = 0.85
/** Gemini rejects inline file data above this size; guard well before it. */
export const MAX_FILE_BYTES = 15 * 1024 * 1024 // 15 MB

/**
 * Decodes an image File into a bitmap so it can be re-encoded at a smaller
 * size. Uses `createImageBitmap` with a fallback to an <img> element.
 */
async function decodeImage(file: File): Promise<{
  image: ImageBitmap | HTMLImageElement
  width: number
  height: number
  useCanvasBacked: boolean
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return { image: bitmap, width: bitmap.width, height: bitmap.height, useCanvasBacked: true }
    } catch {
      // fall through to <img> fallback
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error(`Could not read image "${file.name}".`))
    })
    return { image: img, width: img.naturalWidth, height: img.naturalHeight, useCanvasBacked: false }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Downscales + re-encodes an image File (JPEG) so the Base64 payload sent to
 * Gemini stays small. This is what prevents the "hangs" caused by multi-MB
 * phone photos being sent inline — a typical 3–8 MB photo becomes ~150–300 KB.
 *
 * Non-images are returned unchanged. Images that are already small / cannot be
 * decoded pass through as-is (Gemini will report a clear error for formats it
 * cannot read rather than hanging).
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    const { image, width, height, useCanvasBacked } = await decodeImage(file)

    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height))
    const outWidth = Math.max(1, Math.round(width * scale))
    const outHeight = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = outWidth
    canvas.height = outHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(image as CanvasImageSource, 0, 0, outWidth, outHeight)
    if (useCanvasBacked) (image as ImageBitmap).close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', COMPRESS_QUALITY),
    )
    if (!blob || blob.size >= file.size) return file

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image'
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
  } catch {
    // Unreadable format (e.g. HEIC) — let Gemini reject it with a clear error.
    return file
  }
}

/**
 * Prepares an uploaded File for sending: compresses images, then resolves it
 * as a Base64 data URL. Throws with a readable message if the file is too
 * large to send inline to Gemini.
 */
export async function prepareFileForUpload(file: File): Promise<{
  name: string
  contentType: string
  url: string
}> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Files larger than 15 MB cannot be sent to Gemini. Please use a smaller file or a compressed screenshot.`,
    )
  }
  const prepared = await compressImage(file)
  return {
    name: prepared.name,
    contentType: prepared.type || 'application/octet-stream',
    url: await fileToDataURL(prepared),
  }
}

export type AttachmentInput = {
  name: string
  contentType: string
  url: string
}

/**
 * Converts the selected {@link File}s into the attachment shape used by the
 * chat submit handler (name / contentType / url Base64 data URLs), applying
 * client-side image compression first.
 */
export async function attachmentsFromFiles(files: File[]): Promise<AttachmentInput[]> {
  return Promise.all(files.map((file) => prepareFileForUpload(file)))
}