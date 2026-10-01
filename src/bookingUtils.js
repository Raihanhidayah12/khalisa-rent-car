const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateBookingCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  let code = ''
  for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length]
  return `KHS-${code}`
}

export function toJakartaISOString(date, time) {
  return new Date(`${date}T${time}:00+07:00`).toISOString()
}

export function formatJakartaDateTime(value, options) {
  return new Date(value).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    ...options,
  })
}

export function maskPickupAddress(address) {
  const parts = String(address ?? '').split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) return ''
  const areaIndex = parts.findIndex((part) => /^(Kec\.|Kecamatan|Kota|Kab\.|Kabupaten)/i.test(part))
  if (areaIndex >= 0) return parts.slice(areaIndex).join(', ')
  if (parts.length <= 2) return parts[parts.length - 1]
  return parts.slice(2).join(', ')
}
