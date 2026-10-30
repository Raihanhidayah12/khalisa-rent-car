export function isNegoPrice(price) {
  if (price === null || price === undefined) return true
  const clean = String(price).trim()
  if (!clean || clean === '-' || clean.toLowerCase() === 'nego' || clean === '0') return true
  const num = parseInt(clean.replace(/\./g, ''), 10)
  return !Number.isFinite(num) || num <= 0
}

export function parsePrice(priceStr) {
  if (!priceStr) return 0
  const clean = String(priceStr).replace(/\./g, '').trim()
  if (clean === '-' || clean.toLowerCase() === 'nego') return 0
  const val = parseInt(clean, 10)
  return Number.isFinite(val) ? Math.max(0, val) : 0
}

export function formatPrice(number) {
  if (number === '-' || (typeof number === 'string' && number.trim().toLowerCase() === 'nego')) return 'Nego'
  if (number === null || number === undefined || number === '') return '0'
  const num = typeof number === 'string' ? parsePrice(number) : Number(number)
  if (!Number.isFinite(num)) return '0'
  return num.toLocaleString('id-ID')
}

export function formatDuration(duration, unit) {
  if (unit !== 'jam') return `${duration} ${unit}`

  const hours = Number(duration)
  if (!Number.isFinite(hours)) return `${duration} ${unit}`

  const months = Math.floor(hours / (30 * 24))
  const remainingAfterMonths = hours % (30 * 24)
  const days = Math.floor(remainingAfterMonths / 24)
  const remainingHours = remainingAfterMonths % 24
  const parts = []

  if (months > 0) parts.push(`${months} bulan`)
  if (days > 0) parts.push(`${days} hari`)
  if (remainingHours > 0) parts.push(`${remainingHours} jam`)

  return parts.join(' ') || '0 jam'
}

export function isVehicleReady(vehicle) {
  const status = String(vehicle.status ?? '').trim().toLowerCase()
  if (['booking', 'booked', 'reserved', 'unavailable', 'not ready', 'maintenance', 'perawatan', 'sedang di-booking'].includes(status)) return false
  if (vehicle.is_ready === false || vehicle.is_booked === true || vehicle.is_available === false) return false
  return getAvailableVehicleStock(vehicle) > 0
}

export function getVehicleStock(vehicle) {
  const stock = Number(vehicle.stock ?? vehicle.stok ?? 1)
  return Number.isFinite(stock) ? Math.max(0, stock) : 1
}

export function getAvailableVehicleStock(vehicle) {
  const reserved = Number(vehicle.reserved_units ?? 0)
  return Math.max(0, getVehicleStock(vehicle) - (Number.isFinite(reserved) ? reserved : 0))
}

export function countReadyUnits(vehicles, vehicleName) {
  return vehicles
    .filter((vehicle) => vehicle.name === vehicleName && isVehicleReady(vehicle))
    .reduce((total, vehicle) => total + getAvailableVehicleStock(vehicle), 0)
}

// Cek apakah promo sedang aktif berdasarkan tanggal tertentu (default: sekarang)
export function getActivePromo(vehicle, checkDate = null) {
  if (!vehicle?.promo_price) return null
  const check = checkDate ? new Date(checkDate) : new Date()
  const start = vehicle.promo_start ? new Date(vehicle.promo_start) : null
  const end = vehicle.promo_end ? new Date(vehicle.promo_end) : null
  if (end) end.setHours(23, 59, 59, 999)
  const started = !start || check >= start
  const notExpired = !end || check <= end
  if (started && notExpired) {
    return {
      price: vehicle.promo_price,
      start: vehicle.promo_start,
      end: vehicle.promo_end,
    }
  }
  return null
}

// Cek apakah harga spesial sedang aktif berdasarkan durasi dan mode booking
// Hanya berlaku untuk mode Harian (unit: 'jam', step 12 jam) dengan durasi >= special_min_days * 24 jam
// Karena durasi dikirim dalam satuan jam (12, 24, 36...), minimal 3 hari = 72 jam
export function getActiveSpecial(vehicle, bookingModeUnit = null, durasi = 0) {
  if (!vehicle?.special_price) return null
  // Hanya berlaku untuk mode Harian (unit jam, per 12 jam)
  if (bookingModeUnit !== 'jam') return null
  const minDays = Number(vehicle.special_min_days) || 3
  // durasi dalam satuan jam, jadi minimal hari × 24
  const minJam = minDays * 24
  if (durasi < minJam) return null
  return {
    price: vehicle.special_price,
    label: vehicle.special_label || `Min. ${minDays} hari`,
    minDays,
  }
}

// Kembalikan harga aktif: promo (kalau aktif) atau harga normal
// includeToll: true → pakai vehicle.price, false → pakai vehicle.price_without_toll
// Promo dihitung sebagai diskon flat dari harga dengan tol:
//   diskon = price (dengan tol) - promo_price
//   harga promo tanpa tol = price_without_toll - diskon
export function getActivePriceInfo(vehicle, includeToll = true, checkDate = null, bookingModeUnit = null, durasi = 0) {
  const priceWithToll = vehicle.price
  const priceWithoutToll = vehicle.price_without_toll || vehicle.price
  const basePrice = includeToll ? priceWithToll : priceWithoutToll

  if (isNegoPrice(basePrice)) {
    return {
      price: '-',
      originalPrice: null,
      isPromo: false,
      isSpecial: false,
      isNego: true,
      promoEnd: null,
      discount: 0,
    }
  }

  // Priority 1: Promo
  const promo = getActivePromo(vehicle, checkDate)
  if (promo) {
    const originalWithToll = parsePrice(priceWithToll)
    const promoWithToll = parsePrice(promo.price)
    const discount = originalWithToll - promoWithToll
    const promoWithoutToll = Math.max(0, parsePrice(priceWithoutToll) - discount)
    const activePromoPrice = includeToll
      ? promo.price
      : String(promoWithoutToll).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return {
      price: activePromoPrice,
      originalPrice: basePrice,
      isPromo: true,
      isSpecial: false,
      promoEnd: promo.end,
      discount,
    }
  }

  // Priority 2: Harga Spesial (cek berdasarkan durasi & mode Harian)
  const special = getActiveSpecial(vehicle, bookingModeUnit, durasi)
  if (special) {
    const originalWithToll = parsePrice(priceWithToll)
    const specialWithToll = parsePrice(special.price)
    const discount = originalWithToll - specialWithToll
    const specialWithoutToll = Math.max(0, parsePrice(priceWithoutToll) - discount)
    const activeSpecialPrice = includeToll
      ? special.price
      : String(specialWithoutToll).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return {
      price: activeSpecialPrice,
      originalPrice: basePrice,
      isPromo: false,
      isSpecial: true,
      specialLabel: special.label,
      specialEnd: null,
      discount,
    }
  }

  return {
    price: basePrice,
    originalPrice: null,
    isPromo: false,
    isSpecial: false,
    promoEnd: null,
    discount: 0,
  }
}
