/**
 * Utility functions for file size formatting, client-side image compression,
 * and robust upload validation.
 */

/**
 * Format bytes into human-readable size string (B, KB, MB).
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0 || !Number.isFinite(bytes)) return '0 B'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Compress an image file in the browser using HTML5 Canvas.
 * Dramatically reduces file size of smartphone camera photos (5-20 MB down to ~200-500 KB)
 * while preserving high visual clarity for text, receipts, and vehicles.
 *
 * Non-image files (such as PDF) are returned as-is.
 *
 * @param {File|Blob} file
 * @param {Object} [options]
 * @param {number} [options.maxWidthOrHeight=1920] - Maximum dimension constraint
 * @param {number} [options.quality=0.82] - JPEG/WebP export quality (0-1)
 * @param {string} [options.outputType='image/jpeg'] - Output mime type
 * @returns {Promise<File>}
 */
export async function compressImageFile(file, options = {}) {
  const {
    maxWidthOrHeight = 1920,
    quality = 0.82,
    outputType = 'image/jpeg',
  } = options

  // Return non-image or non-file as-is
  if (!file || typeof window === 'undefined' || !file.type || !file.type.startsWith('image/')) {
    return file
  }

  // Already tiny (< 300 KB), no compression needed
  if (file.size <= 300 * 1024) {
    return file
  }

  return new Promise((resolve) => {
    try {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          try {
            let { width, height } = img

            // Calculate scaled dimensions
            if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
              if (width > height) {
                height = Math.round((height * maxWidthOrHeight) / width)
                width = maxWidthOrHeight
              } else {
                width = Math.round((width * maxWidthOrHeight) / height)
                height = maxWidthOrHeight
              }
            }

            const canvas = document.createElement('canvas')
            canvas.width = Math.max(1, width)
            canvas.height = Math.max(1, height)

            const ctx = canvas.getContext('2d')
            if (!ctx) return resolve(file)

            // Fill solid white background in case source is transparent PNG
            if (outputType === 'image/jpeg' || file.type === 'image/jpeg') {
              ctx.fillStyle = '#FFFFFF'
              ctx.fillRect(0, 0, canvas.width, canvas.height)
            }

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

            canvas.toBlob(
              (blob) => {
                if (!blob || blob.size >= file.size) {
                  // If blob creation failed or compression didn't save size, keep original
                  return resolve(file)
                }

                const baseName = (file.name || 'foto').replace(/\.[^/.]+$/, '')
                const ext = outputType === 'image/webp' ? '.webp' : '.jpg'
                const compressedFile = new File([blob], `${baseName}${ext}`, {
                  type: outputType,
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              },
              outputType,
              quality
            )
          } catch (canvasErr) {
            console.warn('[compressImageFile canvas error]', canvasErr)
            resolve(file)
          }
        }
        img.onerror = () => resolve(file)
        img.src = event.target?.result
      }
      reader.onerror = () => resolve(file)
      reader.readAsDataURL(file)
    } catch (err) {
      console.warn('[compressImageFile error]', err)
      resolve(file)
    }
  })
}

/**
 * Validate file before uploading or accepting in state.
 * Returns clear, human-readable Indonesian error message if invalid.
 *
 * @param {File} file
 * @param {Object} [options]
 * @param {number} [options.maxSizeMB=4.5]
 * @param {string[]} [options.allowedTypes]
 * @param {string} [options.label='bukti pembayaran']
 * @returns {{ valid: boolean, error: string | null, isPdf: boolean, isImage: boolean }}
 */
export function validateUploadFile(file, options = {}) {
  const {
    maxSizeMB = 4.5,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    label = 'bukti pembayaran',
  } = options

  if (!file) {
    return { valid: false, error: `File ${label} belum dipilih.`, isPdf: false, isImage: false }
  }

  const isPdf = file.type === 'application/pdf'
  const isImage = file.type?.startsWith('image/')

  if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Format file tidak didukung (${file.type || 'tipe tidak dikenal'}). Harap gunakan format gambar (JPG, PNG, WEBP) atau PDF.`,
      isPdf,
      isImage,
    }
  }

  const maxBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `Ukuran file ${label} terlalu besar (${formatFileSize(file.size)}). Batas maksimal yang diizinkan adalah ${maxSizeMB} MB. Silakan pilih file yang lebih kecil atau gunakan foto terkompresi.`,
      isPdf,
      isImage,
    }
  }

  return { valid: true, error: null, isPdf, isImage }
}
