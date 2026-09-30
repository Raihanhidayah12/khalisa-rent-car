export function parsePrice(priceStr) {
  return parseInt(priceStr.replace(/\./g, ''), 10)
}

export function formatPrice(number) {
  return number.toLocaleString('id-ID')
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
