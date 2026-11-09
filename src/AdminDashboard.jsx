'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, AlertCircle, Bell, CalendarCheck, CalendarDays, CarFront, Check, CheckCircle2, Clock3, Copy, Download, ExternalLink, FileText, LayoutDashboard, LogOut, MapPin, MessageSquare, Phone, Plus, Receipt, RefreshCw, Search, ShieldCheck, Sparkles, Trash2, UploadCloud, UserCheck, UserRound, Wallet, X, ZoomIn } from 'lucide-react'
import ExcelJS from 'exceljs'
import logo from './assets/Logo-cropped.png'

const logoSrc = logo?.src || logo
import { adminReloadSessionStorageKey, supabase, supabaseAuthStorageKey } from './supabaseClient'
import { formatJakartaDateTime, generateBookingCode, toJakartaISOString } from './bookingUtils'
import { formatDuration, formatPrice, getAvailableVehicleStock, getVehicleStock, isVehicleReady, parsePrice, getActivePromo, isNegoPrice } from './vehicleUtils'
import { compressImageFile, formatFileSize } from './imageUtils'

const emptyVehicleDraft = {
  name: '',
  price: '',
  price_without_toll: '',
  promo_price: '',
  promo_start: '',
  promo_end: '',
  special_price: '',
  special_min_days: 3,
  special_label: '',
  category: 'MPV',
  transmission_options: [],
  transmission_stock: {},
  transmission_details: '',
  powertrain_type: '',
  existing_stock: 0,
  seats: '',
  badge: '',
  image_url: '',
  status: 'ready',
  sort_order: 0,
  is_active: true,
}
const emptyDriverDraft = {
  name: '',
  phone: '',
  status: 'available',
  sim_type: 'SIM A',
  notes: '',
}
const eventTypeOptions = [
  'Pernikahan',
  'Wisuda',
  'Korporat',
  'Ulang Tahun & Lainnya',
  'Lainnya',
]

const eventAddonOptions = [
  { id: 'bunga_segar', label: 'Bunga segar' },
  { id: 'bunga_artif', label: 'Bunga artifisial' },
  { id: 'pita', label: 'Pita dekorasi' },
  { id: 'papan_nama', label: 'Papan nama pengantin' },
  { id: 'balon', label: 'Balon dekorasi' },
  { id: 'kustom', label: 'Kustom / lainnya' },
]

const paymentMethodOptions = [
  'Transfer BCA',
  'Transfer Mandiri',
  'Transfer BRI',
  'Transfer BNI',
  'Transfer BSI',
  'QRIS',
  'Tunai / Cash di Pool',
  'Transfer Bank Lainnya',
]

function getBookingPaymentInfo(booking) {
  if (!booking) return null
  let raw = null
  if (booking.admin_note) {
    try {
      const parsed = typeof booking.admin_note === 'string' ? JSON.parse(booking.admin_note) : booking.admin_note
      if (parsed && typeof parsed === 'object') {
        raw = parsed.payment || parsed
      }
    } catch {
      // not valid JSON
    }
  }
  if (!raw) return null

  const estPrice = Number(booking.estimated_price) || 0
  const isNewSchema = 'type' in raw || 'dp_amount' in raw || 'settlement' in raw

  if (isNewSchema) {
    const totalAmount = Number(raw.total_amount ?? estPrice) || estPrice
    const dpAmount = Number(raw.dp_amount ?? raw.amount ?? 0)
    const remainingAmount = typeof raw.remaining_amount !== 'undefined'
      ? Number(raw.remaining_amount)
      : Math.max(0, totalAmount - dpAmount)
    const isPaid = raw.status === 'paid' || remainingAmount <= 0
    return {
      type: raw.type || (remainingAmount > 0 ? 'dp' : 'full'),
      status: isPaid ? 'paid' : 'partial',
      total_amount: totalAmount,
      dp_amount: dpAmount,
      remaining_amount: isPaid ? 0 : remainingAmount,
      dp_method: raw.dp_method || raw.method || '-',
      dp_sender_name: raw.dp_sender_name || raw.sender_name || booking.customer_name || '-',
      dp_proof_url: raw.dp_proof_url || raw.proof_url || '',
      dp_notes: raw.dp_notes || raw.notes || '',
      dp_at: raw.dp_at || raw.confirmed_at || booking.created_at,
      settlement: raw.settlement || null,
      // Backward compatibility aliases
      method: raw.dp_method || raw.method || '-',
      sender_name: raw.dp_sender_name || raw.sender_name || booking.customer_name || '-',
      amount: dpAmount,
      proof_url: raw.dp_proof_url || raw.proof_url || '',
      notes: raw.dp_notes || raw.notes || '',
      confirmed_at: raw.dp_at || raw.confirmed_at || booking.created_at,
    }
  }

  // Legacy schema: { method, sender_name, amount, proof_url, notes, confirmed_at }
  const legacyAmount = Number(raw.amount) || 0
  const remaining = estPrice > 0 ? Math.max(0, estPrice - legacyAmount) : 0
  const isPaid = remaining <= 0 || legacyAmount >= estPrice
  return {
    type: remaining > 0 ? 'dp' : 'full',
    status: isPaid ? 'paid' : 'partial',
    total_amount: estPrice,
    dp_amount: legacyAmount,
    remaining_amount: isPaid ? 0 : remaining,
    dp_method: raw.method || '-',
    dp_sender_name: raw.sender_name || booking.customer_name || '-',
    dp_proof_url: raw.proof_url || '',
    dp_notes: raw.notes || '',
    dp_at: raw.confirmed_at || booking.created_at,
    settlement: null,
    // Aliases
    method: raw.method || '-',
    sender_name: raw.sender_name || booking.customer_name || '-',
    amount: legacyAmount,
    proof_url: raw.proof_url || '',
    notes: raw.notes || '',
    confirmed_at: raw.confirmed_at || booking.created_at,
  }
}

const emptyBookingDraft = {
  customer_name: '',
  customer_phone: '',
  vehicle_id: '',
  transmission_type: 'automatic',
  booking_mode: 'Sewa mobil lepas kunci',
  event_type: 'Pernikahan',
  event_type_other: '',
  event_addons: [],
  event_addon_custom: '',
  driver_id: '',
  start_date: '',
  start_time: '08:00',
  duration_months: '0',
  duration_days: '1',
  duration_hours_part: '0',
  duration_hours: 24,
  pickup_address: 'Pool Khalisa Rent Car',
  deal_price: '',
  toll_included: false,
  toll_amount: '',
  status: 'confirmed',
  payment_type: 'dp',
  payment_method: 'Transfer BCA',
  payment_sender_name: '',
  payment_amount: '',
  payment_proof_file: null,
  payment_proof_preview: null,
  payment_notes: '',
  notes: '[ORDER VIA WA]',
}
const isEventBooking = (booking) =>
  String(booking?.booking_mode ?? '').toLowerCase().includes('acara') ||
  String(booking?.notes ?? '').includes('[PAKET ACARA')
function parseEventNotes(notes) {
  if (!notes) return { eventType: null, addons: null, catatan: null }
  const lines = notes.split('\n')
  const typeLine = lines.find((l) => l.startsWith('[PAKET ACARA'))
  const addonLine = lines.find((l) => l.startsWith('Add-on:'))
  const catatanLine = lines.find((l) => l.startsWith('Catatan:'))
  const eventType = typeLine ? typeLine.replace(/^\[PAKET ACARA\s*[–-]\s*/i, '').replace(/\]$/, '').trim() : null
  return {
    eventType: eventType ? eventType.charAt(0) + eventType.slice(1).toLowerCase() : null,
    addons: addonLine ? addonLine.replace('Add-on:', '').trim() : null,
    catatan: catatanLine ? catatanLine.replace('Catatan:', '').trim() : null,
  }
}

function formatBookedVehicle(vehicle) {
  const transmission = vehicle.transmission_type === 'automatic' ? 'Matic' : vehicle.transmission_type === 'manual' ? 'Manual' : ''
  const powertrain = { gasoline: 'Bensin', hybrid: 'Hybrid', ev_phev: 'EV / PHEV' }[vehicle.powertrain_type] ?? ''
  const quantity = Number(vehicle.quantity) || 1
  const variant = [transmission, powertrain].filter(Boolean).join(' · ')
  return `${vehicle.name}${variant ? ` (${variant})` : ''}${quantity > 1 ? ` x${quantity}` : ''}`
}

function formatVehicleTransmissionStock(vehicle) {
  const transmissionStock = (vehicle.transmission_options ?? [])
    .map((type) => `${type === 'automatic' ? 'Matic' : 'Manual'} ${Number(vehicle.transmission_stock?.[type]) || 0}`)
    .join(' · ')
  const powertrain = { gasoline: 'Bensin', hybrid: 'Hybrid', ev_phev: 'EV / PHEV' }[vehicle.powertrain_type] ?? ''
  return [transmissionStock, powertrain].filter(Boolean).join(' · ')
}

const driverStatusLabels = {
  available: 'Tersedia / Kosong',
  on_duty: 'Sedang Bertugas',
  off: 'Libur',
}

function cleanPhone(phone) {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  return digits
}

function isDriverBookedForWindow(driverId, booking, bookings) {
  const startAt = Date.parse(booking.start_at)
  const endAt = Date.parse(booking.end_at)
  if (!Number.isFinite(startAt) || !Number.isFinite(endAt)) return true

  return bookings.some((otherBooking) => {
    if (otherBooking.id === booking.id || String(otherBooking.driver_id) !== String(driverId) || !['pending', 'confirmed'].includes(otherBooking.status)) return false
    const otherStartAt = Date.parse(otherBooking.start_at)
    const otherEndAt = Date.parse(otherBooking.end_at)
    return !Number.isFinite(otherStartAt) || !Number.isFinite(otherEndAt) || (otherStartAt < endAt && otherEndAt > startAt)
  })
}

function checkVehicleAvailableInWindow(vehicle, window, bookings, transmissionType = null, rpcAvailability = null) {
  if (!vehicle) return { available: false, remaining: 0, reason: 'Armada tidak valid' }
  if (vehicle.is_active === false) {
    return { available: false, remaining: 0, reason: 'Nonaktif' }
  }
  if (vehicle.status === 'maintenance' || String(vehicle.status || '').toLowerCase().includes('perawatan')) {
    return { available: false, remaining: 0, reason: 'Perawatan / Bengkel' }
  }
  if (!window || !window.start_at || !window.end_at) {
    return { available: true, remaining: 1, reason: 'Tersedia' }
  }

  // 1. Prioritaskan data RPC Supabase bila tersedia
  if (rpcAvailability && rpcAvailability[vehicle.id]) {
    const row = rpcAvailability[vehicle.id]
    const totalRemaining = Math.max(0, (Number(row.stock) || 0) - (Number(row.booked) || 0))
    if (transmissionType && row.transmission_availability?.[transmissionType]) {
      const tRem = Number(row.transmission_availability[transmissionType].remaining) || 0
      if (tRem <= 0 || totalRemaining <= 0) {
        return { available: false, remaining: 0, reason: 'Penuh / Sedang Dipinjam' }
      }
      return { available: true, remaining: Math.min(tRem, totalRemaining), reason: 'Tersedia' }
    }
    if (totalRemaining <= 0) {
      return { available: false, remaining: 0, reason: 'Penuh / Sedang Dipinjam' }
    }
    return { available: true, remaining: totalRemaining, reason: 'Tersedia' }
  }

  // 2. Perhitungan lokal real-time dari array bookings di memori (0ms latency)
  const winStart = Date.parse(window.start_at)
  const winEnd = Date.parse(window.end_at)
  if (!Number.isFinite(winStart) || !Number.isFinite(winEnd)) {
    return { available: true, remaining: 1, reason: 'Tersedia' }
  }

  let bookedCount = 0
  let bookedTypedCount = 0

  for (const b of bookings) {
    if (!['pending', 'confirmed'].includes(b.status)) continue
    const bStart = Date.parse(b.start_at)
    const bEnd = Date.parse(b.end_at)
    if (!Number.isFinite(bStart) || !Number.isFinite(bEnd)) continue
    if (!(bStart < winEnd && bEnd > winStart)) continue

    const snapshot = Array.isArray(b.vehicle_snapshot) ? b.vehicle_snapshot : []
    const vIds = Array.isArray(b.vehicle_ids) ? b.vehicle_ids : []
    const matching = snapshot.filter((item) => String(item.id) === String(vehicle.id))
    const hasId = vIds.some((id) => String(id) === String(vehicle.id))

    if (matching.length > 0) {
      for (const item of matching) {
        const qty = Math.max(1, Number(item.quantity) || 1)
        bookedCount += qty
        if (transmissionType && item.transmission_type === transmissionType) {
          bookedTypedCount += qty
        }
      }
    } else if (hasId) {
      bookedCount += 1
      if (transmissionType) bookedTypedCount += 1
    }
  }

  const totalStock = Math.max(1, Number(vehicle.stock) || 1)
  const transStock = transmissionType && vehicle.transmission_stock?.[transmissionType] != null
    ? Number(vehicle.transmission_stock[transmissionType])
    : totalStock

  const remainingTotal = Math.max(0, totalStock - bookedCount)
  const remainingTyped = Math.max(0, transStock - bookedTypedCount)

  if (transmissionType) {
    if (remainingTyped <= 0 || remainingTotal <= 0) {
      return { available: false, remaining: 0, reason: 'Penuh / Sedang Dipinjam' }
    }
    return { available: true, remaining: Math.min(remainingTyped, remainingTotal), reason: 'Tersedia' }
  }

  if (remainingTotal <= 0) {
    return { available: false, remaining: 0, reason: 'Penuh / Sedang Dipinjam' }
  }
  return { available: true, remaining: remainingTotal, reason: 'Tersedia' }
}

function getDriverCompletedWork(driverId, bookings) {
  const completedBookings = bookings.filter((booking) => booking.driver_id === driverId && booking.status === 'completed')
  const totalHours = completedBookings.reduce((sum, booking) => {
    const startAt = Date.parse(booking.start_at)
    const endAt = Date.parse(booking.end_at)
    return Number.isFinite(startAt) && Number.isFinite(endAt) && endAt > startAt
      ? sum + (endAt - startAt) / (60 * 60 * 1000)
      : sum
  }, 0)

  return { completedCount: completedBookings.length, totalHours }
}

function formatDriverHours(hours) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(hours)
}

function getVehicleCompletedUsage(vehicle, bookings) {
  let completedCount = 0
  let totalHours = 0

  for (const booking of bookings) {
    if (booking.status !== 'completed') continue

    const snapshot = Array.isArray(booking.vehicle_snapshot) ? booking.vehicle_snapshot : []
    const bookingVehicleIds = Array.isArray(booking.vehicle_ids) ? booking.vehicle_ids : []
    const matchingSnapshots = snapshot.filter((item) =>
      item.id != null
        ? String(item.id) === String(vehicle.id)
        : bookingVehicleIds.length === 0 && item.name === vehicle.name
    )
    const hasVehicleId = bookingVehicleIds.some((id) => String(id) === String(vehicle.id))
    if (matchingSnapshots.length === 0 && !hasVehicleId) continue

    completedCount += 1
    const startAt = Date.parse(booking.start_at)
    const endAt = Date.parse(booking.end_at)
    if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt <= startAt) continue

    const unitCount = matchingSnapshots.length > 0
      ? matchingSnapshots.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0)
      : 1
    totalHours += ((endAt - startAt) / (60 * 60 * 1000)) * unitCount
  }

  return { completedCount, totalHours }
}

async function releaseExpiredDrivers(drivers, bookings) {
  const now = Date.now()
  const driverIds = drivers
    .filter((driver) => {
      if (driver.status !== 'on_duty') return false
      const assignments = bookings.filter((booking) => booking.driver_id === driver.id)
      const hasEndedAssignment = assignments.some((booking) =>
        booking.status === 'completed' && Number.isFinite(Date.parse(booking.end_at)) && Date.parse(booking.end_at) <= now
      )
      const hasActiveAssignment = assignments.some((booking) => ['pending', 'confirmed'].includes(booking.status))
      return hasEndedAssignment && !hasActiveAssignment
    })
    .map((driver) => driver.id)

  if (driverIds.length === 0) return drivers

  const { data, error } = await supabase
    .from('drivers')
    .update({ status: 'available' })
    .in('id', driverIds)
    .eq('status', 'on_duty')
    .select('*')

  if (error || !data) return drivers
  const updatedDrivers = new Map(data.map((driver) => [driver.id, driver]))
  return drivers.map((driver) => updatedDrivers.get(driver.id) ?? driver)
}

const promoBadgeOptions = ['', 'Promo', 'Favorit', 'Harga spesial']
const bookingStatusLabels = {
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  completed: 'Selesai',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getJakartaDateKey(value) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const dateParts = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]))
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`
}

function shiftDateKey(dateKey, dayOffset) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + dayOffset)
  return toDateKey(date)
}

function getFinanceDateRange(period, todayKey, monthKey, startDate, endDate) {
  if (period === 'all') return null
  if (period === 'custom') return { start: startDate, end: endDate }
  if (period === 'last7' || period === 'last30' || period === 'last90') {
    const dayCount = Number(period.slice(4))
    return { start: shiftDateKey(todayKey, 1 - dayCount), end: todayKey }
  }
  if (period === 'previousMonth') {
    const end = shiftDateKey(`${monthKey}-01`, -1)
    return { start: `${end.slice(0, 7)}-01`, end }
  }

  const [year, month] = monthKey.split('-').map(Number)
  return { start: `${monthKey}-01`, end: toDateKey(new Date(year, month, 0)) }
}

const tabMeta = {
  finance: { kicker: 'RINGKASAN', title: 'Ikhtisar', description: 'Pantau estimasi nilai booking dan kondisi operasional hari ini.' },
  bookings: { kicker: 'RESERVASI', title: 'Booking', description: 'Kelola permintaan booking, status, dan penugasan supir.' },
  schedule: { kicker: 'KETERSEDIAAN', title: 'Cek Jadwal Ready', description: 'Cek ketersediaan unit armada dan supir secara instan untuk merespons pertanyaan calon penyewa via WhatsApp.' },
  fleet: { kicker: 'KATALOG UNIT', title: 'Armada', description: 'Ikhtisar dan kelola armada aktif PT Khalisa Sumber Rezeki.' },
  drivers: { kicker: 'TIM PENGEMUDI', title: 'Kelola supir', description: 'Pantau ketersediaan, penugasan, dan status supir operasional.' },
  admins: { kicker: 'AKSES TIM', title: 'Akun admin', description: 'Buat akun terpisah untuk anggota tim administrator.' },
}
const primaryAdminEmail = 'pt.khalisasumberrezekii@gmail.com'

const financePeriodOptions = [
  { id: 'last7', label: '7 hari' },
  { id: 'last30', label: '30 hari' },
  { id: 'last90', label: '90 hari' },
  { id: 'month', label: 'Bulan ini' },
  { id: 'previousMonth', label: 'Bulan lalu' },
  { id: 'all', label: 'Semua' },
  { id: 'custom', label: 'Pilih tanggal' },
]

function formatDateLabel(dateKey) {
  if (!dateKey) return ''
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function bookingStatusTone(status) {
  if (status === 'pending') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (status === 'confirmed') return 'border-sky-200 bg-sky-50 text-sky-800'
  if (status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (status === 'rejected') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-600'
}

function driverStatusTone(status) {
  if (status === 'available') return 'border-emerald-300 bg-emerald-50 text-emerald-800'
  if (status === 'on_duty') return 'border-blue-300 bg-blue-50 text-blue-800'
  return 'border-slate-300 bg-slate-100 text-slate-700'
}

function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime)
    gain1.gain.setValueAtTime(0, ctx.currentTime)
    gain1.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.04)
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.35)

    // Tone 2: A5 (880 Hz) with short delay
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12)
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.12)
    gain2.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 0.16)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(ctx.currentTime + 0.12)
    osc2.stop(ctx.currentTime + 0.55)
  } catch (err) {
    console.warn('[notification sound error]', err)
  }
}

function sendDesktopNotification(title, body) {
  playNotificationSound()
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon: '/favicon.png',
        badge: '/favicon.png',
      })
      notif.onclick = () => {
        window.focus()
        notif.close()
      }
    } catch (e) {
      console.warn('[Notification error]', e)
    }
  }
}

function StatCard({ label, value, tone = 'neutral', onClick, active = false }) {
  const barTone = {
    neutral: 'before:bg-line',
    success: 'before:bg-emerald-500',
    info: 'before:bg-sky-500',
    warn: 'before:bg-amber-500',
    accent: 'before:bg-cyan',
  }
  const valueTone = {
    neutral: 'text-ink',
    success: 'text-emerald-800',
    info: 'text-sky-800',
    warn: 'text-amber-800',
    accent: 'text-ink',
  }
  const labelTone = {
    neutral: 'text-muted',
    success: 'text-emerald-700',
    info: 'text-sky-700',
    warn: 'text-amber-700',
    accent: 'text-[#0369a1]',
  }

  const isRupiah = typeof value === 'string' && value.startsWith('Rp ')
  const cleanValue = isRupiah ? value.slice(3) : value

  const strVal = String(value ?? '')
  const isLong = strVal.length > 15
  const isMedium = strVal.length > 10

  const content = (
    <>
      <span className={`block truncate text-[.68rem] font-semibold ${labelTone[tone]}`} title={label}>
        {label}
      </span>
      <strong
        className={`mt-2 block font-display font-extrabold tracking-tight whitespace-nowrap truncate ${
          isLong
            ? 'text-[1.05rem] sm:text-[1.2rem] xl:text-[1.35rem]'
            : isMedium
            ? 'text-[1.15rem] sm:text-[1.32rem] xl:text-[1.5rem]'
            : 'text-[1.25rem] sm:text-[1.45rem] xl:text-[1.65rem]'
        } ${valueTone[tone]}`}
        title={strVal}
      >
        {isRupiah ? (
          <>
            <span className="text-[.72em] font-bold text-muted/75 mr-1 select-none">Rp</span>
            <span>{cleanValue}</span>
          </>
        ) : (
          value
        )}
      </strong>
    </>
  )
  const className = `relative min-w-0 overflow-hidden rounded-2xl border bg-white p-3.5 pl-4.5 sm:p-5 sm:pl-6 shadow-[0_8px_24px_rgba(15,23,42,.04)] transition-[box-shadow,border-color] hover:shadow-[0_10px_28px_rgba(15,23,42,.08)] before:absolute before:inset-y-0 before:left-0 before:w-1 ${barTone[tone]} ${active ? 'border-cyan ring-2 ring-cyan/15' : 'border-line'}`

  if (onClick) {
    return <button className={`${className} w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2`} type="button" aria-pressed={active} onClick={onClick}>{content}</button>
  }

  return <article className={`${className} transition-shadow`}>{content}</article>
}

function AdminNavButton({ active, icon, label, count, alert, onClick }) {
  return (
    <button
      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[.8rem] font-semibold transition-all duration-200 ${active ? 'bg-white text-ink shadow-md' : 'text-white/72 hover:translate-x-0.5 hover:bg-white/10 hover:text-white'}`}
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {active && <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-crimson" aria-hidden="true" />}
      <span className={`shrink-0 transition-colors ${active ? 'text-crimson' : 'text-white/60 group-hover:text-cyan'}`}>{icon}</span>
      <span className="flex-1">{label}</span>
      {alert > 0 ? (
        <span className="rounded-full bg-crimson px-2 py-0.5 text-[.62rem] font-bold text-white shadow-sm">{alert}</span>
      ) : count != null ? (
        <span className={`rounded-full px-2 py-0.5 text-[.64rem] font-bold ${active ? 'bg-slate-ice text-muted' : 'bg-white/10 text-white/80'}`}>
          {count}
        </span>
      ) : null}
    </button>
  )
}

const fieldClass = 'h-10 w-full min-w-0 rounded-xl border border-line bg-white px-3 text-[.8rem] text-ink outline-none transition-colors focus:border-cyan'
const panelClass = 'animate-tab-fade overflow-hidden rounded-2xl border border-line bg-white shadow-[0_8px_24px_rgba(15,23,42,.04)]'
const toolbarClass = 'flex min-w-0 flex-1 flex-wrap justify-end gap-2 max-[600px]:w-full max-[600px]:flex-none'

function PanelMessage({ children, tone = 'muted' }) {
  const className = tone === 'error'
    ? 'm-0 px-5 py-10 text-center text-[.82rem] text-red-700'
    : tone === 'warn'
      ? 'm-0 px-5 py-10 text-center text-[.82rem] text-amber-800'
      : 'm-0 px-5 py-10 text-center text-[.82rem] text-muted'
  return <p className={className} role={tone === 'error' || tone === 'warn' ? 'alert' : 'status'}>{children}</p>
}

function SearchField({ value, onChange, placeholder, label }) {
  return (
    <label className="flex h-10 min-w-[150px] max-w-[270px] flex-1 items-center gap-2 rounded-xl border border-line bg-slate-ice/70 px-3 focus-within:border-cyan max-[600px]:max-w-none">
      <Search className="shrink-0 text-muted" size={15} aria-hidden="true" />
      <input className="min-w-0 flex-1 border-0 bg-transparent text-[.76rem] outline-none placeholder:text-[#94a3b8]" type="search" value={value} onChange={onChange} placeholder={placeholder} aria-label={label} />
    </label>
  )
}

function FilterChip({ active, onClick, children, count }) {
  return (
    <button
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[.72rem] font-semibold transition-colors ${
        active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted hover:border-cyan/50 hover:text-ink'
      }`}
      type="button"
      onClick={onClick}
    >
      {children}
      {count != null && (
        <span className={`rounded-full px-1.5 py-px text-[.62rem] font-bold ${active ? 'bg-white/20 text-white' : 'bg-slate-ice text-muted'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="grid justify-items-center gap-2 px-5 py-14 text-center" role="status">
      <span className="grid size-12 place-items-center rounded-2xl bg-slate-ice text-muted">{icon}</span>
      <p className="m-0 text-[.86rem] font-semibold text-ink">{title}</p>
      {description && <p className="mb-0 mt-0 max-w-[340px] text-[.76rem] leading-5 text-muted">{description}</p>}
    </div>
  )
}

function QuickJump({ icon, label, value, tone = 'neutral', onClick }) {
  const tones = {
    neutral: 'hover:border-cyan/40 hover:shadow-[0_12px_28px_rgba(15,23,42,.08)]',
    warn: 'border-amber-200 bg-amber-50 hover:border-amber-300 hover:shadow-[0_12px_28px_rgba(217,119,6,.15)]',
    success: 'border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:shadow-[0_12px_28px_rgba(5,150,105,.15)]',
    info: 'border-sky-200 bg-sky-50 hover:border-sky-300 hover:shadow-[0_12px_28px_rgba(2,132,199,.15)]',
  }
  return (
    <button
      className={`group flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-left shadow-[0_8px_24px_rgba(15,23,42,.04)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${tones[tone]}`}
      type="button"
      onClick={onClick}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-ink shadow-sm transition-transform group-hover:scale-105">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[.65rem] font-semibold text-muted">{label}</span>
        <strong className="block truncate font-display text-[1.05rem] font-extrabold text-ink">{value}</strong>
      </span>
      <ArrowUpRight className="shrink-0 text-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" size={15} aria-hidden="true" />
    </button>
  )
}

function extractBookingId(val) {
  if (!val) return ''
  if (typeof val === 'object' && val !== null) {
    if (val.id) return extractBookingId(val.id)
  }
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (trimmed.startsWith('{') && trimmed.includes('"id"')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (parsed && parsed.id) return extractBookingId(parsed.id)
      } catch {}
    }
    return trimmed
  }
  return String(val)
}

function BookingStatusSelect({ booking, onChange }) {
  const bookingId = extractBookingId(booking?.id || booking)
  const isActive = ['pending', 'confirmed'].includes(booking.status)
  const endPassed = booking.end_at ? new Date() >= new Date(booking.end_at) : true
  const canComplete = booking.status === 'confirmed' && endPassed

  const statusToneClass = booking.status === 'confirmed'
    ? 'border-blue-300 bg-blue-50/60 text-blue-900 font-semibold'
    : booking.status === 'pending'
    ? 'border-amber-300 bg-amber-50/60 text-amber-900 font-semibold'
    : 'border-line bg-white text-ink font-medium'

  return (
    <div className="grid gap-1">
      <select
        className={`h-8 w-full min-w-[136px] rounded-lg border px-2 text-[.72rem] outline-none transition-colors focus:border-cyan ${statusToneClass}`}
        value={booking.status}
        title={booking.status === 'confirmed' && !endPassed ? `Bisa diselesaikan setelah ${new Date(booking.end_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : undefined}
        disabled={!isActive}
        aria-label={`Status booking ${booking.customer_name}`}
        onChange={(event) => onChange(bookingId, event.target.value)}
      >
        <option value="pending" disabled={booking.status !== 'pending'}>Menunggu</option>
        <option value="confirmed" disabled={booking.status !== 'pending'}>Dikonfirmasi</option>
        <option value="completed" disabled={!canComplete}>Selesai</option>
        <option value="rejected" disabled={!isActive}>Ditolak</option>
        <option value="cancelled" disabled={!isActive}>Dibatalkan</option>
      </select>
      {booking.status === 'confirmed' && !endPassed && booking.end_at && (
        <span className="text-[.61rem] leading-tight text-slate-400">
          Selesai: {new Date(booking.end_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  )
}

function CustomerContact({ booking }) {
  const waNumber = cleanPhone(booking.customer_phone)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {waNumber ? (
        <a
          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[.7rem] font-medium text-emerald-700 hover:bg-emerald-100 hover:underline transition-colors whitespace-nowrap"
          href={`https://wa.me/${waNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Chat WhatsApp pemesan"
        >
          <MessageSquare size={11} aria-hidden="true" />
          <span>{booking.customer_phone}</span>
        </a>
      ) : (
        <a
          className="inline-flex items-center gap-1 text-[.7rem] text-muted hover:text-cyan whitespace-nowrap"
          href={`tel:${booking.customer_phone}`}
        >
          <Phone size={11} aria-hidden="true" />
          <span>{booking.customer_phone}</span>
        </a>
      )}
    </div>
  )
}

function DriverAssignControls({ booking, bookings, drivers, onAssign }) {
  const assignedDriver = drivers.find((driver) => driver.id === booking.driver_id)
  const isWithDriver = String(booking.booking_mode ?? '').toLowerCase().includes('supir') || isEventBooking(booking)
  const isClosed = ['cancelled', 'rejected', 'completed'].includes(booking.status)

  if (!isWithDriver) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[.65rem] font-medium text-slate-500 whitespace-nowrap">
        <span className="size-1.5 rounded-full bg-slate-400" />
        Lepas kunci
      </span>
    )
  }

  if (isClosed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[.65rem] font-medium text-slate-600 whitespace-nowrap">
        <span className="size-1.5 rounded-full bg-slate-400" />
        {assignedDriver ? assignedDriver.name : 'Tanpa supir'}
      </span>
    )
  }

  return (
    <div className="grid gap-1">
      {!assignedDriver && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[.63rem] font-bold text-amber-800 animate-pulse">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Perlu supir
        </span>
      )}
      <select
        className={`h-8 w-full min-w-[142px] truncate rounded-lg border px-2 text-[.72rem] font-medium outline-none transition-colors ${
          assignedDriver ? 'border-blue-200 bg-blue-50/50 text-blue-900 focus:border-blue-500' : 'border-line bg-white text-ink focus:border-cyan'
        }`}
        value={booking.driver_id ?? ''}
        aria-label={`Penugasan supir untuk ${booking.customer_name}`}
        onChange={(event) => onAssign(extractBookingId(booking?.id || booking), event.target.value)}
      >
        <option value="">{assignedDriver ? '-- Lepas supir --' : '-- Pilih supir --'}</option>
        {drivers.map((driver) => {
          const isBusy = isDriverBookedForWindow(driver.id, booking, bookings)
          const tag = driver.status === 'off' ? ' (Libur)' : isBusy ? ' (Bentrok)' : ''
          return (
            <option
              key={driver.id}
              value={driver.id}
              disabled={driver.id !== booking.driver_id && (driver.status === 'off' || isBusy)}
            >
              {driver.name}{tag}
            </option>
          )
        })}
      </select>
      {assignedDriver && (
        <a
          className="inline-flex items-center gap-1 text-[.67rem] font-semibold text-emerald-700 hover:underline"
          href={`https://wa.me/${cleanPhone(assignedDriver.phone)}?text=${encodeURIComponent(
            `Halo ${assignedDriver.name}, tugas jalan Khalisa Rent Car:\n` +
            `Tamu: ${booking.customer_name} (${booking.customer_phone})\n` +
            `Waktu: ${formatJakartaDateTime(booking.start_at, { day: 'numeric', month: 'long', year: 'numeric' })} jam ${formatJakartaDateTime(booking.start_at, { hour: '2-digit', minute: '2-digit' })}\n` +
            `Alamat Jemput: ${booking.pickup_address}\n` +
            `Armada: ${(booking.vehicle_snapshot ?? []).map(formatBookedVehicle).join(', ')}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Kirim rincian penugasan ke WhatsApp supir"
        >
          <MessageSquare size={11} aria-hidden="true" />
          Kirim ke supir
        </a>
      )}
    </div>
  )
}

async function getFunctionErrorMessage(error, fallback) {
  if (error.context && typeof error.context.json === 'function') {
    const responseBody = await error.context.json().catch(() => null)
    if (responseBody?.error) return responseBody.error
  }
  if (error.name === 'FunctionsFetchError' || /Failed to send a request to the Edge Function|CORS/i.test(error.message ?? '')) return fallback
  return error.message || fallback
}

function AdminAccountsPanel() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [admins, setAdmins] = useState([])
  const [loadingAdmins, setLoadingAdmins] = useState(true)
  const [adminListError, setAdminListError] = useState('')
  const [deletingAdminId, setDeletingAdminId] = useState('')

  async function loadAdmins() {
    try {
      const { data, error } = await supabase.functions.invoke('manage-admins', { body: { action: 'list' } })
      if (error) {
        setAdminListError(await getFunctionErrorMessage(error, 'Daftar admin gagal dimuat. Deploy Edge Function manage-admins.'))
      } else {
        setAdmins(data?.admins ?? [])
        setAdminListError('')
      }
    } catch {
      setAdminListError('Daftar admin gagal dimuat. Coba lagi atau periksa koneksi.')
    } finally {
      setLoadingAdmins(false)
    }
  }

  useEffect(() => {
    loadAdmins()
  }, [])

  async function handleDeleteAdmin(admin) {
    if (admin.is_primary || admin.is_current_user) return
    if (!window.confirm(`Hapus akses admin untuk ${admin.email}?`)) return

    setDeletingAdminId(admin.id)
    setAdminListError('')
    try {
      const { error } = await supabase.functions.invoke('manage-admins', {
        body: { action: 'delete', userId: admin.id },
      })
      if (error) {
        setAdminListError(await getFunctionErrorMessage(error, 'Akun admin gagal dihapus.'))
        return
      }
      setAdmins((current) => current.filter((account) => account.id !== admin.id))
    } catch {
      setAdminListError('Akun admin gagal dihapus. Coba lagi.')
    } finally {
      setDeletingAdminId('')
    }
  }

  async function handleCreateAdmin(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const normalizedEmail = email.trim().toLowerCase()
    if (password.length < 12) {
      setErrorMessage('Kata sandi harus terdiri dari minimal 12 karakter.')
      return
    }
    if (password !== passwordConfirmation) {
      setErrorMessage('Konfirmasi kata sandi belum cocok.')
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-admin', {
        body: { email: normalizedEmail, password },
      })

      if (error) {
        setErrorMessage(await getFunctionErrorMessage(error, 'Akun admin gagal dibuat. Pastikan Edge Function create-admin sudah di-deploy.'))
        return
      }
      if (data?.error) {
        setErrorMessage(data.error)
        return
      }

      setSuccessMessage(`Akun admin ${data.email ?? normalizedEmail} berhasil dibuat.`)
      setEmail('')
      setPassword('')
      setPasswordConfirmation('')
      setLoadingAdmins(true)
      await loadAdmins()
    } catch {
      setErrorMessage('Akun admin gagal dibuat. Coba lagi atau periksa koneksi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={`${panelClass} max-w-[760px]`} aria-labelledby="admin-account-title">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-cyan/10 text-cyan"><ShieldCheck size={19} aria-hidden="true" /></span>
        <div>
          <h2 className="m-0 font-display text-[.98rem] font-bold" id="admin-account-title">Tambah akun admin</h2>
          <p className="mb-0 mt-1 text-[.74rem] leading-5 text-muted">Setiap admin menggunakan email dan kata sandi sendiri.</p>
        </div>
      </div>

      <form className="grid gap-4 p-5 sm:max-w-[620px] sm:p-6" onSubmit={handleCreateAdmin}>
        <label className="grid min-w-0 gap-1.5">
          <span className="text-[.72rem] font-bold text-ink">Email admin</span>
          <input className={fieldClass} type="email" autoComplete="off" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@perusahaan.com" />
        </label>
        <label className="grid min-w-0 gap-1.5">
          <span className="text-[.72rem] font-bold text-ink">Kata sandi</span>
          <input className={fieldClass} type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 12 karakter" />
        </label>
        <label className="grid min-w-0 gap-1.5">
          <span className="text-[.72rem] font-bold text-ink">Konfirmasi kata sandi</span>
          <input className={fieldClass} type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Ulangi kata sandi" />
        </label>

        {errorMessage && <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[.76rem] leading-5 text-red-700" role="alert">{errorMessage}</p>}
        {successMessage && <p className="m-0 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[.76rem] leading-5 text-emerald-800" role="status"><Check className="mt-0.5 shrink-0" size={15} aria-hidden="true" />{successMessage}</p>}

        <button className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-crimson px-4 text-[.78rem] font-bold text-white transition-colors hover:bg-crimson-deep disabled:cursor-wait disabled:opacity-60 sm:w-fit" type="submit" disabled={submitting}>
          <Plus size={16} aria-hidden="true" />{submitting ? 'Membuat akun...' : 'Buat akun admin'}
        </button>
      </form>

      <div className="border-t border-line">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <div>
            <h3 className="m-0 font-display text-[.9rem] font-bold">Admin terdaftar</h3>
            <p className="mb-0 mt-1 text-[.7rem] text-muted">Akun utama dan akun yang sedang digunakan tidak dapat dihapus.</p>
          </div>
          <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-[.72rem] font-bold text-muted transition-colors hover:border-cyan/40 hover:text-cyan disabled:opacity-50" type="button" onClick={() => { setAdminListError(''); setLoadingAdmins(true); loadAdmins() }} disabled={loadingAdmins}>
            <RefreshCw className={loadingAdmins ? 'animate-spin' : ''} size={14} aria-hidden="true" />Muat ulang
          </button>
        </div>

        {adminListError ? (
          <PanelMessage tone="error">{adminListError}</PanelMessage>
        ) : loadingAdmins ? (
          <PanelMessage>Memuat akun admin...</PanelMessage>
        ) : admins.length === 0 ? (
          <EmptyState icon={<ShieldCheck size={20} aria-hidden="true" />} title="Belum ada akun admin" />
        ) : (
          <div className="grid gap-2 border-t border-line p-4 sm:p-5">
            {admins.map((admin) => {
              const protectedAccount = admin.is_primary || admin.is_current_user
              const initial = (admin.email || 'A').charAt(0).toUpperCase()
              return (
                <article className="flex min-w-0 flex-col justify-between gap-3 rounded-xl border border-line bg-white p-3.5 transition-shadow hover:shadow-xs sm:flex-row sm:items-center" key={admin.id}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-slate-ice font-bold text-slate-700 text-[.82rem]">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <strong className="block break-all text-[.78rem] font-semibold text-ink">{admin.email}</strong>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[.63rem] font-bold ${
                          admin.is_primary ? 'border-purple-200 bg-purple-50 text-purple-700' : admin.is_current_user ? 'border-cyan/30 bg-cyan/10 text-cyan' : 'border-slate-200 bg-slate-100 text-slate-600'
                        }`}>
                          {admin.is_primary ? 'Super Admin' : admin.is_current_user ? 'Sesi Aktif' : 'Admin'}
                        </span>
                        <span className="text-[.67rem] text-muted">
                          Dibuat {formatJakartaDateTime(admin.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line px-3 text-[.72rem] font-bold text-muted transition-colors hover:border-red-200 hover:text-crimson disabled:cursor-not-allowed disabled:opacity-45"
                    type="button"
                    disabled={protectedAccount || deletingAdminId === admin.id}
                    onClick={() => handleDeleteAdmin(admin)}
                    aria-label={`Hapus akun ${admin.email}`}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    {deletingAdminId === admin.id ? 'Menghapus...' : protectedAccount ? 'Dilindungi' : 'Hapus'}
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function ScheduleCheckerPanel({
  vehicles,
  loadingVehicles,
  bookings,
  loadingBookings,
  drivers,
  loadingDrivers,
  scheduleDate,
  setScheduleDate,
  scheduleTime,
  setScheduleTime,
  scheduleDurationHours,
  setScheduleDurationHours,
  scheduleWindow,
  scheduleVehicleAvailability,
  calculateVehicleRate,
  onOpenBookingForm,
}) {
  const [subTab, setSubTab] = useState('ready') // 'ready' | 'occupied' | 'drivers' | 'wa'
  const [categoryFilter, setCategoryFilter] = useState('all') // 'all' | 'MPV' | 'Premium' | 'Rombongan'
  const [transmissionFilter, setTransmissionFilter] = useState('all') // 'all' | 'automatic' | 'manual'
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedWA, setCopiedWA] = useState(false)
  const [copiedSingleId, setCopiedSingleId] = useState(null)
  const [durMonths, setDurMonths] = useState(() => String(Math.floor((Number(scheduleDurationHours) || 24) / (30 * 24))))
  const [durDays, setDurDays] = useState(() => String(Math.floor(((Number(scheduleDurationHours) || 24) % (30 * 24)) / 24)))
  const [durHours, setDurHours] = useState(() => String(((Number(scheduleDurationHours) || 24) % (30 * 24)) % 24))

  useEffect(() => {
    const total = Number(scheduleDurationHours) || 24
    const m = Math.floor(total / (30 * 24))
    const remM = total % (30 * 24)
    const d = Math.floor(remM / 24)
    const h = remM % 24
    setDurMonths(String(m))
    setDurDays(String(d))
    setDurHours(String(h))
  }, [scheduleDurationHours])

  const updateDurationParts = (mVal, dVal, hVal) => {
    setDurMonths(mVal)
    setDurDays(dVal)
    setDurHours(hVal)
    const m = Math.max(0, parseInt(mVal, 10) || 0)
    const d = Math.max(0, parseInt(dVal, 10) || 0)
    const h = Math.max(0, parseInt(hVal, 10) || 0)
    const total = m * 30 * 24 + d * 24 + h
    setScheduleDurationHours(Math.max(1, total))
  }

  const todayKey = getJakartaDateKey(new Date()) || toDateKey(new Date())
  const tomorrowKey = shiftDateKey(todayKey, 1)
  const dayAfterKey = shiftDateKey(todayKey, 2)

  const durationPresets = [
    { label: '12 Jam', hours: 12 },
    { label: '1 Hari', hours: 24 },
    { label: '2 Hari', hours: 48 },
    { label: '3 Hari', hours: 72 },
    { label: '4 Hari', hours: 96 },
    { label: '1 Minggu', hours: 168 },
    { label: '1 Bulan', hours: 720 },
  ]

  const durationLabel = useMemo(() => {
    const hrs = Number(scheduleDurationHours) || 24
    const d = Math.floor(hrs / 24)
    const remH = hrs % 24
    if (d > 0 && remH === 0) return `${d} Hari (${hrs} Jam)`
    if (d > 0) return `${d} Hari ${remH} Jam`
    return `${hrs} Jam`
  }, [scheduleDurationHours])

  const activeVehicles = useMemo(() => {
    return vehicles.filter((v) => v.is_active !== false)
  }, [vehicles])

  const evaluatedVehicles = useMemo(() => {
    if (!scheduleWindow) return []
    return activeVehicles.map((vehicle) => {
      const overallCheck = checkVehicleAvailableInWindow(
        vehicle,
        scheduleWindow,
        bookings,
        null,
        scheduleVehicleAvailability
      )
      const hasMatic = (vehicle.transmission_options || []).includes('automatic')
      const hasManual = (vehicle.transmission_options || []).includes('manual')

      const maticCheck = hasMatic
        ? checkVehicleAvailableInWindow(vehicle, scheduleWindow, bookings, 'automatic', scheduleVehicleAvailability)
        : null
      const manualCheck = hasManual
        ? checkVehicleAvailableInWindow(vehicle, scheduleWindow, bookings, 'manual', scheduleVehicleAvailability)
        : null

      const rate = calculateVehicleRate(vehicle, scheduleDurationHours, false)

      let latestEndAt = null
      let conflicts = []
      if (!overallCheck.available) {
        conflicts = bookings.filter((b) => {
          if (String(b.vehicle_id) !== String(vehicle.id)) return false
          if (!['pending', 'confirmed'].includes(b.status)) return false
          const bStart = Date.parse(b.start_at)
          const bEnd = Date.parse(b.end_at)
          const winStart = Date.parse(scheduleWindow.start_at)
          const winEnd = Date.parse(scheduleWindow.end_at)
          return Number.isFinite(bStart) && Number.isFinite(bEnd) && bStart < winEnd && bEnd > winStart
        })
        for (const b of conflicts) {
          const eMs = Date.parse(b.end_at)
          if (Number.isFinite(eMs) && (!latestEndAt || eMs > Date.parse(latestEndAt))) {
            latestEndAt = b.end_at
          }
        }
      }

      return {
        vehicle,
        overallCheck,
        maticCheck,
        manualCheck,
        rate,
        isAvailable: overallCheck.available,
        conflicts,
        latestEndAt,
      }
    })
  }, [activeVehicles, scheduleWindow, bookings, scheduleVehicleAvailability, scheduleDurationHours, calculateVehicleRate])

  const readyVehicles = useMemo(() => {
    return evaluatedVehicles
      .filter((item) => item.isAvailable)
      .filter((item) => {
        const v = item.vehicle
        if (categoryFilter !== 'all' && v.category !== categoryFilter) return false
        if (transmissionFilter === 'automatic' && (!item.maticCheck || !item.maticCheck.available)) return false
        if (transmissionFilter === 'manual' && (!item.manualCheck || !item.manualCheck.available)) return false
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matchName = String(v.name || '').toLowerCase().includes(q)
          const matchCat = String(v.category || '').toLowerCase().includes(q)
          if (!matchName && !matchCat) return false
        }
        return true
      })
  }, [evaluatedVehicles, categoryFilter, transmissionFilter, searchQuery])

  const occupiedVehicles = useMemo(() => {
    return evaluatedVehicles
      .filter((item) => !item.isAvailable)
      .filter((item) => {
        const v = item.vehicle
        if (categoryFilter !== 'all' && v.category !== categoryFilter) return false
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matchName = String(v.name || '').toLowerCase().includes(q)
          const matchCat = String(v.category || '').toLowerCase().includes(q)
          if (!matchName && !matchCat) return false
        }
        return true
      })
  }, [evaluatedVehicles, categoryFilter, searchQuery])

  const evaluatedDrivers = useMemo(() => {
    if (!scheduleWindow) return []
    return drivers.map((driver) => {
      const isOff = driver.status === 'off'
      const isBusy = isDriverBookedForWindow(driver.id, scheduleWindow, bookings)
      const assignedBooking = isBusy
        ? bookings.find((b) => {
            if (String(b.driver_id) !== String(driver.id)) return false
            if (!['pending', 'confirmed'].includes(b.status)) return false
            const bStart = Date.parse(b.start_at)
            const bEnd = Date.parse(b.end_at)
            const winStart = Date.parse(scheduleWindow.start_at)
            const winEnd = Date.parse(scheduleWindow.end_at)
            return Number.isFinite(bStart) && Number.isFinite(bEnd) && bStart < winEnd && bEnd > winStart
          })
        : null
      return {
        driver,
        isOff,
        isBusy,
        assignedBooking,
      }
    })
  }, [drivers, scheduleWindow, bookings])

  const availableDriversCount = evaluatedDrivers.filter((d) => !d.isBusy && !d.isOff).length

  // Generate WhatsApp reply text
  const waReplyText = useMemo(() => {
    if (!scheduleWindow) return ''
    const startFormatted = formatJakartaDateTime(scheduleWindow.start_at, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    const endFormatted = formatJakartaDateTime(scheduleWindow.end_at, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const lines = []
    lines.push('Halo Kak! Terima kasih sudah menghubungi PT Khalisa Rent Car Padang 🙏')
    lines.push('')
    lines.push('Berikut ketersediaan unit untuk jadwal sewa:')
    lines.push(`📅 Mulai: ${startFormatted} WIB`)
    lines.push(`🏁 Selesai: ${endFormatted} WIB`)
    lines.push(`⏱️ Durasi: ${durationLabel}`)
    lines.push('')

    const readyAllForWA = evaluatedVehicles.filter((it) => it.isAvailable)
    if (readyAllForWA.length === 0) {
      lines.push('Mohon maaf Kak, untuk rentang jadwal tersebut seluruh armada kami sedang penuh / terisi jadwal sewa.')
      lines.push('Boleh diinfokan jika ada tanggal atau jam alternatif agar kami bantu cek ulang ya Kak. 🙏')
    } else {
      lines.push(`Daftar armada yang READY & siap jalan (${readyAllForWA.length} unit):`)
      readyAllForWA.forEach((item, idx) => {
        const v = item.vehicle
        const { price } = item.rate
        const transLabels = []
        if (item.maticCheck?.available) transLabels.push('Matic')
        if (item.manualCheck?.available) transLabels.push('Manual')
        const transStr = transLabels.length > 0 ? transLabels.join('/') : (v.transmission_options || []).map((t) => (t === 'automatic' ? 'Matic' : 'Manual')).join('/')
        const priceStr = isNegoPrice(v.price) || price === 0
          ? 'Hubungi CS / Nego'
          : `Rp ${formatPrice(price)}`
        const seatClean = v.seats ? ` · ${String(v.seats).replace(/\s*(kursi|seat)s?/gi, '')} seat` : ''
        lines.push(`${idx + 1}. ${v.name} (${v.category || 'Armada'}${seatClean}) - ${transStr}: ${priceStr}`)
      })
      lines.push('')
      lines.push('Semua unit bersih, wangi, AC dingin & prima terawat (bisa lepas kunci / dengan supir).')
      lines.push('')
      lines.push('Mau kami pesankan unit yang mana untuk tanggal tersebut, Kak? Biar langsung kami amankan slotnya 😊')
    }

    return lines.join('\n')
  }, [scheduleWindow, durationLabel, evaluatedVehicles])

  const copyAllWhatsApp = async () => {
    if (!waReplyText) return
    try {
      await navigator.clipboard.writeText(waReplyText)
      setCopiedWA(true)
      setTimeout(() => setCopiedWA(false), 2500)
    } catch {
      // ignore
    }
  }

  const copySingleVehicle = async (item) => {
    const v = item.vehicle
    const { price } = item.rate
    const transLabels = []
    if (item.maticCheck?.available) transLabels.push('Matic')
    if (item.manualCheck?.available) transLabels.push('Manual')
    const transStr = transLabels.join('/') || 'Matic/Manual'
    const priceStr = isNegoPrice(v.price) || price === 0 ? 'Hubungi CS / Nego' : `Rp ${formatPrice(price)}`
    const seatClean = v.seats ? ` · ${String(v.seats).replace(/\s*(kursi|seat)s?/gi, '')} seat` : ''
    const text = `Unit Ready: ${v.name} (${v.category || 'Armada'}${seatClean})\n• Transmisi: ${transStr}\n• Tarif (${durationLabel}): ${priceStr}\n• Fasilitas: Bersih, wangi, AC dingin & siap pakai!\n\nUntuk booking unit ini silakan balas chat kami ya Kak! 😊`
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSingleId(v.id)
      setTimeout(() => setCopiedSingleId(null), 2000)
    } catch {}
  }

  return (
    <section className={panelClass} aria-label="Cek jadwal dan ketersediaan armada">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 max-[600px]:px-4">
        <div className="flex items-center gap-2.5">
          <CalendarCheck className="text-cyan" size={20} aria-hidden="true" />
          <div>
            <h2 className="m-0 font-display text-[.98rem] font-bold">Cek Jadwal & Ketersediaan Armada</h2>
            <p className="m-0 text-[.7rem] text-muted">Cek instan unit & supir yang ready untuk merespons pertanyaan calon penyewa via WhatsApp.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyAllWhatsApp}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[.74rem] font-bold text-white shadow-sm transition-all ${
              copiedWA ? 'bg-emerald-700 ring-2 ring-emerald-300' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
            title="Salin seluruh format balasan WA dengan daftar mobil ready & estimasi tarif"
          >
            {copiedWA ? <CheckCircle2 size={14} className="text-emerald-200" /> : <Copy size={14} />}
            <span>{copiedWA ? 'Tersalin ke Clipboard! ✓' : 'Salin Format Balasan WA'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="border-b border-line bg-slate-ice/40 p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Tanggal Mulai */}
          <div className="grid gap-1.5">
            <span className="text-[.74rem] font-bold text-ink">1. Tanggal Mulai Sewa</span>
            <input
              type="date"
              className={fieldClass}
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              aria-label="Tanggal mulai sewa"
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setScheduleDate(todayKey)}
                className={`rounded-lg border px-2 py-0.5 text-[.66rem] font-semibold transition-colors ${
                  scheduleDate === todayKey ? 'border-cyan bg-cyan/10 text-cyan font-bold' : 'border-line bg-white text-muted hover:text-ink'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setScheduleDate(tomorrowKey)}
                className={`rounded-lg border px-2 py-0.5 text-[.66rem] font-semibold transition-colors ${
                  scheduleDate === tomorrowKey ? 'border-cyan bg-cyan/10 text-cyan font-bold' : 'border-line bg-white text-muted hover:text-ink'
                }`}
              >
                Besok
              </button>
              <button
                type="button"
                onClick={() => setScheduleDate(dayAfterKey)}
                className={`rounded-lg border px-2 py-0.5 text-[.66rem] font-semibold transition-colors ${
                  scheduleDate === dayAfterKey ? 'border-cyan bg-cyan/10 text-cyan font-bold' : 'border-line bg-white text-muted hover:text-ink'
                }`}
              >
                Lusa
              </button>
            </div>
          </div>

          {/* 2. Jam Mulai */}
          <div className="grid gap-1.5">
            <span className="text-[.74rem] font-bold text-ink">2. Jam Mulai Sewa</span>
            <input
              type="time"
              className={fieldClass}
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              aria-label="Jam mulai sewa"
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {['06:00', '08:00', '10:00', '14:00', '19:00'].map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setScheduleTime(time)}
                  className={`rounded-lg border px-2 py-0.5 text-[.66rem] font-semibold transition-colors ${
                    scheduleTime === time ? 'border-cyan bg-cyan/10 text-cyan font-bold' : 'border-line bg-white text-muted hover:text-ink'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Durasi Sewa */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[.74rem] font-bold text-ink">3. Durasi Sewa</span>
              <span className="text-[.72rem] font-bold text-crimson">
                {formatDuration(scheduleDurationHours, 'jam')} {Number(scheduleDurationHours) > 0 ? `(${scheduleDurationHours} jam)` : ''}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-0.5 rounded-xl border border-line bg-white p-2 text-center transition-colors focus-within:border-cyan">
                <span className="text-[.64rem] font-bold uppercase tracking-wider text-muted">Bulan</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-full text-center text-[.92rem] font-extrabold text-ink outline-none"
                  value={durMonths}
                  onChange={(e) => updateDurationParts(e.target.value, durDays, durHours)}
                  placeholder="0"
                />
                <span className="text-[.58rem] text-muted">× 30 hari</span>
              </label>

              <label className="flex flex-col gap-0.5 rounded-xl border border-line bg-white p-2 text-center transition-colors focus-within:border-cyan">
                <span className="text-[.64rem] font-bold uppercase tracking-wider text-muted">Hari</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="w-full text-center text-[.92rem] font-extrabold text-ink outline-none"
                  value={durDays}
                  onChange={(e) => updateDurationParts(durMonths, e.target.value, durHours)}
                  placeholder="0"
                />
                <span className="text-[.58rem] text-muted">× 24 jam</span>
              </label>

              <label className="flex flex-col gap-0.5 rounded-xl border border-line bg-white p-2 text-center transition-colors focus-within:border-cyan">
                <span className="text-[.64rem] font-bold uppercase tracking-wider text-muted">Jam</span>
                <input
                  type="number"
                  min="0"
                  max="23"
                  step="1"
                  className="w-full text-center text-[.92rem] font-extrabold text-ink outline-none"
                  value={durHours}
                  onChange={(e) => updateDurationParts(durMonths, durDays, e.target.value)}
                  placeholder="0"
                />
                <span className="text-[.58rem] text-muted">Tambahan</span>
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {durationPresets.map((preset) => (
                <button
                  key={preset.hours}
                  type="button"
                  onClick={() => setScheduleDurationHours(preset.hours)}
                  className={`rounded-lg border px-2 py-0.5 text-[.66rem] font-semibold transition-colors ${
                    scheduleDurationHours === preset.hours
                      ? 'border-cyan bg-cyan/10 text-cyan font-bold'
                      : 'border-line bg-white text-muted hover:border-cyan hover:text-ink'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Window Summary Banner */}
        {scheduleWindow && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200/80 bg-sky-50/70 px-4 py-2.5">
            <div className="flex items-center gap-2 text-[.78rem] text-sky-950">
              <Clock3 size={15} className="text-cyan shrink-0" />
              <div>
                <span className="font-semibold text-sky-800">Jadwal Sewa: </span>
                <strong className="font-bold">
                  {formatJakartaDateTime(scheduleWindow.start_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB
                </strong>
                <span className="text-sky-700"> s/d </span>
                <strong className="font-bold">
                  {formatJakartaDateTime(scheduleWindow.end_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB
                </strong>
                <span className="ml-1.5 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[.68rem] font-bold text-sky-800">
                  {durationLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-[.72rem] font-bold">
              <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                {readyVehicles.length} Unit Ready
              </span>
              <span className="flex items-center gap-1.5 text-rose-800 bg-rose-100/70 border border-rose-200 px-2.5 py-0.5 rounded-lg">
                {occupiedVehicles.length} Penuh/Disewa
              </span>
              <span className="flex items-center gap-1.5 text-sky-800 bg-sky-100 border border-sky-200 px-2.5 py-0.5 rounded-lg">
                {availableDriversCount} Supir Siap
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Sub-Tabs Navigation & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 max-[600px]:px-4">
        <div className="scrollbar-none flex gap-2 overflow-x-auto">
          <FilterChip active={subTab === 'ready'} count={readyVehicles.length} onClick={() => setSubTab('ready')}>
            Armada Ready
          </FilterChip>
          <FilterChip active={subTab === 'occupied'} count={occupiedVehicles.length} onClick={() => setSubTab('occupied')}>
            Penuh / Tersewa
          </FilterChip>
          <FilterChip active={subTab === 'drivers'} count={drivers.length} onClick={() => setSubTab('drivers')}>
            Status Supir
          </FilterChip>
          <FilterChip active={subTab === 'wa'} onClick={() => setSubTab('wa')}>
            Format Balasan WA
          </FilterChip>
        </div>

        {subTab !== 'wa' && subTab !== 'drivers' && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-8 rounded-lg border border-line bg-white px-2.5 text-[.72rem] text-ink outline-none focus:border-cyan"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter kategori armada"
            >
              <option value="all">Semua Kategori</option>
              <option value="MPV">MPV</option>
              <option value="Premium">Premium</option>
              <option value="Rombongan">Rombongan</option>
            </select>

            <select
              className="h-8 rounded-lg border border-line bg-white px-2.5 text-[.72rem] text-ink outline-none focus:border-cyan"
              value={transmissionFilter}
              onChange={(e) => setTransmissionFilter(e.target.value)}
              aria-label="Filter transmisi"
            >
              <option value="all">Semua Transmisi</option>
              <option value="automatic">Matic Ready</option>
              <option value="manual">Manual Ready</option>
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" size={13} />
              <input
                type="text"
                className="h-8 rounded-lg border border-line bg-white pl-7 pr-2.5 text-[.72rem] text-ink outline-none placeholder:text-muted focus:border-cyan w-[140px] sm:w-[170px]"
                placeholder="Cari armada..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loadingVehicles ? (
        <PanelMessage>Memeriksa ketersediaan unit armada...</PanelMessage>
      ) : subTab === 'ready' ? (
        readyVehicles.length === 0 ? (
          <EmptyState
            icon={<AlertCircle size={22} className="text-amber-500" aria-hidden="true" />}
            title="Tidak Ada Armada Ready pada Jadwal Ini"
            description="Semua armada aktif sedang memiliki jadwal sewa atau dalam perawatan pada rentang tanggal & jam ini. Buka tab 'Penuh / Tersewa' untuk melihat perkiraan jam unit kembali."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-5 max-[600px]:p-4">
            {readyVehicles.map((item) => {
              const v = item.vehicle
              const { price } = item.rate
              const isCopied = copiedSingleId === v.id
              const defaultTrans = item.maticCheck?.available ? 'automatic' : 'manual'
              return (
                <article
                  key={v.id}
                  className="flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-sm hover:border-cyan/50 hover:shadow-md transition-all"
                >
                  <div>
                    {/* Header Image & Badge */}
                    <div className="relative mb-3 aspect-[16/10] overflow-hidden rounded-xl border border-line bg-slate-100 flex items-center justify-center">
                      {v.image_url ? (
                        <img
                          src={v.image_url}
                          alt={v.name}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid place-items-center text-muted">
                          <CarFront size={32} />
                        </div>
                      )}
                      <div className="absolute left-2 top-2 flex items-center gap-1.5">
                        <span className="rounded-lg bg-black/75 px-2 py-0.5 text-[.62rem] font-bold text-white backdrop-blur-sm">
                          {v.category || 'Armada'}
                        </span>
                      </div>
                      <div className="absolute right-2 top-2">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/90 px-2 py-0.5 text-[.62rem] font-bold text-white backdrop-blur-sm shadow-sm">
                          <span className="size-1.5 rounded-full bg-white animate-pulse" />
                          Ready
                        </span>
                      </div>
                    </div>

                    {/* Name & Basic Info */}
                    <div className="mb-2">
                      <h3 className="m-0 font-display text-[1rem] font-bold text-ink">{v.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[.68rem] text-muted">
                        <span>{v.seats || '7'} Kursi</span>
                        <span>•</span>
                        <span>{v.fuel_type || 'Bensin'}</span>
                        {item.overallCheck?.remaining != null && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-emerald-700">
                              Sisa {item.overallCheck.remaining} unit
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Transmission Status Pills */}
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {item.maticCheck && (
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[.66rem] font-semibold ${
                            item.maticCheck.available
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-slate-200 bg-slate-100 text-slate-400 line-through'
                          }`}
                        >
                          Matic {item.maticCheck.available ? '✓ Ready' : 'Penuh'}
                        </span>
                      )}
                      {item.manualCheck && (
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[.66rem] font-semibold ${
                            item.manualCheck.available
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-slate-200 bg-slate-100 text-slate-400 line-through'
                          }`}
                        >
                          Manual {item.manualCheck.available ? '✓ Ready' : 'Penuh'}
                        </span>
                      )}
                    </div>

                    {/* Price Estimate Box */}
                    <div className="mb-3 rounded-xl border border-slate-100 bg-slate-ice/60 p-2.5 flex items-center justify-between">
                      <span className="text-[.7rem] font-semibold text-muted">
                        Tarif ({durationLabel}):
                      </span>
                      <strong className="text-[.92rem] font-extrabold text-crimson">
                        {isNegoPrice(v.price) || price === 0 ? 'Nego / CS' : `Rp ${formatPrice(price)}`}
                      </strong>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-2 flex items-center gap-2 border-t border-line/60 pt-3">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenBookingForm({
                          vehicle_id: v.id,
                          start_date: scheduleDate,
                          start_time: scheduleTime,
                          duration_hours: scheduleDurationHours,
                          transmission_type: defaultTrans,
                        })
                      }
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-crimson px-3 text-[.74rem] font-bold text-white shadow-sm transition-colors hover:bg-crimson-deep"
                    >
                      <Plus size={14} />
                      <span>Buat Booking Unit Ini</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => copySingleVehicle(item)}
                      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                        isCopied
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-line bg-white text-muted hover:bg-slate-ice hover:text-ink'
                      }`}
                      title="Salin info spesifikasi & tarif unit ini untuk WA"
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )
      ) : subTab === 'occupied' ? (
        occupiedVehicles.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={24} className="text-emerald-600" aria-hidden="true" />}
            title="Seluruh Armada Ready!"
            description="Tidak ada armada yang sedang disewa atau dalam perawatan pada jadwal ini. Semua unit siap dipesan."
          />
        ) : (
          <div className="p-5 max-[600px]:p-4 grid gap-3">
            {occupiedVehicles.map((item) => {
              const v = item.vehicle
              const isMaintenance = v.status === 'maintenance' || String(v.status || '').toLowerCase().includes('perawatan')
              return (
                <div
                  key={v.id}
                  className="rounded-2xl border border-line bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    {v.image_url ? (
                      <img
                        src={v.image_url}
                        alt={v.name}
                        className="size-16 rounded-xl border border-line object-cover shrink-0"
                      />
                    ) : (
                      <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-slate-ice text-muted">
                        <CarFront size={22} />
                      </span>
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-[.94rem] font-bold text-ink">{v.name}</strong>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[.66rem] font-semibold text-slate-700">
                          {v.category || 'Armada'}
                        </span>
                        {isMaintenance ? (
                          <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[.66rem] font-bold text-amber-800">
                            Perawatan / Bengkel
                          </span>
                        ) : (
                          <span className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[.66rem] font-bold text-rose-800">
                            Sedang Disewa
                          </span>
                        )}
                      </div>

                      {/* Conflict details */}
                      {item.conflicts.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {item.conflicts.map((b) => (
                            <div key={b.id} className="text-[.72rem] text-muted flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-ink">#{b.booking_code || 'BK'}</span>
                              <span>•</span>
                              <span>Penyewa: <strong className="text-ink">{b.customer_name || 'Pelanggan'}</strong></span>
                              <span>•</span>
                              <span>
                                {formatJakartaDateTime(b.start_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} s/d{' '}
                                {formatJakartaDateTime(b.end_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ready Estimation */}
                  <div className="shrink-0 rounded-xl bg-slate-ice/70 border border-line p-3 text-right md:min-w-[210px] max-[768px]:text-left">
                    <span className="block text-[.68rem] font-semibold text-muted">Perkiraan Siap Kembali:</span>
                    <strong className="block text-[.82rem] font-bold text-ink mt-0.5">
                      {isMaintenance
                        ? 'Menunggu selesai servis'
                        : item.latestEndAt
                        ? `${formatJakartaDateTime(item.latestEndAt, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB`
                        : 'Hubungi CS'}
                    </strong>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : subTab === 'drivers' ? (
        loadingDrivers ? (
          <PanelMessage>Memeriksa status supir...</PanelMessage>
        ) : drivers.length === 0 ? (
          <EmptyState
            icon={<UserRound size={22} className="text-muted" />}
            title="Belum Ada Data Supir"
            description="Tambah supir pada tab Kelola Supir untuk memantau ketersediaan."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5 max-[600px]:p-4">
            {evaluatedDrivers.map((item) => {
              const d = item.driver
              return (
                <div
                  key={d.id}
                  className="rounded-2xl border border-line bg-white p-4 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="grid size-8 place-items-center rounded-full bg-slate-ice text-muted">
                          <UserRound size={16} />
                        </span>
                        <div>
                          <strong className="block text-[.86rem] text-ink">{d.name}</strong>
                          <span className="text-[.66rem] font-semibold text-muted">{d.sim_type || 'SIM A'}</span>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[.66rem] font-bold ${
                          item.isOff
                            ? 'bg-slate-100 text-slate-500'
                            : item.isBusy
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.isOff ? 'Libur' : item.isBusy ? 'Bertugas' : 'Tersedia'}
                      </span>
                    </div>

                    {item.isBusy && item.assignedBooking && (
                      <div className="mt-2 rounded-lg bg-amber-50/70 border border-amber-200/80 p-2 text-[.7rem] text-amber-900">
                        <span>Bertugas untuk booking <strong>#{item.assignedBooking.booking_code || 'BK'}</strong> ({item.assignedBooking.customer_name})</span>
                        <div className="text-[.66rem] text-amber-700 mt-0.5">
                          Selesai: {formatJakartaDateTime(item.assignedBooking.end_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5">
                    <span className="text-[.72rem] text-muted">{d.phone}</span>
                    <a
                      href={`https://wa.me/${cleanPhone(d.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[.7rem] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <MessageSquare size={12} />
                      <span>Chat WA</span>
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* Preview Format Pesan WA */
        <div className="p-5 max-[600px]:p-4 max-w-3xl mx-auto">
          <div className="rounded-2xl border border-emerald-300/80 bg-white overflow-hidden shadow-sm">
            {/* WhatsApp Header bar */}
            <div className="bg-emerald-700 px-4 py-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} />
                <span className="text-[.82rem] font-bold">Template Balasan WhatsApp Customer</span>
              </div>
              <button
                type="button"
                onClick={copyAllWhatsApp}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[.72rem] font-bold shadow-sm transition-colors ${
                  copiedWA ? 'bg-white text-emerald-800' : 'bg-emerald-800 text-white hover:bg-emerald-900'
                }`}
              >
                {copiedWA ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                <span>{copiedWA ? 'Tersalin ke Clipboard! ✓' : 'Salin Teks'}</span>
              </button>
            </div>

            {/* Simulated WhatsApp Chat Body */}
            <div className="bg-[#EFEAE2] p-4 md:p-6">
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/60 max-w-xl text-[.82rem] leading-relaxed text-slate-800 whitespace-pre-wrap font-sans">
                {waReplyText}
              </div>
            </div>

            {/* Footer Notice */}
            <div className="border-t border-line bg-slate-ice/50 px-4 py-3 text-[.74rem] text-muted flex items-center justify-between">
              <span>💡 Tinggal klik tombol salin di atas, lalu paste (Ctrl+V) langsung ke chat WhatsApp calon penyewa.</span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function AdminDashboard() {
  const [checkingSession, setCheckingSession] = useState(true)
  const [vehicles, setVehicles] = useState([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [vehiclesError, setVehiclesError] = useState('')
  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [bookingsError, setBookingsError] = useState('')
  const [bookingActionError, setBookingActionError] = useState('')
  const [drivers, setDrivers] = useState([])
  const [loadingDrivers, setLoadingDrivers] = useState(true)
  const [driversError, setDriversError] = useState('')
  const [canManageAdmins, setCanManageAdmins] = useState(false)
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.sessionStorage.getItem('khalisa_admin_active_tab')
      if (['finance', 'bookings', 'schedule', 'vehicles', 'fleet', 'drivers', 'admin', 'admins'].includes(saved)) {
        return saved === 'vehicles' ? 'fleet' : saved === 'admin' ? 'admins' : saved
      }
    }
    return 'finance'
  })
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches)
  const sidebarRef = useRef(null)
  const mobileLogoButtonRef = useRef(null)
  const [financePeriod, setFinancePeriod] = useState('month')
  const [financeStartDate, setFinanceStartDate] = useState('')
  const [financeEndDate, setFinanceEndDate] = useState('')
  const [financeTodayKey, setFinanceTodayKey] = useState(() => getJakartaDateKey(new Date()) || toDateKey(new Date()))
  const [financeMonthKey, setFinanceMonthKey] = useState(() => (getJakartaDateKey(new Date()) || toDateKey(new Date())).slice(0, 7))
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [bookingSearch, setBookingSearch] = useState('')
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all')
  const [bookingPeriod, setBookingPeriod] = useState('all') // 'all' | 'today' | 'tomorrow' | 'next7' | 'month' | 'range'
  const [bookingMonth, setBookingMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [bookingRangeStart, setBookingRangeStart] = useState(() => toDateKey(new Date()))
  const [bookingRangeEnd, setBookingRangeEnd] = useState(() => toDateKey(new Date()))
  const [driverSearch, setDriverSearch] = useState('')
  const [driverStatusFilter, setDriverStatusFilter] = useState('all')
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false)
  const [editingVehicleId, setEditingVehicleId] = useState(null)
  const [vehicleDraft, setVehicleDraft] = useState(emptyVehicleDraft)
  const [customBadge, setCustomBadge] = useState(false)
  const [vehicleImage, setVehicleImage] = useState(null)
  const [savingVehicle, setSavingVehicle] = useState(false)
  const [vehicleFormError, setVehicleFormError] = useState('')
  const [driverFormOpen, setDriverFormOpen] = useState(false)
  const [editingDriverId, setEditingDriverId] = useState(null)
  const [driverDraft, setDriverDraft] = useState(emptyDriverDraft)
  const [savingDriver, setSavingDriver] = useState(false)
  const [driverFormError, setDriverFormError] = useState('')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [editingPriceBookingId, setEditingPriceBookingId] = useState(null)
  const [dealPriceInput, setDealPriceInput] = useState('')
  const [savingPrice, setSavingPrice] = useState(false)
  const [priceActionError, setPriceActionError] = useState('')
  const [bookingFormOpen, setBookingFormOpen] = useState(false)
  const [bookingDraft, setBookingDraft] = useState(emptyBookingDraft)
  const [savingBooking, setSavingBooking] = useState(false)
  const [bookingFormError, setBookingFormError] = useState('')
  const [manualVehicleAvailability, setManualVehicleAvailability] = useState({})

  const manualBookingWindow = (() => {
    if (!bookingFormOpen || !bookingDraft.start_date || !bookingDraft.start_time) return null
    try {
      const s = toJakartaISOString(bookingDraft.start_date, bookingDraft.start_time)
      const totalH = Number(bookingDraft.duration_hours) || 24
      const e = new Date(new Date(s).getTime() + totalH * 60 * 60 * 1000).toISOString()
      return { start_at: s, end_at: e }
    } catch {
      return null
    }
  })()

  useEffect(() => {
    if (!bookingFormOpen || !manualBookingWindow) return
    let active = true
    supabase
      .rpc('vehicle_availability', {
        start_ts: manualBookingWindow.start_at,
        end_ts: manualBookingWindow.end_at,
      })
      .then(({ data, error }) => {
        if (!active || error || !Array.isArray(data)) return
        const map = {}
        for (const row of data) {
          map[row.vehicle_id] = row
        }
        setManualVehicleAvailability(map)
      })
      .catch(() => {})
    return () => { active = false }
  }, [bookingFormOpen, manualBookingWindow?.start_at, manualBookingWindow?.end_at])

  const [scheduleCheckDate, setScheduleCheckDate] = useState(() => getJakartaDateKey(new Date()) || toDateKey(new Date()))
  const [scheduleCheckTime, setScheduleCheckTime] = useState('08:00')
  const [scheduleCheckDurationHours, setScheduleCheckDurationHours] = useState(24)
  const [scheduleVehicleAvailability, setScheduleVehicleAvailability] = useState({})

  const scheduleCheckWindow = useMemo(() => {
    if (!scheduleCheckDate || !scheduleCheckTime) return null
    try {
      const s = toJakartaISOString(scheduleCheckDate, scheduleCheckTime)
      const totalH = Math.max(1, Number(scheduleCheckDurationHours) || 24)
      const e = new Date(new Date(s).getTime() + totalH * 60 * 60 * 1000).toISOString()
      return { start_at: s, end_at: e, hours: totalH }
    } catch {
      return null
    }
  }, [scheduleCheckDate, scheduleCheckTime, scheduleCheckDurationHours])

  useEffect(() => {
    if (activeTab !== 'schedule' || !scheduleCheckWindow) return
    let active = true
    supabase
      .rpc('vehicle_availability', {
        start_ts: scheduleCheckWindow.start_at,
        end_ts: scheduleCheckWindow.end_at,
      })
      .then(({ data, error }) => {
        if (!active || error || !Array.isArray(data)) return
        const map = {}
        for (const row of data) {
          map[row.vehicle_id] = row
        }
        setScheduleVehicleAvailability(map)
      })
      .catch(() => {})
    return () => { active = false }
  }, [activeTab, scheduleCheckWindow?.start_at, scheduleCheckWindow?.end_at])

  const scheduleOverview = useMemo(() => {
    if (!scheduleCheckWindow) {
      return { readyCount: 0, occupiedCount: 0, availableDriversCount: 0, busyDriversCount: 0 }
    }
    const activeVehicles = vehicles.filter((v) => v.is_active !== false)
    let ready = 0
    let occupied = 0
    for (const v of activeVehicles) {
      const chk = checkVehicleAvailableInWindow(v, scheduleCheckWindow, bookings, null, scheduleVehicleAvailability)
      if (chk.available) ready++
      else occupied++
    }
    let availDrivers = 0
    let busyDrivers = 0
    for (const d of drivers) {
      if (d.status === 'off') continue
      const isBusy = isDriverBookedForWindow(d.id, scheduleCheckWindow, bookings)
      if (isBusy) busyDrivers++
      else availDrivers++
    }
    return {
      readyCount: ready,
      occupiedCount: occupied,
      availableDriversCount: availDrivers,
      busyDriversCount: busyDrivers,
    }
  }, [scheduleCheckWindow, vehicles, bookings, scheduleVehicleAvailability, drivers])
  const [paymentConfirmModalOpen, setPaymentConfirmModalOpen] = useState(false)
  const [paymentConfirmBooking, setPaymentConfirmBooking] = useState(null)
  const [paymentConfirmDraft, setPaymentConfirmDraft] = useState({
    pay_type: 'dp', // 'dp' | 'full'
    method: 'Transfer BCA',
    sender_name: '',
    amount: '',
    file: null,
    file_preview: null,
    notes: '',
  })
  const [paymentConfirmSubmitting, setPaymentConfirmSubmitting] = useState(false)
  const [paymentConfirmError, setPaymentConfirmError] = useState('')
  const [settlementModalOpen, setSettlementModalOpen] = useState(false)
  const [settlementBooking, setSettlementBooking] = useState(null)
  const [settlementDraft, setSettlementDraft] = useState({
    method: 'Transfer BCA',
    sender_name: '',
    amount: '',
    file: null,
    file_preview: null,
    notes: '',
  })
  const [settlementSubmitting, setSettlementSubmitting] = useState(false)
  const [settlementError, setSettlementError] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportMode, setExportMode] = useState('month') // 'month' | 'range'
  const [exportMonth, setExportMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [exportRangeStart, setExportRangeStart] = useState(() => toDateKey(new Date()))
  const [exportRangeEnd, setExportRangeEnd] = useState(() => toDateKey(new Date()))
  const [notificationStatus, setNotificationStatus] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission
    }
    return 'default'
  })
  const alertedFinishedIds = useRef(new Set())

  async function toggleNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Browser Anda tidak mendukung notifikasi push.')
      return
    }
    if (Notification.permission === 'granted') {
      sendDesktopNotification('Notifikasi Aktif', 'Notifikasi pemesanan & jadwal selesai aktif! (Tes bunyi bel berhasil)')
      return
    }
    try {
      const perm = await Notification.requestPermission()
      setNotificationStatus(perm)
      if (perm === 'granted') {
        sendDesktopNotification('Notifikasi Diizinkan', 'Anda akan menerima notifikasi saat ada booking baru atau jadwal sewa selesai!')
      }
    } catch (err) {
      console.warn('[Notification permission error]', err)
    }
  }

  // Realtime listener untuk booking baru masuk
  useEffect(() => {
    const channel = supabase
      .channel('admin-realtime-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'booking_requests' }, (payload) => {
        const newB = payload.new
        if (newB) {
          sendDesktopNotification(
            'Booking Baru Masuk!',
            `${newB.customer_name || 'Pelanggan'} - ${newB.booking_mode || 'Pemesanan baru'}`
          )
          setBookings((prev) => [newB, ...prev.filter((b) => b.id !== newB.id)])
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Pemeriksaan berkala jadwal sewa selesai (setiap 30 detik)
  useEffect(() => {
    function checkFinishedBookings() {
      const now = Date.now()
      bookings.forEach((b) => {
        if (b.status === 'confirmed' && b.end_at) {
          const endTs = Date.parse(b.end_at)
          if (Number.isFinite(endTs) && endTs <= now && !alertedFinishedIds.current.has(b.id)) {
            alertedFinishedIds.current.add(b.id)
            sendDesktopNotification(
              '⏰ Jadwal Sewa Selesai!',
              `Sewa unit untuk ${b.customer_name} telah berakhir. Mobil siap diterima kembali.`
            )
          }
        }
      })
    }

    const timer = setInterval(checkFinishedBookings, 30_000)
    checkFinishedBookings()
    return () => clearInterval(timer)
  }, [bookings])

  // Sync selectedBooking dengan data terbaru dari bookings state
  useEffect(() => {
    if (!selectedBooking) return
    const fresh = bookings.find((b) => b.id === selectedBooking.id)
    if (fresh) setSelectedBooking(fresh)
  }, [bookings])

  useEffect(() => () => {
    if (vehicleImage?.previewUrl) URL.revokeObjectURL(vehicleImage.previewUrl)
  }, [vehicleImage])

  useEffect(() => () => {
    if (paymentConfirmDraft.file_preview?.startsWith('blob:')) {
      URL.revokeObjectURL(paymentConfirmDraft.file_preview)
    }
  }, [paymentConfirmDraft.file_preview])

  useEffect(() => () => {
    if (settlementDraft.file_preview?.startsWith('blob:')) {
      URL.revokeObjectURL(settlementDraft.file_preview)
    }
  }, [settlementDraft.file_preview])

  useEffect(() => () => {
    if (bookingDraft.payment_proof_preview?.startsWith('blob:')) {
      URL.revokeObjectURL(bookingDraft.payment_proof_preview)
    }
  }, [bookingDraft.payment_proof_preview])

  useEffect(() => {
    const overlayOpen = mobileNavOpen || vehicleFormOpen || driverFormOpen || !!selectedBooking || exportModalOpen || paymentConfirmModalOpen || settlementModalOpen || !!lightboxUrl
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      if (lightboxUrl) {
        setLightboxUrl(null)
        return
      }
      if (settlementModalOpen && !settlementSubmitting) {
        setSettlementModalOpen(false)
        setSettlementBooking(null)
        return
      }
      if (paymentConfirmModalOpen && !paymentConfirmSubmitting) {
        setPaymentConfirmModalOpen(false)
        setPaymentConfirmBooking(null)
        return
      }
      setMobileNavOpen(false)
      setVehicleFormOpen(false)
      setDriverFormOpen(false)
      setSelectedBooking(null)
      setExportModalOpen(false)
    }
    if (overlayOpen) document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [mobileNavOpen, vehicleFormOpen, driverFormOpen, selectedBooking, exportModalOpen, paymentConfirmModalOpen, settlementModalOpen, lightboxUrl, paymentConfirmSubmitting, settlementSubmitting])

  useEffect(() => {
    if (mobileNavOpen) return
    const active = document.activeElement
    if (active && sidebarRef.current?.contains(active)) mobileLogoButtonRef.current?.focus()
  }, [mobileNavOpen])

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)')
    const sync = () => setIsDesktop(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('khalisa_admin_active_tab', activeTab)
    }
  }, [activeTab])

  // Pastikan sesi admin tetap aman dan tidak terhapus saat refresh halaman
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pendingSession = window.sessionStorage.getItem(adminReloadSessionStorageKey)
      if (pendingSession && !window.localStorage.getItem(supabaseAuthStorageKey)) {
        window.localStorage.setItem(supabaseAuthStorageKey, pendingSession)
      }
      window.sessionStorage.removeItem(adminReloadSessionStorageKey)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      try {
        if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && window.location.hash === '#ui-preview') {
          if (active) {
            const currentDate = new Date()
            const currentDateKey = getJakartaDateKey(currentDate)
            setFinanceTodayKey(currentDateKey)
            setFinanceMonthKey(currentDateKey.slice(0, 7))
            setCheckingSession(false)
            setLoadingVehicles(false)
            setLoadingBookings(false)
            setLoadingDrivers(false)
            setCanManageAdmins(true)
          }
          return
        }

        // Pulihkan session dari sessionStorage jika ada
        if (typeof window !== 'undefined') {
          const pending = window.sessionStorage.getItem(adminReloadSessionStorageKey)
          if (pending && !window.localStorage.getItem(supabaseAuthStorageKey)) {
            window.localStorage.setItem(supabaseAuthStorageKey, pending)
          }
          window.sessionStorage.removeItem(adminReloadSessionStorageKey)
        }

        // Cek sesi autentikasi yang tersimpan tanpa langsung memaksa error refresh
        const { data: sessionData } = await supabase.auth.getSession()
        let currentUser = sessionData?.session?.user

        if (!currentUser) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError || !refreshData?.session?.user) {
            await supabase.auth.signOut()
            window.location.replace('/adminlogin')
            return
          }
          currentUser = refreshData.session.user
        }

        const { data: userData, error: userError } = await supabase.auth.getUser()
        const verifiedUser = userData?.user ?? currentUser
        if (userError || verifiedUser?.app_metadata?.role !== 'admin') {
          await supabase.auth.signOut()
          window.location.replace('/adminlogin')
          return
        }

        if (active) setCanManageAdmins(verifiedUser.email?.trim().toLowerCase() === primaryAdminEmail)

        await supabase.rpc('expire_pending_booking_holds')

        const currentDate = new Date()
        const currentDateKey = getJakartaDateKey(currentDate)
        const currentMonthKey = currentDateKey.slice(0, 7)
        if (active) {
          setFinanceTodayKey(currentDateKey)
          setFinanceMonthKey(currentMonthKey)
          setCheckingSession(false)
        }

        const { data: fleet, error: fleetError } = await supabase
          .from('vehicles')
          .select('*')
          .order('sort_order', { ascending: true })

        if (fleetError) throw fleetError
        if (active) setVehicles(fleet ?? [])

        const { data: requests, error: requestsError } = await supabase
          .from('booking_requests')
          .select('*')
          .order('created_at', { ascending: false })

        if (active && requestsError) setBookingsError(requestsError.message)
        const currentBookings = requests ?? []
        if (active && !requestsError) setBookings(currentBookings)

        const { data: driverList, error: driversErrorRes } = await supabase
          .from('drivers')
          .select('*')
          .order('name', { ascending: true })

        if (active && driversErrorRes) setDriversError(driversErrorRes.message)
        if (active && !driversErrorRes) setDrivers(await releaseExpiredDrivers(driverList ?? [], currentBookings))
      } catch (error) {
        if (active) setVehiclesError(error.message || 'Gagal memuat data armada.')
      } finally {
        if (active) {
          setCheckingSession(false)
          setLoadingVehicles(false)
          setLoadingBookings(false)
          setLoadingDrivers(false)
        }
      }
    }

    async function refreshDashboardData() {
      await supabase.rpc('expire_pending_booking_holds')

      const [{ data: fleet, error: fleetError }, { data: requests, error: requestsError }, { data: driverList, error: driversLoadError }] = await Promise.all([
        supabase.from('vehicles').select('*').order('sort_order', { ascending: true }),
        supabase.from('booking_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('drivers').select('*').order('name', { ascending: true }),
      ])

      if (!active) return
      if (!fleetError) setVehicles(fleet ?? [])
      const currentBookings = requests ?? []
      if (!requestsError) setBookings(currentBookings)
      if (!driversLoadError) setDrivers(await releaseExpiredDrivers(driverList ?? [], currentBookings))
    }

    loadDashboard()
    const refreshTimer = window.setInterval(refreshDashboardData, 60_000)
    return () => {
      active = false
      window.clearInterval(refreshTimer)
    }
  }, [])

  // Auto badge - priority: Promo aktif > Unit Baru (7 hari) > Terlaris (top 3) > badge manual
  useEffect(() => {
    if (loadingVehicles || loadingBookings || vehicles.length === 0) return

    const now = new Date()
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

    // --- Hitung top 3 Terlaris ---
    const completedBookings = bookings.filter((b) => b.status === 'completed')
    const countByName = {}
    for (const booking of completedBookings) {
      for (const v of (booking.vehicle_snapshot ?? [])) {
        if (!v.name) continue
        countByName[v.name] = (countByName[v.name] ?? 0) + (v.quantity ?? 1)
      }
    }
    const top3Names = Object.entries(countByName)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name)

    // --- Generate badge per vehicle ---
    const autoBadges = ['Promo', 'Terlaris', 'Matic Baru', 'Manual Baru', 'Hybrid Baru', 'EV Baru', 'Unit Baru']
    const updates = []

    for (const vehicle of vehicles) {
      let newBadge = null

      // Priority 1: Promo aktif
      if (getActivePromo(vehicle)) {
        newBadge = 'Promo'
      }
      // Priority 2: Unit Baru (7 hari sejak unit_added_at)
      else {
        const addedAt = vehicle.unit_added_at ? new Date(vehicle.unit_added_at) : null
        if (addedAt && addedAt >= sevenDaysAgo) {
          const transmissions = vehicle.transmission_options ?? []
          const powertrain = vehicle.powertrain_type
          if (transmissions.length >= 2) newBadge = 'Unit Baru'
          else if (powertrain === 'hybrid') newBadge = 'Hybrid Baru'
          else if (powertrain === 'ev_phev') newBadge = 'EV Baru'
          else if (transmissions.includes('automatic') && !transmissions.includes('manual')) newBadge = 'Matic Baru'
          else if (transmissions.includes('manual') && !transmissions.includes('automatic')) newBadge = 'Manual Baru'
          else newBadge = 'Unit Baru'
        }
        // Priority 3: Terlaris
        else if (top3Names.includes(vehicle.name)) {
          newBadge = 'Terlaris'
        }
        // Priority 4: badge manual (tidak diubah sistem)
        else {
          newBadge = autoBadges.includes(vehicle.badge) ? null : vehicle.badge
        }
      }

      if (newBadge !== vehicle.badge) {
        updates.push({ id: vehicle.id, badge: newBadge })
      }
    }

    if (updates.length === 0) return

    Promise.all(
      updates.map(({ id, badge }) =>
        supabase.from('vehicles').update({ badge }).eq('id', id)
      )
    ).then(() => {
      setVehicles((current) =>
        current.map((vehicle) => {
          const update = updates.find((u) => u.id === vehicle.id)
          return update ? { ...vehicle, badge: update.badge } : vehicle
        })
      )
    })
  }, [loadingVehicles, loadingBookings, vehicles.length, bookings.length])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.replace('/adminlogin')
  }

  function openVehicleForm(vehicle = null) {
    setEditingVehicleId(vehicle?.id ?? null)
    setVehicleImage(null)
    setCustomBadge(Boolean(vehicle?.badge && !promoBadgeOptions.includes(vehicle.badge)))
    const configuredTransmissionOptions = Array.isArray(vehicle?.transmission_options) ? vehicle.transmission_options : []
    const savedTransmissionStock = vehicle?.transmission_stock && typeof vehicle.transmission_stock === 'object'
      ? vehicle.transmission_stock
      : {}
    const allocatedTransmissionOptions = configuredTransmissionOptions.filter((type) => Number(savedTransmissionStock[type]) > 0)
    const hasSavedTransmissionAllocation = Object.keys(savedTransmissionStock).length > 0
    const transmissionOptions = hasSavedTransmissionAllocation
      ? allocatedTransmissionOptions
      : configuredTransmissionOptions.length === 1 ? configuredTransmissionOptions : []
    setVehicleDraft(vehicle ? {
      name: vehicle.name ?? '',
      price: vehicle.price ?? '',
      price_without_toll: vehicle.price_without_toll ?? '',
      promo_price: vehicle.promo_price ?? '',
      promo_start: vehicle.promo_start ? vehicle.promo_start.slice(0, 10) : '',
      promo_end: vehicle.promo_end ? vehicle.promo_end.slice(0, 10) : '',
      special_price: vehicle.special_price ?? '',
      special_min_days: vehicle.special_min_days ?? 3,
      special_label: vehicle.special_label ?? '',
      category: vehicle.category ?? 'MPV',
      transmission_options: transmissionOptions,
      transmission_stock: Object.fromEntries(transmissionOptions.map((type) => [
        type,
        savedTransmissionStock[type] ?? (transmissionOptions.length === 1 ? getVehicleStock(vehicle) : 0),
      ])),
      transmission_details: vehicle.transmission_details ?? '',
      powertrain_type: vehicle.powertrain_type ?? '',
      existing_stock: getVehicleStock(vehicle),
      seats: vehicle.seats ?? '',
      badge: vehicle.badge ?? '',
      image_url: vehicle.image_url ?? '',
      status: vehicle.status ?? (isVehicleReady(vehicle) ? 'ready' : 'booking'),
      sort_order: vehicle.sort_order ?? 0,
      is_active: vehicle.is_active === true,
    } : { ...emptyVehicleDraft, sort_order: vehicles.length })
    setVehicleFormError('')
    setVehicleFormOpen(true)
  }

  async function handleSaveVehicle(event) {
    event.preventDefault()
    setVehicleFormError('')

    const fileExtensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
    if (vehicleImage) {
      if (!fileExtensions[vehicleImage.file.type]) {
        setVehicleFormError('Format foto tidak valid. Gunakan format JPG, PNG, atau WebP.')
        return
      }
      if (vehicleImage.file.size > 5 * 1024 * 1024) {
        setVehicleFormError(`Ukuran foto kendaraan terlalu besar (${formatFileSize(vehicleImage.file.size)}). Maksimal ukuran foto adalah 5 MB.`)
        return
      }
    }
    if (!vehicleDraft.transmission_options.some((type) => Number(vehicleDraft.transmission_stock[type]) > 0)) {
      setVehicleFormError('Pilih tipe transmisi yang benar-benar memiliki unit.')
      return
    }
    if (vehicleDraft.transmission_options.some((type) => !Number.isInteger(Number(vehicleDraft.transmission_stock[type])) || Number(vehicleDraft.transmission_stock[type]) < 0)) {
      setVehicleFormError('Jumlah unit per transmisi harus berupa angka bulat nol atau lebih.')
      return
    }

    let imageUrl = vehicleDraft.image_url.trim()
    let uploadedPath = null
    if (imageUrl && !vehicleImage) {
      try {
        const imageHost = new URL(imageUrl).hostname
        const supabaseConfigUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
        const supabaseHost = supabaseConfigUrl ? new URL(supabaseConfigUrl).hostname : ''
        if (imageHost !== supabaseHost) throw new Error('Foto kendaraan harus menggunakan URL Storage Supabase.')
      } catch (error) {
        setVehicleFormError(error.message || 'URL foto tidak valid.')
        return
      }
    }

    const transmissionStock = Object.fromEntries(vehicleDraft.transmission_options.map((type) => [type, Number(vehicleDraft.transmission_stock[type])]))
    const availableTransmissionOptions = vehicleDraft.transmission_options.filter((type) => transmissionStock[type] > 0)
    const newTotalStock = Object.values(transmissionStock).reduce((total, quantity) => total + quantity, 0)

    // Set unit_added_at kalau: insert baru ATAU stok bertambah dari sebelumnya
    const existingVehicle = editingVehicleId ? vehicles.find((v) => v.id === editingVehicleId) : null
    const oldTotalStock = existingVehicle ? getVehicleStock(existingVehicle) : 0
    const stockIncreased = !editingVehicleId || newTotalStock > oldTotalStock
    
    const payload = {
      name: vehicleDraft.name.trim(),
      price: vehicleDraft.price.trim() || '-',
      price_without_toll: vehicleDraft.price_without_toll.trim() || null,
      promo_price: vehicleDraft.promo_price.trim() || null,
      promo_start: vehicleDraft.promo_start || null,
      promo_end: vehicleDraft.promo_end || null,
      special_price: vehicleDraft.special_price.trim() || null,
      special_min_days: vehicleDraft.special_price.trim() ? (Number(vehicleDraft.special_min_days) || 3) : null,
      special_label: vehicleDraft.special_label.trim() || null,
      category: vehicleDraft.category,
      transmission_options: availableTransmissionOptions,
      transmission_stock: transmissionStock,
      stock: newTotalStock,
      transmission_details: vehicleDraft.transmission_details.trim() || null,
      powertrain_type: vehicleDraft.powertrain_type || null,
      seats: vehicleDraft.seats.trim(),
      badge: vehicleDraft.badge.trim() || null,
      image_url: imageUrl || null,
      status: vehicleDraft.status,
      sort_order: Number(vehicleDraft.sort_order),
      is_active: vehicleDraft.is_active,
      ...(stockIncreased ? { unit_added_at: new Date().toISOString() } : {}),
    }

    setSavingVehicle(true)
    try {
      if (vehicleImage) {
        let fileToUpload = vehicleImage.file
        if (fileToUpload.size > 500 * 1024) {
          try {
            fileToUpload = await compressImageFile(fileToUpload, { maxWidthOrHeight: 1920, quality: 0.84 })
          } catch (compErr) {
            console.warn('[Vehicle photo compression fallback]', compErr)
          }
        }
        const ext = fileExtensions[fileToUpload.type] || 'jpg'
        uploadedPath = `vehicles/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('vehicle-images')
          .upload(uploadedPath, fileToUpload, {
            cacheControl: '3600',
            contentType: fileToUpload.type,
          })
        if (uploadError) {
          const msg = uploadError.message || ''
          if (msg.toLowerCase().includes('size') || msg.toLowerCase().includes('payload') || uploadError.statusCode === '413') {
            throw new Error(`Ukuran foto kendaraan melebihi batas penyimpanan (${formatFileSize(fileToUpload.size)}). Silakan gunakan foto yang lebih kecil.`)
          }
          throw uploadError
        }
        imageUrl = supabase.storage.from('vehicle-images').getPublicUrl(uploadedPath).data.publicUrl
      }

      const vehiclePayload = { ...payload, image_url: imageUrl || null }
      const query = editingVehicleId
        ? supabase.from('vehicles').update(vehiclePayload).eq('id', editingVehicleId)
        : supabase.from('vehicles').insert(vehiclePayload)
      const { data, error } = await query.select('*').single()
      if (error) throw error

      setVehicles((current) => {
        const next = editingVehicleId
          ? current.map((vehicle) => vehicle.id === editingVehicleId ? data : vehicle)
          : [...current, data]
        return next.sort((first, second) => first.sort_order - second.sort_order)
      })
      setVehicleImage(null)
      setVehicleFormOpen(false)
    } catch (error) {
      if (uploadedPath) await supabase.storage.from('vehicle-images').remove([uploadedPath])
      setVehicleFormError(error.message || 'Gagal menyimpan kendaraan.')
    } finally {
      setSavingVehicle(false)
    }
  }

  function calculateVehicleRate(vehicle, durationHours, includeToll = false) {
    if (!vehicle) return { price: 0, toll: 0, priceWithToll: 0, priceWithoutToll: 0 }
    const hrs = Math.max(12, Number(durationHours) || 24)
    const multiplier = hrs / 12 // Base tarif acuan per 12 jam

    const promo = getActivePromo(vehicle)
    const rawWithToll = parsePrice(promo ? promo.price : vehicle.price)
    const rawWithoutToll = parsePrice(vehicle.price_without_toll || vehicle.price)

    const totalWithToll = Math.round(rawWithToll * multiplier)
    const totalWithoutToll = Math.round(rawWithoutToll * multiplier)
    const tollDiff = Math.max(0, totalWithToll - totalWithoutToll)

    const chosenPrice = includeToll ? totalWithToll : totalWithoutToll
    return {
      price: chosenPrice,
      toll: tollDiff,
      priceWithToll: totalWithToll,
      priceWithoutToll: totalWithoutToll,
    }
  }

  function openBookingForm(prefill = {}) {
    const todayStr = getJakartaDateKey(new Date()) || toDateKey(new Date())
    const initialDate = prefill.start_date || todayStr
    const initialTime = prefill.start_time || '08:00'
    const initialDurationHours = Number(prefill.duration_hours) || 24

    const initialWindow = {
      start_at: toJakartaISOString(initialDate, initialTime),
      end_at: new Date(new Date(toJakartaISOString(initialDate, initialTime)).getTime() + initialDurationHours * 60 * 60 * 1000).toISOString(),
    }
    const activeVehicles = vehicles.filter((v) => v.is_active !== false)
    const prefilledVehicle = prefill.vehicle_id ? vehicles.find((v) => String(v.id) === String(prefill.vehicle_id)) : null
    const firstAvailable = prefilledVehicle || activeVehicles.find((v) => checkVehicleAvailableInWindow(v, initialWindow, bookings).available) || activeVehicles[0] || vehicles[0] || null
    const firstVehicle = firstAvailable
    const defaultTransmission = prefill.transmission_type || firstVehicle?.transmission_options?.[0] || 'automatic'

    const { price: defaultPriceNum, toll: defaultTollNum } = calculateVehicleRate(firstVehicle, initialDurationHours, false)

    const durM = Math.floor(initialDurationHours / (30 * 24))
    const remM = initialDurationHours % (30 * 24)
    const durD = Math.floor(remM / 24)
    const durH = remM % 24
    const initialPayType = prefill.payment_type || 'dp'
    const defaultDpNum = defaultPriceNum > 0 ? Math.round(defaultPriceNum * 0.5 / 1000) * 1000 || 500000 : 0

    setBookingDraft({
      customer_name: prefill.customer_name || '',
      customer_phone: prefill.customer_phone || '',
      vehicle_id: firstVehicle ? firstVehicle.id : '',
      transmission_type: defaultTransmission,
      booking_mode: prefill.booking_mode || 'Sewa mobil lepas kunci',
      event_type: prefill.event_type || 'Pernikahan',
      event_type_other: '',
      event_addons: [],
      event_addon_custom: '',
      driver_id: prefill.driver_id || '',
      start_date: initialDate,
      start_time: initialTime,
      duration_months: String(durM),
      duration_days: String(durD),
      duration_hours_part: String(durH),
      duration_hours: initialDurationHours,
      pickup_address: prefill.pickup_address || 'Pool Khalisa Rent Car',
      deal_price: defaultPriceNum > 0 ? formatPrice(defaultPriceNum) : '',
      toll_included: false,
      toll_amount: defaultTollNum > 0 ? formatPrice(defaultTollNum) : '',
      status: prefill.status || 'confirmed',
      payment_type: initialPayType,
      payment_method: 'Transfer BCA',
      payment_sender_name: '',
      payment_amount: initialPayType === 'full'
        ? (defaultPriceNum > 0 ? formatPrice(defaultPriceNum) : '')
        : (defaultDpNum > 0 ? formatPrice(defaultDpNum) : ''),
      payment_proof_file: null,
      payment_proof_preview: null,
      payment_notes: '',
      notes: prefill.notes || '[ORDER VIA WA]',
    })
    setBookingFormError('')
    setBookingFormOpen(true)
  }

  async function uploadPaymentProofFile(file) {
    if (!file) throw new Error('File bukti pembayaran tidak ditemukan.')

    // 1. Auto kompresi jika file adalah gambar (mereduksi 10-20 MB kamera HP menjadi ~250-500 KB)
    let fileToUpload = file
    if (file.type && file.type.startsWith('image/')) {
      try {
        fileToUpload = await compressImageFile(file, { maxWidthOrHeight: 1920, quality: 0.82 })
      } catch (cErr) {
        console.warn('[Auto compress error, fallback to original]', cErr)
      }
    }

    // 2. Validasi batas ukuran payload server (4.5 MB)
    const MAX_ALLOWED_BYTES = 4.5 * 1024 * 1024
    if (fileToUpload.size > MAX_ALLOWED_BYTES) {
      throw new Error(
        `Ukuran file bukti pembayaran terlalu besar (${formatFileSize(fileToUpload.size)}). ` +
        `Batas maksimal adalah 4.5 MB. Harap gunakan foto dengan resolusi lebih kecil atau file terkompresi.`
      )
    }

    const formData = new FormData()
    formData.append('file', fileToUpload)

    let res
    try {
      res = await fetch('/api/upload-payment-proof', {
        method: 'POST',
        body: formData,
      })
    } catch (networkErr) {
      throw new Error(`Koneksi gagal saat mengunggah bukti pembayaran: ${networkErr.message || 'Jaringan internet bermasalah'}`)
    }

    const rawText = await res.text()
    let json = null
    try {
      json = JSON.parse(rawText)
    } catch {
      if (res.status === 413 || rawText.includes('FUNCTION_PAYLOAD_TOO_LARGE') || rawText.includes('Payload Too Large')) {
        throw new Error(
          `Ukuran file bukti pembayaran terlalu besar untuk diproses server (${formatFileSize(fileToUpload.size)}). ` +
          `Batas maksimal adalah 4.5 MB. Harap pilih foto yang lebih kecil.`
        )
      }
      throw new Error(`Gagal mengunggah file bukti pembayaran (HTTP ${res.status}): ${rawText.slice(0, 100) || 'Respon server tidak valid'}`)
    }

    if (!res.ok || !json?.publicUrl) {
      throw new Error(json?.error || 'Gagal mengunggah file bukti pembayaran.')
    }
    return json.publicUrl
  }

  function handleManualVehicleChange(vehicleId) {
    const chosen = vehicles.find((v) => String(v.id) === String(vehicleId))
    const resolvedVehicleId = chosen ? chosen.id : vehicleId
    const newTransmission = chosen?.transmission_options?.[0] || 'automatic'
    const durationHrs = Number(bookingDraft.duration_hours) || 24
    const { price: newPrice, toll: newToll } = calculateVehicleRate(chosen, durationHrs, bookingDraft.toll_included)
    const formattedPrice = newPrice > 0 ? formatPrice(newPrice) : ''

    setBookingDraft((prev) => ({
      ...prev,
      vehicle_id: resolvedVehicleId,
      transmission_type: newTransmission,
      deal_price: formattedPrice || prev.deal_price,
      payment_amount: prev.payment_type === 'full'
        ? (formattedPrice || prev.payment_amount)
        : prev.payment_amount,
      toll_amount: prev.toll_included ? (newToll > 0 ? formatPrice(newToll) : prev.toll_amount) : prev.toll_amount,
    }))
  }

  function updateManualDurationParts(monthsVal, daysVal, hoursVal) {
    const rawM = monthsVal === '' ? '' : Math.max(0, parseInt(monthsVal, 10) || 0)
    const rawD = daysVal === '' ? '' : Math.max(0, parseInt(daysVal, 10) || 0)
    const rawH = hoursVal === '' ? '' : Math.max(0, parseInt(hoursVal, 10) || 0)

    const m = typeof rawM === 'number' ? rawM : 0
    const d = typeof rawD === 'number' ? rawD : 0
    const h = typeof rawH === 'number' ? rawH : 0

    const totalHours = m * 30 * 24 + d * 24 + h
    const chosen = vehicles.find((v) => String(v.id) === String(bookingDraft.vehicle_id))
    const { price: newPrice, toll: newToll } = calculateVehicleRate(chosen, Math.max(1, totalHours), bookingDraft.toll_included)
    const formattedPrice = newPrice > 0 ? formatPrice(newPrice) : ''

    setBookingDraft((prev) => ({
      ...prev,
      duration_months: monthsVal,
      duration_days: daysVal,
      duration_hours_part: hoursVal,
      duration_hours: totalHours,
      deal_price: formattedPrice || prev.deal_price,
      payment_amount: prev.payment_type === 'full'
        ? (formattedPrice || prev.payment_amount)
        : prev.payment_amount,
      toll_amount: prev.toll_included ? (newToll > 0 ? formatPrice(newToll) : prev.toll_amount) : prev.toll_amount,
    }))
  }

  function handleManualDurationPreset(totalHours) {
    const hrs = Math.max(1, Number(totalHours) || 24)
    const months = Math.floor(hrs / (30 * 24))
    const rem = hrs % (30 * 24)
    const days = Math.floor(rem / 24)
    const hours = rem % 24

    const chosen = vehicles.find((v) => String(v.id) === String(bookingDraft.vehicle_id))
    const { price: newPrice, toll: newToll } = calculateVehicleRate(chosen, hrs, bookingDraft.toll_included)
    const formattedPrice = newPrice > 0 ? formatPrice(newPrice) : ''

    setBookingDraft((prev) => ({
      ...prev,
      duration_months: String(months),
      duration_days: String(days),
      duration_hours_part: String(hours),
      duration_hours: hrs,
      deal_price: formattedPrice || prev.deal_price,
      payment_amount: prev.payment_type === 'full'
        ? (formattedPrice || prev.payment_amount)
        : prev.payment_amount,
      toll_amount: prev.toll_included ? (newToll > 0 ? formatPrice(newToll) : prev.toll_amount) : prev.toll_amount,
    }))
  }

  function handleTollToggle(included) {
    const chosen = vehicles.find((v) => String(v.id) === String(bookingDraft.vehicle_id))
    const durationHrs = Number(bookingDraft.duration_hours) || 24
    const { price: newPrice, toll: newToll } = calculateVehicleRate(chosen, durationHrs, included)
    const formattedPrice = newPrice > 0 ? formatPrice(newPrice) : ''

    setBookingDraft((prev) => ({
      ...prev,
      toll_included: included,
      deal_price: formattedPrice || prev.deal_price,
      payment_amount: prev.payment_type === 'full'
        ? (formattedPrice || prev.payment_amount)
        : prev.payment_amount,
      toll_amount: included ? (newToll > 0 ? formatPrice(newToll) : (prev.toll_amount || '50.000')) : '',
    }))
  }

  async function handleSaveManualBooking(event) {
    event.preventDefault()
    setBookingFormError('')

    const customerName = bookingDraft.customer_name.trim()
    if (!customerName || customerName.length < 2) {
      setBookingFormError('Nama pemesan wajib diisi (minimal 2 karakter).')
      return
    }

    let cleanPhoneNum = String(bookingDraft.customer_phone || '').trim().replace(/[^\d+]/g, '')
    if (cleanPhoneNum.startsWith('0')) {
      cleanPhoneNum = '+62' + cleanPhoneNum.slice(1)
    } else if (cleanPhoneNum.startsWith('62')) {
      cleanPhoneNum = '+' + cleanPhoneNum
    } else if (!cleanPhoneNum.startsWith('+') && cleanPhoneNum.length > 0) {
      cleanPhoneNum = '+62' + cleanPhoneNum
    }
    if (!cleanPhoneNum || cleanPhoneNum.length < 9) {
      setBookingFormError('Nomor WhatsApp / telepon tidak valid (minimal 9 digit).')
      return
    }

    if (!bookingDraft.vehicle_id) {
      setBookingFormError('Pilih kendaraan yang akan disewa.')
      return
    }

    if (!bookingDraft.start_date || !bookingDraft.start_time) {
      setBookingFormError('Tentukan tanggal dan jam mulai sewa.')
      return
    }

    const totalDurationHrs = Number(bookingDraft.duration_hours) || (
      (parseInt(bookingDraft.duration_months, 10) || 0) * 30 * 24 +
      (parseInt(bookingDraft.duration_days, 10) || 0) * 24 +
      (parseInt(bookingDraft.duration_hours_part, 10) || 0)
    )

    if (!Number.isFinite(totalDurationHrs) || totalDurationHrs <= 0) {
      setBookingFormError('Durasi sewa harus lebih dari 0 jam (masukkan jumlah bulan, hari, atau jam).')
      return
    }

    const selectedVehicle = vehicles.find((v) => String(v.id) === String(bookingDraft.vehicle_id))
    if (!selectedVehicle) {
      setBookingFormError('Kendaraan yang dipilih tidak valid.')
      return
    }

    const dealPriceNum = parseInt(String(bookingDraft.deal_price || '0').replace(/\D/g, ''), 10) || 0
    if (dealPriceNum <= 0) {
      setBookingFormError('Harga sewa harus lebih dari Rp 0.')
      return
    }
    const tollAmountNum = bookingDraft.toll_included ? (parseInt(String(bookingDraft.toll_amount || '0').replace(/\D/g, ''), 10) || 0) : 0

    let startAt
    let endAt
    try {
      startAt = toJakartaISOString(bookingDraft.start_date, bookingDraft.start_time)
      endAt = new Date(new Date(startAt).getTime() + totalDurationHrs * 60 * 60 * 1000).toISOString()
    } catch {
      setBookingFormError('Format tanggal atau jam sewa tidak valid.')
      return
    }

    const vehicleCheck = checkVehicleAvailableInWindow(
      selectedVehicle,
      { start_at: startAt, end_at: endAt },
      bookings,
      bookingDraft.transmission_type,
      manualVehicleAvailability
    )
    if (!vehicleCheck.available) {
      setBookingFormError(`Unit armada (${selectedVehicle.name}) sudah terisi jadwal sewa lain atau berstatus ${vehicleCheck.reason} pada rentang tanggal & jam tersebut. Silakan pilih armada yang bertanda ✓ Tersedia.`)
      return
    }

    const requiresDriver = bookingDraft.booking_mode === 'Sewa mobil + Supir' || bookingDraft.booking_mode === 'Rental Acara'

    if (requiresDriver) {
      if (bookingDraft.status === 'confirmed' && !bookingDraft.driver_id) {
        setBookingFormError('Untuk pesanan dengan supir / paket acara berstatus Dikonfirmasi, Anda wajib menugaskan supir yang tersedia.')
        return
      }
      if (bookingDraft.driver_id) {
        const isBusy = isDriverBookedForWindow(bookingDraft.driver_id, { start_at: startAt, end_at: endAt }, bookings)
        if (isBusy) {
          setBookingFormError('Supir yang dipilih sedang memiliki jadwal bentrok pada rentang tanggal/jam sewa tersebut. Silakan pilih supir lain atau ubah jadwal.')
          return
        }
      }
    }

    const isExactDays = totalDurationHrs >= 24 && totalDurationHrs % 24 === 0
    const durationVal = isExactDays ? (totalDurationHrs / 24) : totalDurationHrs
    const durationUnitVal = isExactDays ? 'hari' : 'jam'

    let modeText = bookingDraft.booking_mode
    if (bookingDraft.booking_mode === 'Sewa mobil lepas kunci') {
      if (totalDurationHrs >= 720) modeText = 'Sewa mobil bulanan'
      else if (totalDurationHrs >= 168) modeText = 'Sewa mobil mingguan'
      else modeText = 'Sewa mobil harian'
    } else if (bookingDraft.booking_mode === 'Rental Acara') {
      // Di Supabase PostgreSQL, trigger database mewajibkan booking_mode = 'Sewa mobil + Supir'
      // agar kolom driver_id diizinkan tersimpan (tidak memicu error BOOKING_DOES_NOT_REQUIRE_DRIVER).
      // Detail paket acara dan add-on dekorasi tersimpan lengkap di catatan notes [PAKET ACARA – ...],
      // dan dashboard tetap menampilkannya sebagai badge ungu 'Paket Rental Acara'.
      modeText = 'Sewa mobil + Supir'
    }

    const vehicleSnapshot = [{
      id: selectedVehicle.id,
      name: selectedVehicle.name,
      transmission_type: bookingDraft.transmission_type || selectedVehicle.transmission_options?.[0] || 'automatic',
      powertrain_type: selectedVehicle.powertrain_type || 'gasoline',
      price: dealPriceNum,
      quantity: 1,
    }]

    let bookingCode = generateBookingCode()

    let eventNotesParts = []
    if (bookingDraft.booking_mode === 'Rental Acara') {
      const chosenEventType = bookingDraft.event_type === 'Lainnya'
        ? (bookingDraft.event_type_other.trim() || 'Lainnya')
        : (bookingDraft.event_type || 'Pernikahan')
      eventNotesParts.push(`[PAKET ACARA – ${chosenEventType.toUpperCase()}]`)

      if (Array.isArray(bookingDraft.event_addons) && bookingDraft.event_addons.length > 0) {
        const addonLabels = bookingDraft.event_addons.map((id) => {
          if (id === 'kustom') return bookingDraft.event_addon_custom.trim() || 'Kustom / lainnya'
          return eventAddonOptions.find((opt) => opt.id === id)?.label
        }).filter(Boolean)
        if (addonLabels.length > 0) {
          eventNotesParts.push(`Add-on: ${addonLabels.join(', ')}`)
        }
      }
    }

    const isConfirmed = bookingDraft.status === 'confirmed'
    const manualPaymentMethod = (bookingDraft.payment_method || '').trim()
    const manualSenderName = (bookingDraft.payment_sender_name || bookingDraft.customer_name || '').trim()
    const manualPayAmount = parseInt(String(bookingDraft.payment_amount || bookingDraft.deal_price || '0').replace(/\D/g, ''), 10) || dealPriceNum

    if (isConfirmed) {
      if (!manualPaymentMethod) {
        setBookingFormError('Untuk booking berstatus Dikonfirmasi, metode pembayaran wajib dipilih.')
        return
      }
      if (!manualSenderName || manualSenderName.length < 2) {
        setBookingFormError('Untuk booking berstatus Dikonfirmasi, nama pemilik rekening / pengirim wajib diisi (minimal 2 karakter).')
        return
      }
      if (manualPayAmount <= 0) {
        setBookingFormError('Untuk booking berstatus Dikonfirmasi, nominal pembayaran / DP harus lebih dari Rp 0.')
        return
      }
      if (!bookingDraft.payment_proof_file && !bookingDraft.payment_proof_preview) {
        setBookingFormError('Untuk booking berstatus Dikonfirmasi, bukti pembayaran / transfer wajib diunggah.')
        return
      }
    }

    const cleanUserNotes = bookingDraft.notes.trim() || '[ORDER VIA WA]'
    let fullNotes = eventNotesParts.length > 0
      ? `${eventNotesParts.join('\n')}\n${cleanUserNotes}`
      : cleanUserNotes

    const finalDriverId = requiresDriver && bookingDraft.driver_id ? bookingDraft.driver_id : null

    setSavingBooking(true)
    try {
      let manualProofUrl = bookingDraft.payment_proof_preview || ''
      if (isConfirmed && bookingDraft.payment_proof_file) {
        manualProofUrl = await uploadPaymentProofFile(bookingDraft.payment_proof_file)
      }

      let manualAdminNote = ''
      if (isConfirmed) {
        const isFull = bookingDraft.payment_type === 'full'
        const dpAmount = isFull ? dealPriceNum : manualPayAmount
        const remainingAmount = isFull ? 0 : Math.max(0, dealPriceNum - dpAmount)
        const paymentStatus = isFull || remainingAmount <= 0 ? 'paid' : 'partial'

        const manualPaymentPayload = {
          type: isFull ? 'full' : 'dp',
          status: paymentStatus,
          total_amount: dealPriceNum,
          dp_amount: dpAmount,
          remaining_amount: remainingAmount,
          dp_method: manualPaymentMethod,
          dp_sender_name: manualSenderName,
          dp_proof_url: manualProofUrl,
          dp_notes: (bookingDraft.payment_notes || '').trim(),
          dp_at: new Date().toISOString(),
          settlement: null,
          // Aliases
          method: manualPaymentMethod,
          sender_name: manualSenderName,
          amount: dpAmount,
          proof_url: manualProofUrl,
          notes: (bookingDraft.payment_notes || '').trim(),
          confirmed_at: new Date().toISOString(),
        }
        manualAdminNote = JSON.stringify({ payment: manualPaymentPayload })
        const paySummary = isFull
          ? `[PEMBAYARAN LUNAS: ${manualPaymentPayload.method} - a.n ${manualPaymentPayload.sender_name} (Rp ${formatPrice(dpAmount)})]`
          : `[PEMBAYARAN DP: ${manualPaymentPayload.method} - a.n ${manualPaymentPayload.sender_name} (DP Rp ${formatPrice(dpAmount)} · Sisa Rp ${formatPrice(remainingAmount)})]`
        fullNotes = `${fullNotes}\n${paySummary}`
      }

      // Catatan: Di Supabase, policy RLS public.booking_requests hanya mengizinkan INSERT
      // dengan status 'pending'. Jadi kita insert sebagai 'pending' terlebih dahulu (tanpa .select()),
      // lalu jika admin memilih status 'confirmed', kita update statusnya melalui RPC / update.
      const bookingPayload = {
        customer_name: customerName,
        customer_phone: cleanPhoneNum,
        pickup_address: bookingDraft.pickup_address.trim() || 'Pool Khalisa Rent Car',
        pickup_lat: null,
        pickup_lon: null,
        start_at: startAt,
        end_at: endAt,
        booking_mode: modeText,
        duration: durationVal,
        duration_unit: durationUnitVal,
        vehicle_ids: [selectedVehicle.id],
        vehicle_snapshot: vehicleSnapshot,
        estimated_price: dealPriceNum,
        toll_amount: tollAmountNum,
        toll_included: Boolean(bookingDraft.toll_included),
        toll_type: bookingDraft.toll_included ? 'standard' : null,
        privacy_consent: true,
        booking_code: bookingCode,
        notes: fullNotes,
        admin_note: manualAdminNote,
        status: 'pending',
        driver_id: finalDriverId,
      }
      let { error: insertError } = await supabase
        .from('booking_requests')
        .insert(bookingPayload)

      if (insertError?.code === '23505' && insertError.message?.includes('booking_code')) {
        bookingCode = generateBookingCode()
        ;({ error: insertError } = await supabase
          .from('booking_requests')
          .insert({ ...bookingPayload, booking_code: bookingCode }))
      }

      if (insertError && 'notes' in bookingPayload) {
        const { notes: _omit, ...withoutNotes } = bookingPayload
        ;({ error: insertError } = await supabase
          .from('booking_requests')
          .insert(withoutNotes))
      }

      if (insertError) {
        if (insertError.code === 'P0001' && insertError.message?.includes('VEHICLE_UNAVAILABLE')) {
          setBookingFormError(`Unit armada (${selectedVehicle.name}) sudah terisi jadwal sewa lain pada tanggal & jam tersebut. Silakan pilih armada lain atau sesuaikan jadwal sewa.`)
        } else if (insertError.message?.includes('DRIVER_NOT_AVAILABLE') || insertError.message?.includes('DRIVER_TIME_CONFLICT')) {
          setBookingFormError('Supir yang dipilih sedang tidak tersedia atau memiliki jadwal bentrok pada jam tersebut.')
        } else if (insertError.message?.includes('BOOKING_DOES_NOT_REQUIRE_DRIVER')) {
          setBookingFormError('Layanan ini tidak memerlukan supir. Kosongkan pilihan supir atau pilih mode layanan Dengan Supir.')
        } else {
          setBookingFormError(`Gagal menyimpan booking: ${insertError.message || 'Terjadi kesalahan sistem'}`)
        }
        setSavingBooking(false)
        return
      }

      // Ambil data row yang baru saja disimpan berdasarkan booking_code
      let savedBooking = null
      const { data: newRow } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('booking_code', bookingCode)
        .maybeSingle()

      if (newRow && newRow.id) {
        savedBooking = newRow
      } else {
        savedBooking = {
          ...bookingPayload,
          id: `booking-${Date.now()}`,
          created_at: new Date().toISOString(),
        }
      }

      // Jika admin memilih status Dikonfirmasi, update statusnya sekarang
      let finalStatus = 'pending'
      if (bookingDraft.status === 'confirmed' && savedBooking.id) {
        const bookingId = extractBookingId(savedBooking.id)
        if (requiresDriver && finalDriverId) {
          // Konfirmasi dengan supir
          const rpcRes = await supabase.rpc('confirm_booking_with_driver', { p_booking_id: bookingId })
          if (rpcRes.error) {
            await supabase
              .from('booking_requests')
              .update({ status: 'confirmed', driver_id: finalDriverId, admin_note: manualAdminNote })
              .eq('id', bookingId)
          } else if (manualAdminNote) {
            await supabase
              .from('booking_requests')
              .update({ admin_note: manualAdminNote })
              .eq('id', bookingId)
          }
          await supabase.from('drivers').update({ status: 'on_duty' }).eq('id', finalDriverId)
          setDrivers((prev) => prev.map((d) => d.id === finalDriverId ? { ...d, status: 'on_duty' } : d))
        } else {
          // Konfirmasi tanpa supir
          const rpcRes = await supabase.rpc('update_booking_status', { p_booking_id: bookingId, p_status: 'confirmed' })
          if (rpcRes.error) {
            await supabase
              .from('booking_requests')
              .update({ status: 'confirmed', admin_note: manualAdminNote })
              .eq('id', bookingId)
          } else if (manualAdminNote) {
            await supabase
              .from('booking_requests')
              .update({ admin_note: manualAdminNote })
              .eq('id', bookingId)
          }
        }
        finalStatus = 'confirmed'
      }

      const finalizedBooking = {
        ...savedBooking,
        status: finalStatus,
        driver_id: finalDriverId,
        estimated_price: dealPriceNum,
        admin_note: manualAdminNote || savedBooking.admin_note || '',
        notes: fullNotes,
      }

      // Perbarui list booking di dashboard
      setBookings((prev) => [finalizedBooking, ...prev.filter((b) => b.id !== finalizedBooking.id)])
      setSelectedBooking(finalizedBooking)

      sendDesktopNotification(
        'Booking Manual Berhasil!',
        `${customerName} (${selectedVehicle.name}) - Status: ${finalStatus === 'confirmed' ? 'Dikonfirmasi (Kunci Unit)' : 'Menunggu'}`
      )

      setSavingBooking(false)
      setBookingFormOpen(false)
    } catch (err) {
      setBookingFormError(`Terjadi kesalahan: ${err.message || 'Gagal menyimpan booking'}`)
      setSavingBooking(false)
    }
  }

  async function handleSaveDealPrice(bookingId) {
    const currentBooking = bookings.find((b) => b.id === bookingId)
    if (currentBooking?.status !== 'pending') {
      setPriceActionError('Harga deal hanya bisa diubah saat status booking masih menunggu (pending).')
      return
    }

    const rawVal = dealPriceInput.replace(/\./g, '').trim()
    const newPrice = parseInt(rawVal, 10)
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      setPriceActionError('Nominal harga tidak valid.')
      return
    }

    setSavingPrice(true)
    setPriceActionError('')

    const { error } = await supabase
      .from('booking_requests')
      .update({ estimated_price: newPrice })
      .eq('id', bookingId)

    setSavingPrice(false)

    if (error) {
      console.error('[update deal price error]', error)
      setPriceActionError(error.message || 'Gagal menyimpan harga deal.')
      return
    }

    // Update local state
    setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, estimated_price: newPrice } : b))
    setSelectedBooking((prev) => prev && prev.id === bookingId ? { ...prev, estimated_price: newPrice } : prev)
    setEditingPriceBookingId(null)
  }

  async function handleBookingStatusChange(rawBookingId, status) {
    setBookingActionError('')
    setEditingPriceBookingId(null)
    const bookingId = extractBookingId(rawBookingId)
    const currentBooking = bookings.find((booking) => extractBookingId(booking?.id || booking) === bookingId)
    if (!currentBooking) {
      setBookingActionError('Data booking tidak ditemukan.')
      return
    }
    const allowedTransitions = {
      pending: ['confirmed', 'rejected', 'cancelled'],
      confirmed: ['completed', 'rejected', 'cancelled'],
    }
    if (!allowedTransitions[currentBooking?.status]?.includes(status)) {
      setBookingActionError('Status booking ini sudah final atau transisi status tidak valid.')
      return
    }
    const endTime = Date.parse(currentBooking.end_at)
    if (status === 'completed' && (!Number.isFinite(endTime) || endTime > Date.now())) {
      setBookingActionError('Booking hanya bisa diselesaikan setelah jadwal pengembalian lewat dan kendaraan diterima.')
      return
    }

    const requiresDriver = String(currentBooking.booking_mode ?? '').toLowerCase().includes('supir') || (isEventBooking(currentBooking) && Boolean(currentBooking.driver_id))
    if (status === 'confirmed' && requiresDriver && !currentBooking.driver_id) {
      setBookingActionError('Tentukan supir terlebih dahulu pada kolom supir sebelum mengonfirmasi booking.')
      return
    }

    // Intercept: Jika transisi ke Dikonfirmasi, buka modal verifikasi pembayaran & upload bukti
    if (status === 'confirmed') {
      const existingPayment = getBookingPaymentInfo(currentBooking)
      const estPrice = Number(currentBooking.estimated_price) || 0
      const existingType = existingPayment?.type || (existingPayment && existingPayment.remaining_amount === 0 && existingPayment.amount >= estPrice ? 'full' : 'dp')
      const defaultDp = estPrice > 0 ? Math.round(estPrice * 0.5 / 1000) * 1000 : 500000

      setPaymentConfirmBooking(currentBooking)
      setPaymentConfirmDraft({
        pay_type: existingType,
        method: existingPayment?.dp_method || existingPayment?.method || 'Transfer BCA',
        sender_name: existingPayment?.dp_sender_name || existingPayment?.sender_name || currentBooking.customer_name || '',
        amount: existingPayment?.dp_amount || existingPayment?.amount
          ? formatPrice(existingPayment.dp_amount || existingPayment.amount)
          : (existingType === 'full' ? formatPrice(estPrice) : formatPrice(defaultDp)),
        file: null,
        file_preview: existingPayment?.dp_proof_url || existingPayment?.proof_url || null,
        notes: existingPayment?.dp_notes || existingPayment?.notes || '',
      })
      setPaymentConfirmError('')
      setPaymentConfirmModalOpen(true)
      return
    }

    let { data, error } = status === 'confirmed' && requiresDriver
      ? await supabase.rpc('confirm_booking_with_driver', { p_booking_id: bookingId })
      : await supabase.rpc('update_booking_status', {
        p_booking_id: bookingId,
        p_status: status,
      })

    // Fallback: Jika RPC bentrok overload / ambiguous candidate di PostgreSQL, update langsung tabel booking_requests
    if (error && (error.message?.includes('best candidate') || error.message?.includes('invalid input syntax') || error.message?.includes('confirm_booking_with_driver') || error.message?.includes('function') || error.message?.includes('BOOKING_DOES_NOT_REQUIRE_DRIVER'))) {
      const res = await supabase
        .from('booking_requests')
        .update({ status })
        .eq('id', bookingId)
        .select()

      if (!res.error) {
        data = res.data?.[0] || { ...currentBooking, status }
        error = null
        if (status === 'confirmed' && currentBooking.driver_id) {
          await supabase.from('drivers').update({ status: 'on_duty' }).eq('id', currentBooking.driver_id)
        }
      }
    }

    if (error) {
      if (error.message?.includes('TERMINAL_BOOKING')) {
        setBookingActionError('Booking yang sudah dibatalkan atau ditolak tidak dapat diaktifkan kembali.')
      } else if (error.message?.includes('BOOKING_RETURN_NOT_DUE')) {
        setBookingActionError('Booking hanya bisa diselesaikan setelah jadwal pengembalian lewat dan kendaraan diterima.')
      } else if (error.message?.includes('BOOKING_MUST_BE_CONFIRMED')) {
        setBookingActionError('Booking harus dikonfirmasi sebelum dapat diselesaikan.')
      } else if (status === 'confirmed' && error.message?.includes('ADMIN_REQUIRED')) {
        setBookingActionError('Akun ini tidak memiliki izin admin untuk mengonfirmasi booking dengan supir.')
      } else if (status === 'confirmed' && error.code === 'P0001' && error.message?.includes('VEHICLE_UNAVAILABLE')) {
        setBookingActionError('Unit pada booking ini sudah dipakai booking confirmed lain di jadwal yang sama. Booking tetap menunggu; hubungi pemesan untuk memilih varian atau jadwal lain.')
      } else if (status === 'confirmed' && error.message?.includes('DRIVER_NOT_AVAILABLE')) {
        setBookingActionError('Supir yang cocok tidak tersedia pada jadwal ini. Booking tetap menunggu; ubah jadwal atau cek penugasan supir.')
      } else if (status === 'confirmed' && error.message?.includes('confirm_booking_with_driver')) {
        setBookingActionError('RPC konfirmasi otomatis dengan supir belum tersedia. Terapkan migration Supabase terbaru sebelum mengonfirmasi booking yang membutuhkan supir.')
      } else if (error.code === '42501' || error.message?.includes('permission denied')) {
        setBookingActionError('Izin update status belum aktif. Jalankan migration workflow booking di Supabase.')
      } else {
        setBookingActionError(`Gagal memperbarui status: ${error.message}`)
      }
      return
    }

    const resolvedData = Array.isArray(data) ? data[0] : (typeof data === 'string' && data.startsWith('{') ? JSON.parse(data) : data)
    const updatedBookings = bookings.map((booking) => {
      const bId = extractBookingId(booking?.id || booking)
      if (bId === bookingId) {
        return resolvedData && typeof resolvedData === 'object' && resolvedData.id
          ? resolvedData
          : { ...booking, status }
      }
      return booking
    })
    setBookings(updatedBookings)
    setSelectedBooking((prev) => {
      if (!prev) return prev
      return extractBookingId(prev?.id || prev) === bookingId ? { ...prev, status } : prev
    })
    const { data: driverList, error: driversError } = await supabase.from('drivers').select('*').order('name', { ascending: true })
    if (driversError) setBookingActionError('Status booking tersimpan, tetapi daftar supir gagal diperbarui. Muat ulang dashboard.')
    else setDrivers(await releaseExpiredDrivers(driverList ?? [], updatedBookings))
  }

  async function handleConfirmPaymentAndBooking(event) {
    if (event?.preventDefault) event.preventDefault()
    if (!paymentConfirmBooking) return
    setPaymentConfirmError('')

    const bookingId = extractBookingId(paymentConfirmBooking.id)
    const isFull = paymentConfirmDraft.pay_type === 'full'
    const method = (paymentConfirmDraft.method || '').trim()
    const senderName = (paymentConfirmDraft.sender_name || '').trim()
    const estPrice = Number(paymentConfirmBooking.estimated_price) || 0
    const cleanAmount = isFull
      ? estPrice
      : (parseInt(String(paymentConfirmDraft.amount || '0').replace(/\D/g, ''), 10) || 0)
    const hasProofFile = Boolean(paymentConfirmDraft.file)
    const hasExistingProof = Boolean(paymentConfirmDraft.file_preview)

    if (!method) {
      setPaymentConfirmError('Pilih metode pembayaran yang digunakan.')
      return
    }
    if (!senderName || senderName.length < 2) {
      setPaymentConfirmError('Nama pemilik rekening / pengirim wajib diisi (minimal 2 karakter).')
      return
    }
    if (cleanAmount <= 0) {
      setPaymentConfirmError('Nominal pembayaran / DP harus lebih dari Rp 0.')
      return
    }
    if (!hasProofFile && !hasExistingProof) {
      setPaymentConfirmError('Bukti transfer / struk pembayaran wajib diunggah.')
      return
    }

    setPaymentConfirmSubmitting(true)
    try {
      let proofUrl = paymentConfirmDraft.file_preview || ''
      if (hasProofFile) {
        proofUrl = await uploadPaymentProofFile(paymentConfirmDraft.file)
      }

      const dpAmount = cleanAmount
      const remainingAmount = isFull ? 0 : Math.max(0, estPrice - dpAmount)
      const paymentStatus = isFull || remainingAmount <= 0 ? 'paid' : 'partial'

      const paymentData = {
        type: isFull ? 'full' : 'dp',
        status: paymentStatus,
        total_amount: estPrice,
        dp_amount: dpAmount,
        remaining_amount: remainingAmount,
        dp_method: method,
        dp_sender_name: senderName,
        dp_proof_url: proofUrl,
        dp_notes: (paymentConfirmDraft.notes || '').trim(),
        dp_at: new Date().toISOString(),
        settlement: null,
        // Legacy aliases
        method,
        sender_name: senderName,
        amount: dpAmount,
        proof_url: proofUrl,
        notes: (paymentConfirmDraft.notes || '').trim(),
        confirmed_at: new Date().toISOString(),
      }
      const adminNotePayload = JSON.stringify({ payment: paymentData })
      const paymentSummaryNote = isFull
        ? `[PEMBAYARAN LUNAS: ${method} - a.n ${senderName} (Rp ${formatPrice(dpAmount)})]`
        : `[PEMBAYARAN DP: ${method} - a.n ${senderName} (DP Rp ${formatPrice(dpAmount)} · Sisa Rp ${formatPrice(remainingAmount)})]`
      const originalNotes = paymentConfirmBooking.notes || ''
      const updatedNotes = originalNotes.includes('[PEMBAYARAN')
        ? originalNotes.replace(/\[PEMBAYARAN[^\]]*\]/g, paymentSummaryNote)
        : (originalNotes ? `${originalNotes}\n${paymentSummaryNote}` : paymentSummaryNote)

      const requiresDriver = String(paymentConfirmBooking.booking_mode ?? '').toLowerCase().includes('supir') || (isEventBooking(paymentConfirmBooking) && Boolean(paymentConfirmBooking.driver_id))

      let finalStatus = paymentConfirmBooking.status
      let resolvedData = null

      if (paymentConfirmBooking.status === 'pending') {
        let { data, error } = requiresDriver
          ? await supabase.rpc('confirm_booking_with_driver', { p_booking_id: bookingId })
          : await supabase.rpc('update_booking_status', {
              p_booking_id: bookingId,
              p_status: 'confirmed',
            })

        if (error && (error.message?.includes('best candidate') || error.message?.includes('invalid input syntax') || error.message?.includes('confirm_booking_with_driver') || error.message?.includes('function') || error.message?.includes('BOOKING_DOES_NOT_REQUIRE_DRIVER'))) {
          const res = await supabase
            .from('booking_requests')
            .update({ status: 'confirmed' })
            .eq('id', bookingId)
            .select()
          if (!res.error) {
            data = res.data?.[0] || { ...paymentConfirmBooking, status: 'confirmed' }
            error = null
            if (paymentConfirmBooking.driver_id) {
              await supabase.from('drivers').update({ status: 'on_duty' }).eq('id', paymentConfirmBooking.driver_id)
            }
          }
        }

        if (error) {
          if (error.code === 'P0001' && error.message?.includes('VEHICLE_UNAVAILABLE')) {
            setPaymentConfirmError('Unit pada booking ini sudah dipakai booking confirmed lain di jadwal yang sama. Booking tetap menunggu; hubungi pemesan untuk memilih varian atau jadwal lain.')
          } else if (error.message?.includes('DRIVER_NOT_AVAILABLE')) {
            setPaymentConfirmError('Supir yang cocok tidak tersedia pada jadwal ini. Booking tetap menunggu; ubah jadwal atau cek penugasan supir.')
          } else {
            setPaymentConfirmError(`Gagal konfirmasi status: ${error.message || 'Terjadi kesalahan'}`)
          }
          setPaymentConfirmSubmitting(false)
          return
        }
        resolvedData = Array.isArray(data) ? data[0] : (typeof data === 'string' && data.startsWith('{') ? JSON.parse(data) : data)
        finalStatus = 'confirmed'
      }

      // Update admin_note & notes dengan data pembayaran
      const { error: updateNoteErr } = await supabase
        .from('booking_requests')
        .update({
          admin_note: adminNotePayload,
          notes: updatedNotes,
        })
        .eq('id', bookingId)

      if (updateNoteErr) {
        console.warn('Gagal update admin_note:', updateNoteErr)
      }

      const finalUpdatedBooking = {
        ...(resolvedData && typeof resolvedData === 'object' && resolvedData.id ? resolvedData : paymentConfirmBooking),
        status: finalStatus,
        admin_note: adminNotePayload,
        notes: updatedNotes,
      }

      const updatedBookings = bookings.map((b) => {
        if (extractBookingId(b?.id || b) === bookingId) {
          return finalUpdatedBooking
        }
        return b
      })

      setBookings(updatedBookings)
      if (selectedBooking && extractBookingId(selectedBooking.id) === bookingId) {
        setSelectedBooking(finalUpdatedBooking)
      }

      const { data: driverList } = await supabase.from('drivers').select('*').order('name', { ascending: true })
      if (driverList) setDrivers(await releaseExpiredDrivers(driverList, updatedBookings))

      sendDesktopNotification(
        'Booking Dikonfirmasi!',
        `${paymentConfirmBooking.customer_name} - Pembayaran ${method} (Rp ${formatPrice(cleanAmount)}) tercatat.`
      )

      setPaymentConfirmModalOpen(false)
      setPaymentConfirmBooking(null)
    } catch (err) {
      setPaymentConfirmError(`Terjadi kesalahan: ${err.message || 'Gagal menyimpan konfirmasi pembayaran'}`)
    } finally {
      setPaymentConfirmSubmitting(false)
    }
  }

  async function handleSaveSettlement(event) {
    if (event?.preventDefault) event.preventDefault()
    if (!settlementBooking) return
    setSettlementError('')

    const bookingId = extractBookingId(settlementBooking.id)
    const method = (settlementDraft.method || '').trim()
    const senderName = (settlementDraft.sender_name || '').trim()
    const cleanAmount = parseInt(String(settlementDraft.amount || '0').replace(/\D/g, ''), 10) || 0
    const hasProofFile = Boolean(settlementDraft.file)
    const hasExistingProof = Boolean(settlementDraft.file_preview)

    if (!method) {
      setSettlementError('Pilih metode pembayaran pelunasan.')
      return
    }
    if (!senderName || senderName.length < 2) {
      setSettlementError('Nama pemilik rekening / pembayar wajib diisi (minimal 2 karakter).')
      return
    }
    if (cleanAmount <= 0) {
      setSettlementError('Nominal pelunasan harus lebih dari Rp 0.')
      return
    }
    if (!hasProofFile && !hasExistingProof) {
      setSettlementError('Bukti transfer / struk pelunasan wajib diunggah.')
      return
    }

    setSettlementSubmitting(true)
    try {
      let proofUrl = settlementDraft.file_preview || ''
      if (hasProofFile) {
        proofUrl = await uploadPaymentProofFile(settlementDraft.file)
      }

      const currentPayment = getBookingPaymentInfo(settlementBooking) || {}
      const updatedPaymentData = {
        ...currentPayment,
        type: 'dp',
        status: 'paid',
        remaining_amount: 0,
        settlement: {
          method,
          sender_name: senderName,
          amount: cleanAmount,
          proof_url: proofUrl,
          notes: (settlementDraft.notes || '').trim(),
          settled_at: new Date().toISOString(),
        },
      }

      const adminNotePayload = JSON.stringify({ payment: updatedPaymentData })
      const settlementSummaryNote = `[PELUNASAN: ${method} - a.n ${senderName} (Rp ${formatPrice(cleanAmount)}) | LUNAS]`
      const originalNotes = settlementBooking.notes || ''
      const updatedNotes = originalNotes.includes('[PELUNASAN:')
        ? originalNotes.replace(/\[PELUNASAN:[^\]]*\]/g, settlementSummaryNote)
        : (originalNotes ? `${originalNotes}\n${settlementSummaryNote}` : settlementSummaryNote)

      const { error: updateErr } = await supabase
        .from('booking_requests')
        .update({
          admin_note: adminNotePayload,
          notes: updatedNotes,
        })
        .eq('id', bookingId)

      if (updateErr) {
        throw new Error(`Gagal menyimpan ke database: ${updateErr.message}`)
      }

      const finalUpdated = {
        ...settlementBooking,
        admin_note: adminNotePayload,
        notes: updatedNotes,
      }

      const updatedBookings = bookings.map((b) =>
        extractBookingId(b?.id || b) === bookingId ? finalUpdated : b
      )
      setBookings(updatedBookings)
      if (selectedBooking && extractBookingId(selectedBooking?.id || selectedBooking) === bookingId) {
        setSelectedBooking(finalUpdated)
      }

      sendDesktopNotification(
        'Pelunasan Berhasil!',
        `${settlementBooking.customer_name} - Sisa tagihan Rp ${formatPrice(cleanAmount)} telah lunas.`
      )

      setSettlementModalOpen(false)
      setSettlementBooking(null)
    } catch (err) {
      setSettlementError(`Terjadi kesalahan: ${err.message || 'Gagal menyimpan bukti pelunasan'}`)
    } finally {
      setSettlementSubmitting(false)
    }
  }

  function openDriverForm(driver = null) {
    setEditingDriverId(driver?.id ?? null)
    setDriverDraft(driver ? {
      name: driver.name ?? '',
      phone: driver.phone ?? '',
      status: driver.status ?? 'available',
      sim_type: driver.sim_type ?? 'SIM A',
      notes: driver.notes ?? '',
    } : emptyDriverDraft)
    setDriverFormError('')
    setDriverFormOpen(true)
  }

  async function handleSaveDriver(event) {
    event.preventDefault()
    setDriverFormError('')

    const name = driverDraft.name.trim()
    const phone = driverDraft.phone.trim()

    if (!name) {
      setDriverFormError('Nama supir wajib diisi.')
      return
    }
    if (!phone) {
      setDriverFormError('Nomor telepon / WhatsApp wajib diisi.')
      return
    }
    if (editingDriverId && driverDraft.status !== 'on_duty' && bookings.some(
      (booking) => booking.driver_id === editingDriverId && ['pending', 'confirmed'].includes(booking.status)
    )) {
      setDriverFormError('Supir masih memiliki booking aktif dan statusnya belum bisa diubah menjadi tersedia atau libur.')
      return
    }

    const payload = {
      name,
      phone,
      status: driverDraft.status,
      sim_type: driverDraft.sim_type.trim() || 'SIM A',
      notes: driverDraft.notes.trim() || null,
    }

    setSavingDriver(true)
    try {
      const query = editingDriverId
        ? supabase.from('drivers').update(payload).eq('id', editingDriverId)
        : supabase.from('drivers').insert(payload)

      const { data, error } = await query.select('*').single()
      if (error) throw error

      setDrivers((current) => {
        const next = editingDriverId
          ? current.map((driver) => (driver.id === editingDriverId ? data : driver))
          : [...current, data]
        return next.sort((a, b) => a.name.localeCompare(b.name))
      })
      setDriverFormOpen(false)
    } catch (error) {
      setDriverFormError(error.message || 'Gagal menyimpan data supir.')
    } finally {
      setSavingDriver(false)
    }
  }

  async function handleDeleteDriver(driverId) {
    const target = drivers.find((d) => d.id === driverId)
    if (!window.confirm(`Hapus supir "${target?.name ?? 'ini'}"?`)) return

    try {
      const { error } = await supabase.from('drivers').delete().eq('id', driverId)
      if (error) throw error
      setDrivers((current) => current.filter((d) => d.id !== driverId))
    } catch (error) {
      alert(`Gagal menghapus supir: ${error.message}`)
    }
  }

  async function handleDriverStatusChange(driverId, newStatus) {
    if (newStatus !== 'on_duty' && bookings.some(
      (booking) => booking.driver_id === driverId && ['pending', 'confirmed'].includes(booking.status)
    )) {
      alert('Supir masih memiliki booking aktif dan belum bisa ditandai tersedia atau libur.')
      return
    }

    const { data, error } = await supabase
      .from('drivers')
      .update({ status: newStatus })
      .eq('id', driverId)
      .select('*')
      .single()

    if (error) {
      alert(`Gagal mengubah status supir: ${error.message}`)
      return
    }

    setDrivers((current) => current.map((d) => (d.id === driverId ? data : d)))
  }

  async function handleAssignDriver(rawBookingId, driverId) {
    setBookingActionError('')
    const bookingId = extractBookingId(rawBookingId)
    const targetDriverId = driverId || null
    const currentBooking = bookings.find((booking) => extractBookingId(booking?.id || booking) === bookingId)
    if (!currentBooking || !['pending', 'confirmed'].includes(currentBooking.status)) {
      setBookingActionError('Supir hanya dapat ditugaskan pada booking yang menunggu atau dikonfirmasi.')
      return
    }
    if (!String(currentBooking.booking_mode ?? '').toLowerCase().includes('supir') && !isEventBooking(currentBooking)) {
      setBookingActionError('Booking lepas kunci tidak dapat diubah menjadi booking dengan supir.')
      return
    }

    let { data, error } = await supabase.rpc('assign_booking_driver', {
      p_booking_id: bookingId,
      p_driver_id: targetDriverId,
    })

    // Fallback: Jika RPC bentrok overload / ambiguous candidate di PostgreSQL, update langsung tabel booking_requests
    if (error && (error.message?.includes('best candidate') || error.message?.includes('function') || error.message?.includes('invalid input syntax') || error.message?.includes('BOOKING_DOES_NOT_REQUIRE_DRIVER'))) {
      const updatePayload = {
        driver_id: targetDriverId,
        ...(isEventBooking(currentBooking) && targetDriverId ? { booking_mode: 'Sewa mobil + Supir' } : {})
      }
      const res = await supabase
        .from('booking_requests')
        .update(updatePayload)
        .eq('id', bookingId)
        .select()

      if (!res.error) {
        data = res.data?.[0] || { ...currentBooking, driver_id: targetDriverId }
        error = null
        if (targetDriverId) {
          await supabase.from('drivers').update({ status: 'on_duty' }).eq('id', targetDriverId)
        }
      }
    }

    if (error) {
      const message = error.message ?? ''
      setBookingActionError(message.includes('DRIVER_TIME_CONFLICT')
        ? 'Supir sudah memiliki booking lain pada jadwal ini.'
        : message.includes('DRIVER_NOT_AVAILABLE')
          ? 'Supir sedang tidak tersedia untuk ditugaskan.'
          : message.includes('BOOKING_NOT_ACTIVE')
            ? 'Supir hanya dapat ditugaskan pada booking yang masih aktif.'
            : error.code === '42501' || message.includes('permission denied')
              ? 'Izin penugasan supir belum aktif. Jalankan migration workflow booking di Supabase.'
              : `Gagal menugaskan supir: ${message}`)
      return
    }

    const resolvedData = Array.isArray(data) ? data[0] : (typeof data === 'string' && data.startsWith('{') ? JSON.parse(data) : data)
    const updatedBookings = bookings.map((booking) => {
      const bId = extractBookingId(booking?.id || booking)
      if (bId === bookingId) {
        return resolvedData && typeof resolvedData === 'object' && resolvedData.id
          ? resolvedData
          : { ...booking, driver_id: targetDriverId }
      }
      return booking
    })
    setBookings(updatedBookings)
    setSelectedBooking((prev) => {
      if (!prev) return prev
      return extractBookingId(prev?.id || prev) === bookingId ? { ...prev, driver_id: targetDriverId } : prev
    })
    const { data: driverList, error: driversError } = await supabase.from('drivers').select('*').order('name', { ascending: true })
    if (driversError) setBookingActionError('Supir berhasil ditugaskan, tetapi daftar supir gagal diperbarui. Muat ulang dashboard.')
    else setDrivers(driverList ?? [])
  }

  async function handleExportBookingsExcel(bookingsToExport, rangeLabel) {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Khalisa Rent Car'
    workbook.created = new Date()

    const sheet = workbook.addWorksheet('Booking', { views: [{ state: 'frozen', ySplit: 1 }] })

    sheet.columns = [
      { header: 'No.',                  key: 'no',               width: 5  },
      { header: 'Kode Booking',         key: 'code',             width: 14 },
      { header: 'Dibuat',               key: 'created',          width: 18 },
      { header: 'Pemesan',              key: 'name',             width: 22 },
      { header: 'Telepon',              key: 'phone',            width: 16 },
      { header: 'Mulai Sewa',           key: 'start',            width: 18 },
      { header: 'Selesai Sewa',         key: 'end',              width: 18 },
      { header: 'Kendaraan',            key: 'vehicle',          width: 32 },
      { header: 'Layanan',              key: 'mode',             width: 20 },
      { header: 'Durasi',               key: 'duration',         width: 12 },
      { header: 'Supir',                key: 'driver',           width: 18 },
      { header: 'Status Booking',       key: 'status',           width: 16 },
      { header: 'Status Bayar',         key: 'payment_status',   width: 18 },
      { header: 'Tipe Bayar',           key: 'payment_type',     width: 16 },
      { header: 'Metode Bayar',         key: 'payment_method',   width: 20 },
      { header: 'Nama Pengirim',        key: 'payment_sender',   width: 22 },
      { header: 'Total Sewa (Rp)',      key: 'price',            width: 16 },
      { header: 'Dibayar (Rp)',         key: 'paid_amount',      width: 16 },
      { header: 'Sisa Tagihan (Rp)',    key: 'remaining_amount', width: 16 },
      { header: 'Catatan',              key: 'notes',            width: 30 },
    ]

    const headerRow = sheet.getRow(1)
    headerRow.eachCell((cell) => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Calibri' }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false }
      cell.border    = {
        top:    { style: 'thin', color: { argb: 'FF1E3A5F' } },
        bottom: { style: 'thin', color: { argb: 'FF1E3A5F' } },
        left:   { style: 'thin', color: { argb: 'FF1E3A5F' } },
        right:  { style: 'thin', color: { argb: 'FF1E3A5F' } },
      }
    })
    headerRow.height = 28

    const statusColors = {
      pending:   { bg: 'FFFFF3CD', fg: 'FF856404' },
      confirmed: { bg: 'FFD1ECF1', fg: 'FF0C5460' },
      completed: { bg: 'FFD4EDDA', fg: 'FF155724' },
      rejected:  { bg: 'FFF8D7DA', fg: 'FF721C24' },
      cancelled: { bg: 'FFE2E3E5', fg: 'FF383D41' },
    }

    const centerColumns = new Set(['no', 'code', 'created', 'start', 'end', 'duration', 'status', 'payment_status', 'payment_type'])

    bookingsToExport.forEach((booking, index) => {
      const pInfo = getBookingPaymentInfo(booking)
      const estPrice = Number(booking.estimated_price) || 0

      let payStatus = 'Menunggu'
      let payType = '-'
      let payMethod = '-'
      let paySender = '-'
      let paidAmt = 0
      let remAmt = estPrice

      if (pInfo) {
        if (pInfo.status === 'paid') {
          payStatus = 'Lunas (100%)'
          if (pInfo.settlement) {
            payType = 'DP + Pelunasan'
            payMethod = pInfo.dp_method === pInfo.settlement.method
              ? (pInfo.dp_method || '-')
              : `${pInfo.dp_method || '-'} + ${pInfo.settlement.method || '-'}`
            paySender = pInfo.dp_sender_name === pInfo.settlement.sender_name
              ? (pInfo.dp_sender_name || '-')
              : `${pInfo.dp_sender_name || '-'} / ${pInfo.settlement.sender_name || '-'}`
            paidAmt = Number(pInfo.total_amount) || estPrice
          } else {
            payType = pInfo.type === 'dp' ? 'Lunas' : 'Lunas 100%'
            payMethod = pInfo.dp_method || pInfo.method || '-'
            paySender = pInfo.dp_sender_name || pInfo.sender_name || '-'
            paidAmt = Number(pInfo.total_amount || pInfo.amount || pInfo.dp_amount) || estPrice
          }
          remAmt = 0
        } else if (pInfo.remaining_amount > 0 || pInfo.type === 'dp') {
          payStatus = 'DP (Uang Muka)'
          payType = 'DP'
          payMethod = pInfo.dp_method || pInfo.method || '-'
          paySender = pInfo.dp_sender_name || pInfo.sender_name || '-'
          paidAmt = Number(pInfo.dp_amount || pInfo.amount) || 0
          remAmt = Number(pInfo.remaining_amount) || Math.max(0, estPrice - paidAmt)
        }
      } else if (booking.status === 'confirmed') {
        payStatus = 'Dikonfirmasi'
        payType = 'Lunas'
        paidAmt = estPrice
        remAmt = 0
      } else if (booking.status === 'cancelled' || booking.status === 'rejected') {
        payStatus = booking.status === 'cancelled' ? 'Dibatalkan' : 'Ditolak'
        payType = '-'
        paidAmt = 0
        remAmt = 0
      } else {
        payStatus = 'Menunggu Bayar'
        payType = 'Belum Bayar'
        paidAmt = 0
        remAmt = estPrice
      }

      const row = sheet.addRow({
        no:               index + 1,
        code:             booking.booking_code ?? '-',
        created:          formatJakartaDateTime(booking.created_at),
        name:             booking.customer_name,
        phone:            booking.customer_phone,
        start:            formatJakartaDateTime(booking.start_at),
        end:              formatJakartaDateTime(booking.end_at),
        vehicle:          (booking.vehicle_snapshot ?? []).map(formatBookedVehicle).join(' + '),
        mode:             booking.booking_mode,
        duration:         formatDuration(booking.duration, booking.duration_unit),
        driver:           drivers.find((d) => d.id === booking.driver_id)?.name ?? '-',
        status:           bookingStatusLabels[booking.status] ?? booking.status,
        payment_status:   payStatus,
        payment_type:     payType,
        payment_method:   payMethod,
        payment_sender:   paySender,
        price:            estPrice,
        paid_amount:      paidAmt,
        remaining_amount: remAmt,
        notes:            (booking.notes || '').replace(/[\r\n]+/g, ' ').trim(),
      })

      const isEven = index % 2 === 1
      const rowBg  = isEven ? 'FFF5F7FA' : 'FFFFFFFF'

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const colKey = sheet.columns[colNumber - 1]?.key
        const isCentered = centerColumns.has(colKey)
        const isRightAligned = colKey === 'price' || colKey === 'paid_amount' || colKey === 'remaining_amount'

        cell.font      = { size: 10, name: 'Calibri' }
        cell.alignment = {
          vertical: 'middle',
          horizontal: isCentered ? 'center' : (isRightAligned ? 'right' : 'left'),
        }
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } }
        cell.border    = {
          top:    { style: 'hair', color: { argb: 'FFD0D7E0' } },
          bottom: { style: 'hair', color: { argb: 'FFD0D7E0' } },
          left:   { style: 'hair', color: { argb: 'FFD0D7E0' } },
          right:  { style: 'hair', color: { argb: 'FFD0D7E0' } },
        }
      })

      const statusCell = row.getCell('status')
      const tone = statusColors[booking.status]
      if (tone) {
        statusCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: tone.bg } }
        statusCell.font      = { size: 10, name: 'Calibri', bold: true, color: { argb: tone.fg } }
        statusCell.alignment = { vertical: 'middle', horizontal: 'center' }
      }

      const payStatusCell = row.getCell('payment_status')
      if (payStatus.includes('Lunas')) {
        payStatusCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } }
        payStatusCell.font      = { size: 10, name: 'Calibri', bold: true, color: { argb: 'FF155724' } }
        payStatusCell.alignment = { vertical: 'middle', horizontal: 'center' }
      } else if (payStatus.includes('DP')) {
        payStatusCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } }
        payStatusCell.font      = { size: 10, name: 'Calibri', bold: true, color: { argb: 'FF856404' } }
        payStatusCell.alignment = { vertical: 'middle', horizontal: 'center' }
      } else if (payStatus.includes('Menunggu')) {
        payStatusCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } }
        payStatusCell.font      = { size: 10, name: 'Calibri', color: { argb: 'FF721C24' } }
        payStatusCell.alignment = { vertical: 'middle', horizontal: 'center' }
      }

      const priceCell = row.getCell('price')
      priceCell.numFmt    = '#,##0'
      priceCell.font      = { size: 10, name: 'Calibri', bold: true }
      priceCell.alignment = { vertical: 'middle', horizontal: 'right' }

      const paidCell = row.getCell('paid_amount')
      paidCell.numFmt    = '#,##0'
      paidCell.font      = { size: 10, name: 'Calibri', bold: true, color: { argb: 'FF155724' } }
      paidCell.alignment = { vertical: 'middle', horizontal: 'right' }

      const remCell = row.getCell('remaining_amount')
      remCell.numFmt    = '#,##0'
      remCell.font      = { size: 10, name: 'Calibri', bold: remAmt > 0, color: { argb: remAmt > 0 ? 'FF721C24' : 'FF6C757D' } }
      remCell.alignment = { vertical: 'middle', horizontal: 'right' }

      row.height = 22
    })

    const totalEstPrice = bookingsToExport.reduce((sum, b) => sum + (Number(b.estimated_price) || 0), 0)
    const totalPaidAmount = bookingsToExport.reduce((sum, b) => {
      const p = getBookingPaymentInfo(b)
      if (p?.status === 'paid') return sum + (Number(p.total_amount || p.amount || b.estimated_price) || 0)
      if (p) return sum + (Number(p.dp_amount || p.amount) || 0)
      if (b.status === 'confirmed') return sum + (Number(b.estimated_price) || 0)
      return sum
    }, 0)
    const totalRemaining = bookingsToExport.reduce((sum, b) => {
      const p = getBookingPaymentInfo(b)
      if (p?.status === 'paid') return sum
      if (p) return sum + (Number(p.remaining_amount) || 0)
      if (['completed', 'confirmed', 'cancelled', 'rejected'].includes(b.status)) return sum
      return sum + (Number(b.estimated_price) || 0)
    }, 0)

    const totalRow = sheet.addRow({
      no: '',
      payment_sender: 'TOTAL',
      price: totalEstPrice,
      paid_amount: totalPaidAmount,
      remaining_amount: totalRemaining,
    })

    const senderCell = totalRow.getCell('payment_sender')
    senderCell.value     = 'TOTAL'
    senderCell.font      = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FF1E3A5F' } }
    senderCell.alignment = { horizontal: 'right', vertical: 'middle' }

    const formatTotalNumCell = (cellKey, color) => {
      const c = totalRow.getCell(cellKey)
      c.numFmt    = '#,##0'
      c.font      = { bold: true, size: 10, name: 'Calibri', color: { argb: color } }
      c.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF5' } }
      c.alignment = { horizontal: 'right', vertical: 'middle' }
    }

    formatTotalNumCell('price', 'FF1E3A5F')
    formatTotalNumCell('paid_amount', 'FF155724')
    formatTotalNumCell('remaining_amount', totalRemaining > 0 ? 'FF721C24' : 'FF1E3A5F')

    totalRow.height = 24
    totalRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top:    { style: 'medium', color: { argb: 'FF1E3A5F' } },
        bottom: { style: 'medium', color: { argb: 'FF1E3A5F' } },
        left:   { style: 'hair',   color: { argb: 'FFD0D7E0' } },
        right:  { style: 'hair',   color: { argb: 'FFD0D7E0' } },
      }
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const url    = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const link   = document.createElement('a')
    link.href     = url
    link.download = `booking-khalisa-${rangeLabel}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
  }
  function showBookingDetails(status) {
    setBookingStatusFilter(status)
    window.requestAnimationFrame(() => {
      document.querySelector('[aria-label="Inbox booking"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  if (checkingSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-ice text-muted" role="status">
        <div className="grid justify-items-center gap-3">
          <span className="size-8 animate-spin rounded-full border-2 border-line border-t-crimson" aria-hidden="true" />
          <span className="text-[.85rem]">Memverifikasi akses administrator...</span>
        </div>
      </main>
    )
  }

  const activeVehicles = vehicles.filter((vehicle) => vehicle.is_active)
  const modelCount = new Set(activeVehicles.map((vehicle) => vehicle.name)).size
  const totalUnits = activeVehicles.reduce((total, vehicle) => total + getVehicleStock(vehicle), 0)
  const readyUnits = activeVehicles.reduce((total, vehicle) => total + (isVehicleReady(vehicle) ? getAvailableVehicleStock(vehicle) : 0), 0)
  const filteredVehicles = vehicles.filter((vehicle) => `${vehicle.name} ${vehicle.category}`.toLowerCase().includes(vehicleSearch.trim().toLowerCase()))

  // Hitung top 3 terlaris untuk penanda di tabel armada
  const fleetTop3Names = (() => {
    const completedBookings = bookings.filter((b) => b.status === 'completed')
    const countByName = {}
    for (const booking of completedBookings) {
      for (const v of (booking.vehicle_snapshot ?? [])) {
        if (!v.name) continue
        countByName[v.name] = (countByName[v.name] ?? 0) + (v.quantity ?? 1)
      }
    }
    return Object.entries(countByName)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name)
  })()
  const bookingDateRange = (() => {
    if (bookingPeriod === 'all') return null
    const today = financeTodayKey || getJakartaDateKey(new Date()) || toDateKey(new Date())
    if (bookingPeriod === 'today') {
      return { start: today, end: today, label: 'Hari ini' }
    }
    if (bookingPeriod === 'tomorrow') {
      const tomorrow = shiftDateKey(today, 1)
      return { start: tomorrow, end: tomorrow, label: 'Besok' }
    }
    if (bookingPeriod === 'next7') {
      const next7 = shiftDateKey(today, 6)
      return { start: today, end: next7, label: '7 hari ke depan' }
    }
    if (bookingPeriod === 'month') {
      const targetMonth = bookingMonth || today.slice(0, 7)
      const [year, month] = targetMonth.split('-').map(Number)
      const endDay = toDateKey(new Date(year, month, 0))
      const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
      return {
        start: `${targetMonth}-01`,
        end: endDay,
        label: `${monthNames[month] ?? ''} ${year}`,
      }
    }
    if (bookingPeriod === 'range') {
      if (!bookingRangeStart || !bookingRangeEnd) return null
      return {
        start: bookingRangeStart,
        end: bookingRangeEnd,
        label: `${formatDateLabel(bookingRangeStart)} – ${formatDateLabel(bookingRangeEnd)}`,
      }
    }
    return null
  })()

  const dateFilteredBookings = bookings.filter((booking) => {
    if (!bookingDateRange) return true
    const bookingStart = getJakartaDateKey(booking.start_at)
    if (!bookingStart) return false
    return bookingStart >= bookingDateRange.start && bookingStart <= bookingDateRange.end
  })

  const filteredBookings = dateFilteredBookings.filter((booking) => {
    const matchesStatus = bookingStatusFilter === 'all'
      ? true
      : bookingStatusFilter === 'acara'
        ? isEventBooking(booking)
        : booking.status === bookingStatusFilter
    const searchText = `${booking.customer_name} ${booking.customer_phone} ${booking.booking_code ?? ''} ${booking.pickup_address}`.toLowerCase()
    return matchesStatus && searchText.includes(bookingSearch.trim().toLowerCase())
  })
  const filteredDrivers = drivers.filter((driver) => {
    const matchesStatus = driverStatusFilter === 'all' || driver.status === driverStatusFilter
    const searchText = `${driver.name} ${driver.phone} ${driver.notes ?? ''} ${driver.sim_type ?? ''}`.toLowerCase()
    return matchesStatus && searchText.includes(driverSearch.trim().toLowerCase())
  })
  const financeDateRange = getFinanceDateRange(financePeriod, financeTodayKey, financeMonthKey, financeStartDate, financeEndDate)
  const financeRangeInvalid = financePeriod === 'custom' && financeStartDate && financeEndDate && financeStartDate > financeEndDate
  const financeRangeIncomplete = financePeriod === 'custom' && (!financeStartDate || !financeEndDate)
  const financialBookings = bookings.filter((booking) => {
    if (!financeDateRange) return true
    const startDate = getJakartaDateKey(booking.start_at)
    return Boolean(startDate && financeDateRange.start && financeDateRange.end && financeDateRange.start <= financeDateRange.end && startDate >= financeDateRange.start && startDate <= financeDateRange.end)
  })
  const financeSummary = financialBookings.reduce((summary, booking) => {
    const amount = Number(booking.estimated_price)
    const estimate = Number.isFinite(amount) ? amount : 0
    const tollAmount = Number(booking.toll_amount) || 0
    
    if (['pending', 'confirmed', 'completed'].includes(booking.status)) {
      summary.total += estimate
      if (booking.toll_included) summary.totalToll += tollAmount
    }
    if (booking.status in summary) summary[booking.status] += estimate
    return summary
  }, { total: 0, totalToll: 0, pending: 0, confirmed: 0, completed: 0 })
  const pendingBookings = bookings.filter((booking) => booking.status === 'pending').length
  const confirmedBookings = bookings.filter((booking) => booking.status === 'confirmed').length
  const completedBookings = bookings.filter((booking) => booking.status === 'completed').length
  const availableDrivers = drivers.filter((driver) => driver.status === 'available').length
  const bookingFilterCounts = {
    all: dateFilteredBookings.length,
    acara: dateFilteredBookings.filter((booking) => isEventBooking(booking)).length,
    pending: dateFilteredBookings.filter((booking) => booking.status === 'pending').length,
    confirmed: dateFilteredBookings.filter((booking) => booking.status === 'confirmed').length,
    completed: dateFilteredBookings.filter((booking) => booking.status === 'completed').length,
    rejected: dateFilteredBookings.filter((booking) => booking.status === 'rejected').length,
    cancelled: dateFilteredBookings.filter((booking) => booking.status === 'cancelled').length,
  }
  const page = tabMeta[activeTab] ?? tabMeta.finance
  const financeRangeLabel = financePeriod === 'all'
    ? 'Semua periode'
    : financeDateRange
      ? `${formatDateLabel(financeDateRange.start)} – ${formatDateLabel(financeDateRange.end)}`
      : 'Pilih rentang tanggal'

  return (
      <div className="min-h-screen bg-slate-ice text-ink md:flex">
        <button
          className={`fixed inset-0 z-40 bg-ink/55 backdrop-blur-[3px] transition-opacity duration-300 md:hidden ${mobileNavOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          type="button"
          aria-label="Tutup menu admin"
          aria-hidden={!mobileNavOpen}
          tabIndex={mobileNavOpen ? 0 : -1}
          onClick={() => setMobileNavOpen(false)}
        />
        <aside
          id="admin-sidebar"
          ref={sidebarRef}
          className={`fixed inset-y-0 left-0 z-50 flex w-[min(300px,calc(100vw-40px))] flex-col overflow-y-auto overscroll-contain bg-[#0b1220] text-white shadow-[0_0_50px_rgba(15,23,42,.35)] transition-transform duration-300 ease-out will-change-transform md:sticky md:top-0 md:left-0 md:z-auto md:h-screen md:w-[248px] md:shrink-0 md:translate-x-0 md:shadow-none ${mobileNavOpen || isDesktop ? 'translate-x-0' : '-translate-x-full'}`}
          aria-hidden={isDesktop ? undefined : !mobileNavOpen}
          inert={!isDesktop && !mobileNavOpen ? true : undefined}
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/8 px-4 py-4 md:border-0 md:px-5 md:py-5">
            <a className="inline-flex min-w-0 items-center gap-3" href="/" aria-label="Kembali ke situs utama">
              <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white p-1"><img className="size-full object-contain" src={logoSrc} alt="" /></span>
              <span className="grid gap-1"><strong className="font-display text-[.8rem] font-extrabold tracking-[.08em]">PT KHALISA</strong><small className="text-[.55rem] font-semibold tracking-[.14em] text-cyan">ADMIN DASHBOARD</small></span>
            </a>
            <button className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/15 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:hidden" type="button" onClick={() => setMobileNavOpen(false)} aria-label="Tutup sidebar"><X size={17} aria-hidden="true" /></button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Navigasi admin">
            <span className="mb-2 px-3 text-[.62rem] font-extrabold tracking-[.16em] text-white/35">MENU</span>
            <AdminNavButton active={activeTab === 'finance'} icon={<LayoutDashboard size={16} aria-hidden="true" />} label="Ikhtisar" onClick={() => { setActiveTab('finance'); setMobileNavOpen(false) }} />
            <AdminNavButton active={activeTab === 'bookings'} icon={<CalendarDays size={16} aria-hidden="true" />} label="Booking" count={bookings.length} alert={pendingBookings} onClick={() => { setActiveTab('bookings'); setMobileNavOpen(false) }} />
            <AdminNavButton active={activeTab === 'schedule'} icon={<CalendarCheck size={16} aria-hidden="true" />} label="Cek Jadwal" onClick={() => { setActiveTab('schedule'); setMobileNavOpen(false) }} />
            <AdminNavButton active={activeTab === 'fleet'} icon={<CarFront size={17} aria-hidden="true" />} label="Armada" count={vehicles.length} onClick={() => { setActiveTab('fleet'); setMobileNavOpen(false) }} />
            <AdminNavButton active={activeTab === 'drivers'} icon={<UserCheck size={16} aria-hidden="true" />} label="Supir" count={drivers.length} onClick={() => { setActiveTab('drivers'); setMobileNavOpen(false) }} />
            {canManageAdmins && <AdminNavButton active={activeTab === 'admins'} icon={<ShieldCheck size={16} aria-hidden="true" />} label="Akun admin" onClick={() => { setActiveTab('admins'); setMobileNavOpen(false) }} />}
          </nav>

          <div className="mt-auto grid gap-2 border-t border-white/10 p-4">
            <div className="mb-1 grid min-w-0 gap-0.5 px-1">
              <span className="text-[.62rem] font-semibold text-white/45">Hak akses</span>
              <strong className="truncate text-[.74rem] text-white">Super Admin</strong>
            </div>
            <a className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-[.74rem] font-bold text-white/75 transition-colors hover:border-cyan/40 hover:text-cyan" href="/"><ArrowUpRight size={15} aria-hidden="true" />Lihat situs</a>
            <button className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-left text-[.74rem] font-bold text-white/65 transition-colors hover:bg-crimson/15 hover:text-white" type="button" onClick={handleLogout}><LogOut size={15} aria-hidden="true" />Keluar</button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1320px] px-4 pb-8 pt-4 sm:px-7 sm:py-8">
        <div className="sticky top-0 z-30 -mx-4 mb-5 flex items-center justify-between gap-3 border-b border-line bg-white/95 px-4 py-3 shadow-[0_6px_18px_rgba(15,23,42,.06)] backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:mx-0 sm:rounded-2xl sm:border sm:px-4 sm:py-3 sm:shadow-[0_8px_24px_rgba(15,23,42,.04)] sm:backdrop-blur-none md:hidden">
          <button ref={mobileLogoButtonRef} className="inline-flex min-w-0 items-center gap-2.5 text-left" type="button" aria-label="Buka menu admin" aria-expanded={mobileNavOpen} aria-controls="admin-sidebar" onClick={() => setMobileNavOpen(true)}>
            <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white p-1"><img className="size-full object-contain" src={logoSrc} alt="" /></span>
            <span className="grid min-w-0 gap-1"><strong className="truncate font-display text-[.72rem] font-extrabold tracking-[.06em]">PT KHALISA</strong><small className="truncate text-[.56rem] font-semibold tracking-[.12em] text-cyan">ADMIN</small></span>
          </button>
        </div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-6">
          <div className="min-w-0 flex-1">
            <span className="inline-block rounded-full bg-crimson/10 px-2.5 py-1 text-[.6rem] font-extrabold tracking-[.15em] text-crimson">{page.kicker}</span>
            <h1 className="mb-0 mt-2 font-display text-[1.7rem] font-extrabold tracking-tight max-[600px]:text-[1.4rem]">{page.title}</h1>
            <p className="mb-0 mt-1.5 max-w-[640px] text-[.84rem] leading-6 text-muted max-[600px]:text-[.78rem] max-[600px]:leading-[1.55]">{activeTab === 'finance' ? `${page.description} ${financeRangeLabel}.` : page.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 max-[600px]:w-full">
            <button
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-[.74rem] font-bold shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 max-[600px]:w-full max-[600px]:justify-center ${
                notificationStatus === 'granted'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-muted hover:border-cyan hover:text-cyan'
              }`}
              type="button"
              onClick={toggleNotificationPermission}
              title={notificationStatus === 'granted' ? 'Notifikasi browser dan nada bel aktif (klik untuk tes bunyi bel)' : 'Klik untuk mengaktifkan notifikasi browser & nada bel'}
            >
              <Bell size={15} className={notificationStatus === 'granted' ? 'text-emerald-600' : 'text-slate-400'} aria-hidden="true" />
              <span>{notificationStatus === 'granted' ? 'Notifikasi Aktif' : 'Aktifkan Notifikasi'}</span>
            </button>

            {pendingBookings > 0 && activeTab !== 'bookings' && (
              <button
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 text-[.74rem] font-bold text-amber-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md active:translate-y-0 max-[600px]:w-full max-[600px]:justify-center"
                type="button"
                onClick={() => setActiveTab('bookings')}
              >
                <span className="grid size-5 place-items-center rounded-full bg-amber-500 text-[.62rem] font-extrabold text-white">{pendingBookings}</span>
                Menunggu konfirmasi
              </button>
            )}
          </div>
        </div>

        {activeTab === 'finance' && (
            <>
            {/* Baris 1: 5 stat cards sejajar */}
            <section className="mb-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 max-[480px]:grid-cols-1" aria-label="Ringkasan keuangan">
              <StatCard label="Total estimasi aktif" value={loadingBookings ? '—' : `Rp ${formatPrice(financeSummary.total)}`} tone="accent" />
              <StatCard label="Total biaya tol" value={loadingBookings ? '—' : `Rp ${formatPrice(financeSummary.totalToll)}`} tone="warn" />
              <StatCard label="Booking selesai" value={loadingBookings ? '—' : `Rp ${formatPrice(financeSummary.completed)}`} tone="success" />
              <StatCard label="Dikonfirmasi" value={loadingBookings ? '—' : `Rp ${formatPrice(financeSummary.confirmed)}`} tone="info" />
              <StatCard label="Menunggu konfirmasi" value={loadingBookings ? '—' : `Rp ${formatPrice(financeSummary.pending)}`} tone="warn" />
            </section>

            {/* Baris 2: 3 quick jump sejajar */}
            <section className="mb-6 grid grid-cols-3 gap-3 max-[560px]:grid-cols-1" aria-label="Pintasan operasional">
              <QuickJump icon={<CalendarDays size={16} aria-hidden="true" />} label="Booking menunggu" value={loadingBookings ? '—' : `${pendingBookings} permintaan`} tone={pendingBookings > 0 ? 'warn' : 'neutral'} onClick={() => setActiveTab('bookings')} />
              <QuickJump icon={<CarFront size={16} aria-hidden="true" />} label="Unit ready" value={loadingVehicles ? '—' : `${readyUnits} / ${totalUnits} unit`} tone={readyUnits > 0 ? 'success' : 'neutral'} onClick={() => setActiveTab('fleet')} />
              <QuickJump icon={<UserCheck size={16} aria-hidden="true" />} label="Supir tersedia" value={loadingDrivers ? '—' : `${availableDrivers} orang`} tone={availableDrivers > 0 ? 'info' : 'neutral'} onClick={() => setActiveTab('drivers')} />
            </section>

            {/* Top terlaris + Promo & Harga Spesial */}
            {(!loadingBookings && !loadingVehicles) && (() => {
              const countByName = {}
              for (const b of bookings.filter((b) => b.status === 'completed')) {
                for (const v of (b.vehicle_snapshot ?? [])) {
                  if (!v.name) continue
                  countByName[v.name] = (countByName[v.name] ?? 0) + (v.quantity ?? 1)
                }
              }
              const topList = Object.entries(countByName).sort((a, b) => b[1] - a[1]).slice(0, 5)
              const maxBookings = topList[0]?.[1] ?? 1
              const promoVehicles = vehicles.filter((v) => getActivePromo(v))
              const specialVehicles = vehicles.filter((v) => v.special_price && !v.promo_price)
              return (
                <div className="mb-6 grid grid-cols-2 gap-4 max-[800px]:grid-cols-1">
                  {/* Top terlaris */}
                  <section className="rounded-2xl border border-line bg-white p-5 shadow-sm" aria-label="Kendaraan terlaris">
                    <h3 className="m-0 mb-4 font-display text-[.9rem] font-bold text-ink">Kendaraan terlaris</h3>
                    {topList.length === 0 ? (
                      <p className="text-[.76rem] text-muted">Belum ada data booking selesai.</p>
                    ) : (
                      <div className="grid gap-3">
                        {topList.map(([name, count], i) => {
                          const vehicle = vehicles.find((v) => v.name === name)
                          const widthPct = Math.round((count / maxBookings) * 100)
                          return (
                            <div key={name} className="grid gap-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="shrink-0 text-[.72rem] font-bold text-slate-400">{i + 1}.</span>
                                  {vehicle?.image_url && <img className="size-8 shrink-0 rounded-lg border border-line object-cover" src={vehicle.image_url} alt="" />}
                                  <span className="truncate text-[.76rem] font-semibold text-ink">{name}</span>
                                </div>
                                <span className="shrink-0 text-[.72rem] font-bold text-cyan">{count}x</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-100">
                                <div className="h-1.5 rounded-full bg-cyan transition-all duration-500" style={{ width: `${widthPct}%` }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>

                  {/* Promo & Harga Spesial */}
                  <div className="grid content-start gap-4">
                    <section className="rounded-2xl border border-yellow-200 bg-yellow-50/70 p-5 shadow-sm" aria-label="Kendaraan promo aktif">
                      <div className="mb-3 flex items-center gap-1.5 font-display text-[.9rem] font-bold text-yellow-800">
                        <Sparkles size={14} className="shrink-0 text-yellow-600" aria-hidden="true" />
                        <span>Promo aktif</span>
                      </div>
                      {promoVehicles.length === 0 ? (
                        <p className="text-[.76rem] text-yellow-700">Tidak ada promo aktif saat ini.</p>
                      ) : (
                        <div className="grid gap-2">
                          {promoVehicles.map((v) => {
                            const promo = getActivePromo(v)
                            const endLabel = promo?.end ? new Date(promo.end).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null
                            return (
                              <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-yellow-100 bg-white px-3 py-2.5 transition-shadow hover:shadow-xs">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  {v.image_url && <img className="size-9 shrink-0 rounded-lg border border-line object-cover" src={v.image_url} alt="" />}
                                  <div className="min-w-0">
                                    <span className="block truncate text-[.76rem] font-semibold text-ink">{v.name}</span>
                                    {endLabel && <span className="text-[.63rem] text-yellow-700">s/d {endLabel}</span>}
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <span className="block text-[.62rem] text-slate-400 line-through">Rp {formatPrice(parsePrice(v.price))}</span>
                                  <span className="text-[.76rem] font-bold text-yellow-700">Rp {formatPrice(parsePrice(promo.price))}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </section>

                    <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm" aria-label="Kendaraan harga spesial">
                      <div className="mb-3 flex items-center gap-1.5 font-display text-[.9rem] font-bold text-blue-800">
                        <Sparkles size={14} className="shrink-0 text-blue-600" aria-hidden="true" />
                        <span>Harga spesial</span>
                      </div>
                      {specialVehicles.length === 0 ? (
                        <p className="text-[.76rem] text-blue-700">Tidak ada harga spesial aktif.</p>
                      ) : (
                        <div className="grid gap-2">
                          {specialVehicles.map((v) => {
                            const minDays = Number(v.special_min_days) || 3
                            return (
                              <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white px-3 py-2.5 transition-shadow hover:shadow-xs">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  {v.image_url && <img className="size-9 shrink-0 rounded-lg border border-line object-cover" src={v.image_url} alt="" />}
                                  <div className="min-w-0">
                                    <span className="block truncate text-[.76rem] font-semibold text-ink">{v.name}</span>
                                    <span className="text-[.63rem] text-blue-700">Min. {minDays} hari · {v.special_label || 'Harga Spesial'}</span>
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <span className="block text-[.62rem] text-slate-400 line-through">Rp {formatPrice(parsePrice(v.price))}</span>
                                  <span className="text-[.76rem] font-bold text-blue-700">Rp {formatPrice(parsePrice(v.special_price))}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              )
            })()}
          </>
        )}

        {activeTab === 'fleet' && <section className="mb-6 grid grid-cols-3 gap-3 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1" aria-label="Ringkasan armada">
          <StatCard label="Model kendaraan" value={loadingVehicles ? '—' : modelCount} />
          <StatCard label="Total unit aktif" value={loadingVehicles ? '—' : totalUnits} />
          <StatCard label="Unit ready" value={loadingVehicles ? '—' : readyUnits} tone="success" />
        </section>}

        {activeTab === 'bookings' && (
          <section className="mb-6 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[500px]:grid-cols-1" aria-label="Ringkasan booking">
            <StatCard label="Total permintaan" value={loadingBookings ? '—' : dateFilteredBookings.length} active={bookingStatusFilter === 'all'} onClick={() => showBookingDetails('all')} />
            <StatCard label="Menunggu" value={loadingBookings ? '—' : bookingFilterCounts.pending} tone="warn" active={bookingStatusFilter === 'pending'} onClick={() => showBookingDetails('pending')} />
            <StatCard label="Dikonfirmasi" value={loadingBookings ? '—' : bookingFilterCounts.confirmed} tone="info" active={bookingStatusFilter === 'confirmed'} onClick={() => showBookingDetails('confirmed')} />
            <StatCard label="Selesai" value={loadingBookings ? '—' : bookingFilterCounts.completed} tone="success" active={bookingStatusFilter === 'completed'} onClick={() => showBookingDetails('completed')} />
          </section>
        )}

        {activeTab === 'schedule' && (
          <section className="mb-6 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[500px]:grid-cols-1" aria-label="Ringkasan ketersediaan jadwal">
            <StatCard label="Unit Ready (Siap Jalan)" value={loadingVehicles ? '—' : `${scheduleOverview.readyCount} unit`} tone="success" />
            <StatCard label="Unit Tersewa / Penuh" value={loadingVehicles ? '—' : `${scheduleOverview.occupiedCount} unit`} tone={scheduleOverview.occupiedCount > 0 ? 'warn' : 'neutral'} />
            <StatCard label="Supir Siap / Tersedia" value={loadingDrivers ? '—' : `${scheduleOverview.availableDriversCount} orang`} tone="info" />
            <StatCard label="Supir Bertugas" value={loadingDrivers ? '—' : `${scheduleOverview.busyDriversCount} orang`} />
          </section>
        )}

        {activeTab === 'drivers' && (
          <section className="mb-6 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[500px]:grid-cols-1" aria-label="Ringkasan supir">
            <StatCard label="Total supir" value={loadingDrivers ? '—' : drivers.length} />
            <StatCard label="Tersedia / Kosong" value={loadingDrivers ? '—' : availableDrivers} tone="success" />
            <StatCard label="Sedang bertugas" value={loadingDrivers ? '—' : drivers.filter((d) => d.status === 'on_duty').length} tone="info" />
            <StatCard label="Libur / Off" value={loadingDrivers ? '—' : drivers.filter((d) => d.status === 'off').length} />
          </section>
        )}

        {activeTab === 'admins' ? (
          <AdminAccountsPanel />
        ) : activeTab === 'fleet' ? (
          <section className={panelClass} aria-label="Daftar armada">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 max-[600px]:px-4">
              <div className="flex items-center gap-2.5"><CarFront className="text-cyan" size={19} aria-hidden="true" /><h2 className="m-0 font-display text-[.98rem] font-bold">Kelola armada</h2></div>
              <div className={toolbarClass}>
                <SearchField value={vehicleSearch} onChange={(event) => setVehicleSearch(event.target.value)} placeholder="Cari nama atau kategori" label="Cari armada" />
                <button className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-crimson px-3.5 text-[.76rem] font-bold text-white transition-colors hover:bg-crimson-deep" type="button" onClick={() => openVehicleForm()}><Plus size={16} aria-hidden="true" />Tambah</button>
              </div>
            </div>

            {vehiclesError ? (
              <PanelMessage tone="error">Gagal memuat armada: {vehiclesError}</PanelMessage>
            ) : loadingVehicles ? (
              <PanelMessage>Memuat armada...</PanelMessage>
            ) : filteredVehicles.length === 0 ? (
              <EmptyState icon={<CarFront size={20} aria-hidden="true" />} title={vehicleSearch ? 'Tidak ada armada yang cocok' : 'Belum ada data armada'} description={vehicleSearch ? 'Coba kata kunci lain atau kosongkan pencarian.' : 'Tambah kendaraan agar tampil di katalog publik.'} />
            ) : (
              <>
                <div className="scrollbar-none hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1020px] border-collapse text-left">
                    <thead><tr className="bg-slate-ice text-[.65rem] font-bold uppercase tracking-[.07em] text-muted"><th className="px-5 py-3">Kendaraan</th><th className="px-5 py-3">Kategori</th><th className="px-5 py-3">Ready / total</th><th className="px-5 py-3">Pesanan selesai</th><th className="px-5 py-3">Ketersediaan</th><th className="px-5 py-3">Publikasi</th><th className="px-5 py-3 text-right">Harga / 12 jam</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead>
                    <tbody>
                      {filteredVehicles.map((vehicle) => (
                        <tr className="border-t border-line text-[.78rem] transition-colors hover:bg-slate-ice/80" key={vehicle.id}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              {vehicle.image_url ? <img className="size-11 shrink-0 rounded-lg border border-line object-cover" src={vehicle.image_url} alt="" /> : <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-slate-ice text-muted"><CarFront size={16} aria-hidden="true" /></span>}
                              <span className="grid min-w-0">
                                <strong className="font-semibold text-ink">{vehicle.name}</strong>
                                {formatVehicleTransmissionStock(vehicle) && <small className="text-[.64rem] text-muted">{formatVehicleTransmissionStock(vehicle)}</small>}
                                <span className="mt-1 flex flex-wrap gap-1">
                                  {fleetTop3Names.includes(vehicle.name) && <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[.63rem] font-bold text-amber-800">Terlaris</span>}
                                  {getActivePromo(vehicle) && <span className="inline-flex items-center rounded-md border border-yellow-200 bg-yellow-50 px-1.5 py-0.5 text-[.63rem] font-bold text-yellow-800">Promo aktif</span>}
                                  {vehicle.special_price && !vehicle.promo_price && <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[.63rem] font-bold text-blue-800">Harga spesial</span>}
                                </span>
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-muted">{vehicle.category}</td>
                          <td className="px-5 py-3.5 text-muted"><strong className="text-ink">{getAvailableVehicleStock(vehicle)}</strong> / {getVehicleStock(vehicle)} unit</td>
                          <td className="px-5 py-3.5 text-muted">
                            {(() => {
                              const { completedCount, totalHours } = getVehicleCompletedUsage(vehicle, bookings)
                              return (
                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap" title="Total durasi jadwal dari semua pesanan selesai">
                                  <CalendarDays size={13} aria-hidden="true" />
                                  <strong className="text-ink">{completedCount}</strong>
                                  <span>·</span>
                                  <Clock3 size={13} aria-hidden="true" />
                                  <strong className="text-ink">{formatDriverHours(totalHours)} jam sewa</strong>
                                </span>
                              )
                            })()}
                          </td>
                          <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[.65rem] font-bold ${vehicle.status === 'maintenance' ? 'border-slate-200 bg-slate-100 text-slate-600' : isVehicleReady(vehicle) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}><span className={`size-1.5 rounded-full ${vehicle.status === 'maintenance' ? 'bg-slate-400' : isVehicleReady(vehicle) ? 'bg-emerald-500' : 'bg-amber-500'}`} />{vehicle.status === 'maintenance' ? 'Perawatan' : isVehicleReady(vehicle) ? 'Ready' : 'Booking'}</span></td>
                          <td className="px-5 py-3.5"><span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[.65rem] font-bold ${vehicle.is_active ? 'border-cyan/30 bg-cyan/10 text-cyan-800' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>{vehicle.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                          <td className="px-5 py-3.5 text-right font-semibold text-ink">
                            {isNegoPrice(vehicle.price) ? (
                              <span className="inline-flex rounded-full border border-cyan/30 bg-cyan/10 px-2.5 py-0.5 text-[.72rem] font-bold text-cyan">Nego</span>
                            ) : (
                              `Rp ${formatPrice(parsePrice(vehicle.price))}`
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right"><button className="rounded-lg border border-line px-3 py-1.5 text-[.72rem] font-bold text-muted transition-colors hover:border-cyan/40 hover:text-cyan" type="button" onClick={() => openVehicleForm(vehicle)}>Ubah</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-3 p-4 md:hidden">
                  {filteredVehicles.map((vehicle) => (
                    <article className="rounded-xl border border-line p-4" key={vehicle.id}>
                      <div className="flex items-start gap-3">
                        {vehicle.image_url ? <img className="size-14 shrink-0 rounded-lg border border-line object-cover" src={vehicle.image_url} alt="" /> : <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-slate-ice text-muted"><CarFront size={18} aria-hidden="true" /></span>}
                        <div className="min-w-0 flex-1">
                          <strong className="block text-[.86rem] text-ink">{vehicle.name}</strong>
                          <span className="mt-1 block text-[.72rem] text-muted">{vehicle.category} · {getAvailableVehicleStock(vehicle)} / {getVehicleStock(vehicle)} unit</span>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[.65rem] font-bold ${vehicle.status === 'maintenance' ? 'bg-slate-100 text-slate-600' : isVehicleReady(vehicle) ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{vehicle.status === 'maintenance' ? 'Perawatan' : isVehicleReady(vehicle) ? 'Ready' : 'Booking'}</span>
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[.65rem] font-bold ${vehicle.is_active ? 'bg-cyan/10 text-[#0369a1]' : 'bg-slate-100 text-slate-500'}`}>{vehicle.is_active ? 'Aktif' : 'Nonaktif'}</span>
                            {fleetTop3Names.includes(vehicle.name) && <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[.65rem] font-bold text-amber-700">Terlaris</span>}
                            {getActivePromo(vehicle) && <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-[.65rem] font-bold text-yellow-700">Promo aktif</span>}
                            {vehicle.special_price && !vehicle.promo_price && <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[.65rem] font-bold text-blue-700">Harga spesial</span>}
                          </div>
                        </div>
                      </div>
                      {(() => {
                        const { completedCount, totalHours } = getVehicleCompletedUsage(vehicle, bookings)
                        return (
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-[.72rem] text-muted">
                            <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} aria-hidden="true" />{completedCount} pesanan selesai</span>
                            <span className="inline-flex items-center gap-1.5" title="Durasi jadwal dikali jumlah unit; bukan jam mesin aktual"><Clock3 size={13} aria-hidden="true" />{formatDriverHours(totalHours)} jam-unit terjadwal</span>
                          </div>
                        )
                      })()}
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                        {isNegoPrice(vehicle.price) ? (
                          <span className="inline-flex rounded-full bg-cyan/10 px-2.5 py-1 text-[.72rem] font-bold text-cyan">Harga Nego</span>
                        ) : (
                          <strong className="text-[.82rem]">Rp {formatPrice(parsePrice(vehicle.price))}</strong>
                        )}
                        <button className="rounded-lg border border-line px-3 py-1.5 text-[.72rem] font-bold text-muted" type="button" onClick={() => openVehicleForm(vehicle)}>Ubah</button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        ) : activeTab === 'bookings' ? (
          <section className={panelClass} aria-label="Inbox booking">
            <div className="grid gap-3 border-b border-line px-5 py-4 max-[600px]:px-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="m-0 font-display text-[.98rem] font-bold">Inbox booking</h2>
                  <p className="mb-0 mt-1 text-[.7rem] text-muted">
                    {bookingDateRange ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-cyan">
                        <CalendarDays size={12} aria-hidden="true" />
                        Jadwal: {bookingDateRange.label} ({dateFilteredBookings.length} booking)
                      </span>
                    ) : (
                      'Permintaan dari formulir website.'
                    )}
                  </p>
                </div>
                <div className={toolbarClass}>
                  <SearchField value={bookingSearch} onChange={(event) => setBookingSearch(event.target.value)} placeholder="Cari pemesan/lokasi" label="Cari booking" />
                  <button
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-crimson px-3.5 text-[.76rem] font-bold text-white transition-colors hover:bg-crimson-deep"
                    type="button"
                    onClick={openBookingForm}
                  >
                    <Plus size={16} aria-hidden="true" />
                    Input Booking Manual
                  </button>
                  <button
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-[.76rem] font-bold text-muted transition-colors hover:border-cyan/40 hover:text-cyan disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    onClick={() => {
                      if (bookingPeriod === 'all') {
                        setExportMode('current')
                      } else if (bookingPeriod === 'month') {
                        setExportMode('month')
                        setExportMonth(bookingMonth)
                      } else if (bookingPeriod === 'range') {
                        setExportMode('range')
                        setExportRangeStart(bookingRangeStart)
                        setExportRangeEnd(bookingRangeEnd)
                      } else {
                        setExportMode('current')
                      }
                      setExportModalOpen(true)
                    }}
                    disabled={bookings.length === 0}
                  >
                    <Download size={16} aria-hidden="true" />
                    Export Excel
                  </button>
                </div>
              </div>
              {/* Filter Rentang Jadwal */}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-slate-ice/70 p-2 max-[600px]:p-2.5">
                <span className="flex shrink-0 items-center gap-1.5 pl-1 text-[.7rem] font-bold text-ink">
                  <CalendarDays size={14} className="text-cyan" aria-hidden="true" />
                  <span>Jadwal:</span>
                </span>
                
                <div className="scrollbar-none flex flex-wrap items-center gap-1.5">
                  {[
                    ['all', 'Semua waktu'],
                    ['today', 'Hari ini'],
                    ['tomorrow', 'Besok'],
                    ['next7', '7 hari'],
                    ['month', 'Per Bulan'],
                    ['range', 'Rentang Tanggal'],
                  ].map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      className={`inline-flex h-7 items-center rounded-lg px-2.5 text-[.68rem] font-bold transition-colors ${
                        bookingPeriod === mode
                          ? 'bg-ink text-white shadow-sm'
                          : 'border border-line bg-white text-muted hover:border-cyan/40 hover:text-ink'
                      }`}
                      onClick={() => setBookingPeriod(mode)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {bookingPeriod === 'month' && (
                  <div className="flex items-center gap-1.5 pl-1">
                    <input
                      type="month"
                      className="h-7 rounded-lg border border-line bg-white px-2 text-[.7rem] font-medium text-ink outline-none focus:border-cyan"
                      value={bookingMonth}
                      onChange={(e) => setBookingMonth(e.target.value)}
                      aria-label="Pilih bulan booking"
                    />
                  </div>
                )}

                {bookingPeriod === 'range' && (
                  <div className="flex flex-wrap items-center gap-1.5 pl-1">
                    <input
                      type="date"
                      className="h-7 rounded-lg border border-line bg-white px-2 text-[.7rem] font-medium text-ink outline-none focus:border-cyan"
                      value={bookingRangeStart}
                      max={bookingRangeEnd || undefined}
                      onChange={(e) => setBookingRangeStart(e.target.value)}
                      aria-label="Tanggal awal booking"
                    />
                    <span className="text-[.68rem] text-muted">s/d</span>
                    <input
                      type="date"
                      className="h-7 rounded-lg border border-line bg-white px-2 text-[.7rem] font-medium text-ink outline-none focus:border-cyan"
                      value={bookingRangeEnd}
                      min={bookingRangeStart || undefined}
                      onChange={(e) => setBookingRangeEnd(e.target.value)}
                      aria-label="Tanggal akhir booking"
                    />
                  </div>
                )}

                {bookingPeriod !== 'all' && (
                  <button
                    type="button"
                    className="ml-auto inline-flex h-7 items-center gap-1 rounded-lg border border-line bg-white px-2 text-[.66rem] font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                    onClick={() => setBookingPeriod('all')}
                  >
                    <X size={12} aria-hidden="true" />
                    Reset
                  </button>
                )}
              </div>

              <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5" role="tablist" aria-label="Filter status booking">
                {[
                  ['all', 'Semua'],
                  ['acara', 'Acara'],
                  ['pending', 'Menunggu'],
                  ['confirmed', 'Dikonfirmasi'],
                  ['completed', 'Selesai'],
                  ['rejected', 'Ditolak'],
                  ['cancelled', 'Dibatalkan'],
                ].map(([value, label]) => (
                  <FilterChip key={value} active={bookingStatusFilter === value} count={bookingFilterCounts[value]} onClick={() => setBookingStatusFilter(value)}>{label}</FilterChip>
                ))}
              </div>
            </div>

            {bookingActionError && (
              <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-[.74rem] text-red-700">
                <span>{bookingActionError}</span>
                <button
                  type="button"
                  className="ml-3 font-semibold text-red-800 underline hover:text-red-900"
                  onClick={() => setBookingActionError('')}
                >
                  Tutup
                </button>
              </div>
            )}

            {bookingsError ? (
              <PanelMessage tone="error">{bookingsError.includes('does not exist') || bookingsError.includes('42P01') ? 'Tabel booking belum tersedia. Jalankan migration database di Supabase.' : `Gagal memuat booking: ${bookingsError}`}</PanelMessage>
            ) : loadingBookings ? (
              <PanelMessage>Memuat booking...</PanelMessage>
            ) : filteredBookings.length === 0 ? (
              <EmptyState icon={<CalendarDays size={20} aria-hidden="true" />} title="Belum ada permintaan booking" description="Ubah filter status atau kata kunci pencarian untuk melihat permintaan lain." />
            ) : (
              <>
              <div className="scrollbar-none hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1160px] border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-ice text-[.65rem] font-bold uppercase tracking-[.07em] text-muted">
                      <th className="px-5 py-3 w-[180px]">Pemesan</th>
                      <th className="px-5 py-3 w-[190px]">Jadwal</th>
                      <th className="px-5 py-3 w-[230px]">Kendaraan & Layanan</th>
                      <th className="px-5 py-3 min-w-[160px]">Penjemputan</th>
                      <th className="px-5 py-3 w-[170px]">Supir</th>
                      <th className="px-5 py-3 w-[130px] text-right">Estimasi</th>
                      <th className="px-5 py-3 w-[150px]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((booking) => (
                      <tr className={`cursor-pointer border-t border-line align-top text-[.76rem] transition-colors hover:bg-slate-ice/80 ${booking.status === 'pending' ? 'bg-amber-50/50' : ''}`} key={booking.id} onClick={(event) => { if (!event.target.closest('button, a, select, input')) setSelectedBooking(booking) }}>
                        <td className="px-5 py-4 w-[180px]">
                          <strong className="block text-[.82rem] font-bold text-ink">{booking.customer_name}</strong>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            {booking.booking_code && <span className="font-display text-[.66rem] font-bold tracking-wide text-cyan">{booking.booking_code}</span>}
                            {booking.notes?.includes('NEGO') && <span className="inline-flex rounded-full bg-emerald-50 px-1.5 py-0.5 text-[.6rem] font-bold text-emerald-700">Nego WA</span>}
                          </div>
                          <div className="mt-1.5"><CustomerContact booking={booking} /></div>
                        </td>
                        <td className="px-5 py-4 text-muted w-[190px]">
                          <div className="grid gap-1">
                            <div className="flex items-center gap-1.5 text-[.74rem] font-medium text-ink whitespace-nowrap">
                              <CalendarDays size={13} className="shrink-0 text-cyan" aria-hidden="true" />
                              <span>{formatJakartaDateTime(booking.start_at, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              <span className="text-[.68rem] font-normal text-muted">({formatJakartaDateTime(booking.start_at, { hour: '2-digit', minute: '2-digit', hour12: false })})</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[.71rem] text-muted whitespace-nowrap">
                              <span className="inline-block w-3 text-center text-[.68rem] font-bold text-slate-400">↳</span>
                              <span>{formatJakartaDateTime(booking.end_at, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              <span className="text-[.68rem]">({formatJakartaDateTime(booking.end_at, { hour: '2-digit', minute: '2-digit', hour12: false })})</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-muted w-[230px] min-w-[200px]">
                          {isEventBooking(booking) ? (() => {
                            const { eventType, addons } = parseEventNotes(booking.notes)
                            return (
                              <div className="grid gap-1">
                                <div className="font-semibold text-ink leading-snug">
                                  {(booking.vehicle_snapshot ?? []).map(formatBookedVehicle).join(', ') || 'Unit Armada'}
                                </div>
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[.65rem] font-bold text-purple-700 whitespace-nowrap">
                                    <Sparkles size={10} className="text-purple-600 shrink-0" />
                                    Acara{eventType ? `: ${eventType}` : ''}
                                  </span>
                                  <span className="text-[.67rem] font-medium text-slate-500 whitespace-nowrap">
                                    · {formatDuration(booking.duration, booking.duration_unit)}
                                  </span>
                                </div>
                                {addons && (
                                  <div className="text-[.64rem] text-purple-600 line-clamp-1" title={addons}>
                                    <span className="font-medium text-purple-400">Add-on:</span> {addons}
                                  </div>
                                )}
                              </div>
                            )
                          })() : (
                            <div className="grid gap-1">
                              <div className="font-semibold text-ink leading-snug">
                                {(booking.vehicle_snapshot ?? []).map(formatBookedVehicle).join(', ')}
                              </div>
                              <div className="text-[.68rem] text-muted">
                                {booking.booking_mode} · {formatDuration(booking.duration, booking.duration_unit)}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-muted min-w-[160px] max-w-[220px]">
                          <span className="flex items-start gap-1.5">
                            <MapPin className="mt-0.5 shrink-0 text-slate-400" size={13} aria-hidden="true" />
                            <span className="line-clamp-2 leading-relaxed" title={booking.pickup_address}>{booking.pickup_address}</span>
                          </span>
                        </td>
                        <td className="px-5 py-4 w-[170px]">
                          <DriverAssignControls booking={booking} bookings={bookings} drivers={drivers} onAssign={handleAssignDriver} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-ink w-[140px]">
                          <div>Rp {formatPrice(Number(booking.estimated_price))}</div>
                          {(() => {
                            if (booking.status !== 'confirmed') return null
                            const pInfo = getBookingPaymentInfo(booking)
                            if (!pInfo) return null
                            if (pInfo.status === 'paid') {
                              return (
                                <span className="mt-1 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[.6rem] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                  <Check size={9} /> Lunas
                                </span>
                              )
                            }
                            if (pInfo.remaining_amount > 0) {
                              return (
                                <span className="mt-1 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[.6rem] font-bold text-amber-700 bg-amber-50 border border-amber-200" title={`DP: Rp ${formatPrice(pInfo.dp_amount)} · Sisa: Rp ${formatPrice(pInfo.remaining_amount)}`}>
                                  DP · Sisa Rp {formatPrice(pInfo.remaining_amount)}
                                </span>
                              )
                            }
                            return null
                          })()}
                        </td>
                        <td className="px-5 py-4 w-[150px]">
                          {['completed', 'rejected', 'cancelled'].includes(booking.status) ? (
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[.68rem] font-bold ${bookingStatusTone(booking.status)}`}>
                              {bookingStatusLabels[booking.status] ?? booking.status}
                            </span>
                          ) : (
                            <BookingStatusSelect booking={booking} onChange={handleBookingStatusChange} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 p-4 lg:hidden">
                {filteredBookings.map((booking) => (
                  <article className={`cursor-pointer rounded-xl border p-4 ${booking.status === 'pending' ? 'border-amber-200 bg-amber-50/40' : 'border-line'}`} key={booking.id} onClick={(event) => { if (!event.target.closest('button, a, select, input')) setSelectedBooking(booking) }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong className="block text-[.86rem] text-ink">{booking.customer_name}</strong>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          {booking.booking_code && <span className="font-display text-[.66rem] font-bold tracking-wide text-cyan">{booking.booking_code}</span>}
                          {booking.notes?.includes('NEGO') && <span className="inline-flex rounded-full bg-emerald-50 px-1.5 py-0.5 text-[.6rem] font-bold text-emerald-700">Nego WA</span>}
                        </div>
                        <div className="mt-1.5"><CustomerContact booking={booking} /></div>
                      </div>
                      <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[.65rem] font-bold ${bookingStatusTone(booking.status)}`}>{bookingStatusLabels[booking.status] ?? booking.status}</span>
                    </div>
                    <div className="mt-3 grid gap-1 border-t border-line/60 pt-2.5 text-[.74rem] text-muted">
                      <div className="flex items-center gap-1.5 font-medium text-ink">
                        <CalendarDays size={13} className="shrink-0 text-cyan" />
                        <span>{formatJakartaDateTime(booking.start_at, { day: 'numeric', month: 'short', year: 'numeric' })} ({formatJakartaDateTime(booking.start_at, { hour: '2-digit', minute: '2-digit', hour12: false })})</span>
                        <span className="text-slate-400">s/d</span>
                        <span>{formatJakartaDateTime(booking.end_at, { day: 'numeric', month: 'short', year: 'numeric' })} ({formatJakartaDateTime(booking.end_at, { hour: '2-digit', minute: '2-digit', hour12: false })})</span>
                      </div>
                      {isEventBooking(booking) ? (() => {
                        const { eventType, addons } = parseEventNotes(booking.notes)
                        return (
                          <div className="mt-1 grid gap-0.5">
                            <div className="font-semibold text-ink">{(booking.vehicle_snapshot ?? []).map(formatBookedVehicle).join(', ') || 'Unit Armada'}</div>
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[.65rem] font-bold text-purple-700">
                                <Sparkles size={10} className="text-purple-600" />
                                Acara{eventType ? `: ${eventType}` : ''}
                              </span>
                              <span className="text-[.67rem] font-medium text-slate-500">· {formatDuration(booking.duration, booking.duration_unit)}</span>
                            </div>
                            {addons && <div className="text-[.64rem] text-purple-600 line-clamp-1"><span className="font-medium text-purple-400">Add-on:</span> {addons}</div>}
                          </div>
                        )
                      })() : (
                        <div className="mt-1">
                          <span className="font-semibold text-ink">{(booking.vehicle_snapshot ?? []).map(formatBookedVehicle).join(', ')}</span> · {booking.booking_mode} · {formatDuration(booking.duration, booking.duration_unit)}
                        </div>
                      )}
                    </div>
                    <p className="mb-0 mt-1.5 line-clamp-2 text-[.73rem] text-muted flex items-start gap-1.5">
                      <MapPin size={12} className="shrink-0 text-slate-400 mt-0.5" />
                      <span>{booking.pickup_address}</span>
                    </p>
                    <div className="mt-3 grid gap-3 border-t border-line pt-3">
                      <DriverAssignControls booking={booking} bookings={bookings} drivers={drivers} onAssign={handleAssignDriver} />
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[.7rem] text-muted">Estimasi Biaya:</span>
                        <strong className="text-[.85rem] font-bold text-ink">Rp {formatPrice(Number(booking.estimated_price))}</strong>
                      </div>
                      {['completed', 'rejected', 'cancelled'].includes(booking.status) ? null : (
                        <BookingStatusSelect booking={booking} onChange={handleBookingStatusChange} />
                      )}
                    </div>
                  </article>
                ))}
              </div>
              </>
            )}
          </section>
        ) : activeTab === 'drivers' ? (
          <section className={panelClass} aria-label="Daftar supir">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 max-[600px]:px-4">
              <div className="flex items-center gap-2.5">
                <UserCheck className="text-cyan" size={19} aria-hidden="true" />
                <h2 className="m-0 font-display text-[.98rem] font-bold">Kelola supir</h2>
              </div>
              <div className={toolbarClass}>
                <SearchField value={driverSearch} onChange={(event) => setDriverSearch(event.target.value)} placeholder="Cari nama/HP supir" label="Cari supir" />
                <button className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-crimson px-3.5 text-[.76rem] font-bold text-white transition-colors hover:bg-crimson-deep" type="button" onClick={() => openDriverForm()}><Plus size={16} aria-hidden="true" />Tambah</button>
              </div>
            </div>
            <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-line px-5 py-3 max-[600px]:px-4">
              {[
                ['all', 'Semua', drivers.length],
                ['available', 'Tersedia', availableDrivers],
                ['on_duty', 'Bertugas', drivers.filter((d) => d.status === 'on_duty').length],
                ['off', 'Libur', drivers.filter((d) => d.status === 'off').length],
              ].map(([value, label, count]) => (
                <FilterChip key={value} active={driverStatusFilter === value} count={count} onClick={() => setDriverStatusFilter(value)}>{label}</FilterChip>
              ))}
            </div>

            {driversError ? (
              <PanelMessage tone="error">
                {driversError.includes('drivers')
                  ? 'Tabel supir belum dibuat di database Supabase. Jalankan file migration di folder supabase/migrations di SQL Editor Supabase.'
                  : `Gagal memuat supir: ${driversError}`}
              </PanelMessage>
            ) : loadingDrivers ? (
              <PanelMessage>Memuat data supir...</PanelMessage>
            ) : filteredDrivers.length === 0 ? (
              <EmptyState icon={<UserCheck size={20} aria-hidden="true" />} title={driverSearch || driverStatusFilter !== 'all' ? 'Tidak ada supir yang cocok' : 'Belum ada data supir'} description="Tambah profil supir atau ubah filter untuk melihat daftar lain." />
            ) : (
              <>
              <div className="scrollbar-none hidden overflow-x-auto md:block">
                <table className="w-full min-w-[930px] border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-ice text-[.65rem] font-bold uppercase tracking-[.07em] text-muted">
                      <th className="px-5 py-3">Nama supir</th>
                      <th className="px-5 py-3">WhatsApp / Telepon</th>
                      <th className="px-5 py-3">SIM</th>
                      <th className="px-5 py-3">Catatan / Rute</th>
                      <th className="px-5 py-3">Pesanan selesai</th>
                      <th className="px-5 py-3">Status ketersediaan</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.map((driver) => (
                      <tr className="border-t border-line text-[.78rem] transition-colors hover:bg-slate-ice/80" key={driver.id}>
                        <td className="px-5 py-3.5 font-semibold text-ink">
                          <span className="flex items-center gap-2">
                            <span className="grid size-8 place-items-center rounded-full bg-slate-ice text-muted"><UserRound size={15} aria-hidden="true" /></span>
                            {driver.name}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-muted">
                          <a className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[.72rem] font-semibold text-emerald-700 hover:bg-emerald-100 hover:underline transition-colors whitespace-nowrap" href={`https://wa.me/${cleanPhone(driver.phone)}`} target="_blank" rel="noopener noreferrer" title="Chat WhatsApp supir">
                            <MessageSquare size={12} className="text-emerald-600" aria-hidden="true" />
                            <span>{driver.phone}</span>
                          </a>
                        </td>
                        <td className="px-5 py-3.5 text-muted">
                          <span className="inline-block rounded-full bg-slate-ice px-2.5 py-0.5 text-[.68rem] font-bold text-slate-700">
                            {driver.sim_type || 'SIM A'}
                          </span>
                        </td>
                        <td className="max-w-[200px] truncate px-5 py-3.5 text-[.73rem] text-muted">
                          {driver.notes || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-muted">
                          {(() => {
                            const { completedCount, totalHours } = getDriverCompletedWork(driver.id, bookings)
                            return (
                              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                <CalendarDays size={13} aria-hidden="true" />
                                <strong className="text-ink">{completedCount}</strong>
                                <span>·</span>
                                <Clock3 size={13} aria-hidden="true" />
                                <strong className="text-ink">{formatDriverHours(totalHours)} jam</strong>
                              </span>
                            )
                          })()}
                        </td>
                        <td className="px-5 py-3.5">
                          <select
                            className={`h-8 rounded-lg border px-2 text-[.72rem] font-semibold outline-none transition-colors ${driverStatusTone(driver.status)}`}
                            value={driver.status}
                            onChange={(event) => handleDriverStatusChange(driver.id, event.target.value)}
                            aria-label={`Ubah status ${driver.name}`}
                          >
                            <option value="available">Tersedia / Kosong</option>
                            <option value="on_duty">Sedang Bertugas</option>
                            <option value="off">Libur / Off</option>
                          </select>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button className="rounded-lg border border-line px-2.5 py-1.5 text-[.72rem] font-bold text-muted transition-colors hover:border-cyan/40 hover:text-cyan" type="button" onClick={() => openDriverForm(driver)}>Ubah</button>
                            <button className="rounded-lg border border-line px-2 py-1.5 text-muted transition-colors hover:border-red-300 hover:text-crimson" type="button" onClick={() => handleDeleteDriver(driver.id)} aria-label={`Hapus ${driver.name}`}><Trash2 size={13} aria-hidden="true" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 p-4 md:hidden">
                {filteredDrivers.map((driver) => (
                  <article className="rounded-xl border border-line p-4" key={driver.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong className="block text-[.86rem] text-ink">{driver.name}</strong>
                        <a className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[.72rem] font-medium text-emerald-700 hover:underline" href={`https://wa.me/${cleanPhone(driver.phone)}`} target="_blank" rel="noopener noreferrer">
                          <MessageSquare size={11} className="text-emerald-600" aria-hidden="true" />
                          <span>{driver.phone}</span>
                        </a>
                      </div>
                      <span className="rounded-full bg-slate-ice px-2.5 py-0.5 text-[.65rem] font-bold text-slate-700">{driver.sim_type || 'SIM A'}</span>
                    </div>
                    {driver.notes && <p className="mb-0 mt-2 text-[.72rem] text-muted">{driver.notes}</p>}
                    {(() => {
                      const { completedCount, totalHours } = getDriverCompletedWork(driver.id, bookings)
                      return (
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-[.72rem] text-muted">
                          <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} aria-hidden="true" />{completedCount} pesanan selesai</span>
                          <span className="inline-flex items-center gap-1.5"><Clock3 size={13} aria-hidden="true" />{formatDriverHours(totalHours)} jam terjadwal</span>
                        </div>
                      )
                    })()}
                    <div className="mt-3 grid gap-2 border-t border-line pt-3">
                      <select
                        className={`h-9 rounded-lg border px-2 text-[.72rem] font-semibold outline-none ${driverStatusTone(driver.status)}`}
                        value={driver.status}
                        onChange={(event) => handleDriverStatusChange(driver.id, event.target.value)}
                        aria-label={`Ubah status ${driver.name}`}
                      >
                        <option value="available">Tersedia / Kosong</option>
                        <option value="on_duty">Sedang Bertugas</option>
                        <option value="off">Libur / Off</option>
                      </select>
                      <div className="flex justify-end gap-1.5">
                        <button className="rounded-lg border border-line px-2.5 py-1.5 text-[.72rem] font-bold text-muted" type="button" onClick={() => openDriverForm(driver)}>Ubah</button>
                        <button className="rounded-lg border border-line px-2 py-1.5 text-muted" type="button" onClick={() => handleDeleteDriver(driver.id)} aria-label={`Hapus ${driver.name}`}><Trash2 size={13} aria-hidden="true" /></button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              </>
            )}
          </section>
        ) : activeTab === 'schedule' ? (
          <ScheduleCheckerPanel
            vehicles={vehicles}
            loadingVehicles={loadingVehicles}
            bookings={bookings}
            loadingBookings={loadingBookings}
            drivers={drivers}
            loadingDrivers={loadingDrivers}
            scheduleDate={scheduleCheckDate}
            setScheduleDate={setScheduleCheckDate}
            scheduleTime={scheduleCheckTime}
            setScheduleTime={setScheduleCheckTime}
            scheduleDurationHours={scheduleCheckDurationHours}
            setScheduleDurationHours={setScheduleCheckDurationHours}
            scheduleWindow={scheduleCheckWindow}
            scheduleVehicleAvailability={scheduleVehicleAvailability}
            calculateVehicleRate={calculateVehicleRate}
            onOpenBookingForm={openBookingForm}
          />
        ) : (
          <section className={panelClass} aria-label="Ringkasan keuangan">
            {/* Header: judul + filter periode */}
            <div className="grid gap-3 border-b border-line px-5 py-4 max-[600px]:px-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="m-0 font-display text-[.98rem] font-bold">Pantauan keuangan</h2>
                  <p className="mb-0 mt-1 text-[.7rem] text-muted">{financeRangeLabel} · {financialBookings.length} booking</p>
                </div>
              </div>
              <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5" role="tablist" aria-label="Periode pantauan keuangan">
                {financePeriodOptions.map((option) => (
                  <FilterChip key={option.id} active={financePeriod === option.id} onClick={() => setFinancePeriod(option.id)}>{option.label}</FilterChip>
                ))}
              </div>
              {financePeriod === 'custom' && (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="grid gap-1 text-[.68rem] font-semibold text-muted"><span>Dari tanggal</span><input className="h-9 min-w-[145px] rounded-xl border border-line bg-white px-2.5 text-[.74rem] text-ink outline-none focus:border-cyan" type="date" value={financeStartDate} max={financeEndDate || undefined} onChange={(event) => setFinanceStartDate(event.target.value)} aria-label="Tanggal awal periode keuangan" /></label>
                  <label className="grid gap-1 text-[.68rem] font-semibold text-muted"><span>Sampai tanggal</span><input className="h-9 min-w-[145px] rounded-xl border border-line bg-white px-2.5 text-[.74rem] text-ink outline-none focus:border-cyan" type="date" value={financeEndDate} min={financeStartDate || undefined} onChange={(event) => setFinanceEndDate(event.target.value)} aria-label="Tanggal akhir periode keuangan" /></label>
                </div>
              )}
            </div>

            {bookingsError ? (
              <PanelMessage tone="error">Gagal memuat data keuangan: {bookingsError}</PanelMessage>
            ) : loadingBookings ? (
              <PanelMessage>Memuat data keuangan...</PanelMessage>
            ) : financeRangeInvalid ? (
              <PanelMessage tone="warn">Tanggal awal harus sama dengan atau sebelum tanggal akhir.</PanelMessage>
            ) : financeRangeIncomplete ? (
              <PanelMessage>Pilih tanggal awal dan tanggal akhir untuk melihat ringkasan.</PanelMessage>
            ) : (() => {
              /* Grafik booking — dihitung sekali, dipakai di samping tabel */
              const range = financeDateRange
              let days = []
              if (!range) {
                const todayKey = financeTodayKey || getJakartaDateKey(new Date()) || toDateKey(new Date())
                days = Array.from({ length: 30 }, (_, i) => shiftDateKey(todayKey, i - 29))
              } else {
                const [startYear, startMonth, startDay] = range.start.split('-').map(Number)
                const [endYear, endMonth, endDay] = range.end.split('-').map(Number)
                const start = new Date(Date.UTC(startYear, startMonth - 1, startDay))
                const end = new Date(Date.UTC(endYear, endMonth - 1, endDay))
                const diffDays = Math.round((end - start) / 86400000) + 1
                days = Array.from({ length: diffDays }, (_, i) => {
                  return shiftDateKey(range.start, i)
                })
              }
              const useWeekly = days.length > 30
              let slots = []
              if (useWeekly) {
                const weekMap = {}
                for (const day of days) {
                  const d = new Date(day + 'T00:00:00')
                  const key = shiftDateKey(day, -d.getDay())
                  if (!weekMap[key]) weekMap[key] = { key, count: 0 }
                }
                slots = Object.values(weekMap)
              } else {
                slots = days.map((d) => ({ key: d, count: 0 }))
              }
              for (const b of financialBookings) {
                const day = getJakartaDateKey(b.start_at)
                if (!day) continue
                if (useWeekly) {
                  const d = new Date(day + 'T00:00:00')
                  const key = shiftDateKey(day, -d.getDay())
                  const slot = slots.find((s) => s.key === key)
                  if (slot) slot.count++
                } else {
                  const slot = slots.find((s) => s.key === day)
                  if (slot) slot.count++
                }
              }
              const counts = slots.map((s) => s.count)
              const maxCount = Math.max(...counts, 1)
              const totalBookingsChart = counts.reduce((a, b) => a + b, 0)
              const W = 600; const H = 140
              const padX = 12; const padY = 18
              const chartW = W - padX * 2; const chartH = H - padY * 2
              const points = slots.map((s, i) => ({
                x: slots.length === 1 ? padX + chartW / 2 : padX + (i / (slots.length - 1)) * chartW,
                y: padY + (1 - s.count / maxCount) * chartH,
                count: s.count,
                label: useWeekly
                  ? new Date(s.key + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                  : new Date(s.key + 'T00:00:00').toLocaleDateString('id-ID', { weekday: days.length <= 7 ? 'short' : undefined, day: 'numeric', month: days.length > 14 ? 'short' : undefined }),
              }))
              const polyline = points.map((p) => `${p.x},${p.y}`).join(' ')
              const areaPath = points.length > 0 ? [
                `M ${points[0].x},${padY + chartH}`,
                ...points.map((p) => `L ${p.x},${p.y}`),
                `L ${points[points.length - 1].x},${padY + chartH}`,
                'Z',
              ].join(' ') : ''
              const showLabelEvery = slots.length <= 7 ? 1 : slots.length <= 14 ? 2 : slots.length <= 30 ? 3 : 1
              const periodLabel = financePeriod === 'all' ? '30 hari terakhir' : financePeriodOptions.find((o) => o.id === financePeriod)?.label ?? ''

              const chartNode = (
                <div className="border-b border-line p-5 max-[900px]:border-b min-[900px]:border-b-0 min-[900px]:border-r" aria-label="Grafik booking">
                  <p className="m-0 mb-3 font-display text-[.82rem] font-bold text-ink">
                    Booking berdasarkan tanggal mulai sewa{useWeekly ? ' (per minggu)' : ''} — {periodLabel}
                  </p>
                  <p className="m-0 mb-3 text-[.7rem] text-muted">Total: <strong className="text-ink">{totalBookingsChart} booking</strong></p>
                  <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full" aria-hidden="true">
                    {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                      const y = padY + t * chartH
                      return <line key={t} x1={padX} y1={y} x2={W - padX} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                    })}
                    {[0, 0.5, 1].map((t) => {
                      const y = padY + t * chartH
                      const val = Math.round((1 - t) * maxCount)
                      return <text key={t} x={padX} y={y - 3} fontSize="8" fill="#94a3b8">{val}</text>
                    })}
                    {areaPath ? <path d={areaPath} fill="rgba(6,182,212,0.07)" /> : null}
                    {polyline ? <polyline points={polyline} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" /> : null}
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r={slots.length <= 14 ? 4 : 3} fill="white" stroke="#06b6d4" strokeWidth="2" />
                        {p.count > 0 && <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#0e7490">{p.count}</text>}
                        {i % showLabelEvery === 0 && (
                          <text x={p.x} y={H + 24} textAnchor="middle" fontSize="8.5" fill="#94a3b8">{p.label}</text>
                        )}
                      </g>
                    ))}
                  </svg>
                </div>
              )

              return (
                <>
                  <div className="border-b border-line px-5 py-4 max-[600px]:px-4">
                    <p className="m-0 text-[.7rem] leading-5 text-muted">Angka merupakan estimasi, bukan catatan pembayaran aktual. Booking ditolak atau dibatalkan tidak masuk total estimasi aktif.</p>
                  </div>

                  {/* Layout: grafik (kiri) + tabel (kanan) pada layar lebar */}
                  <div className="grid min-[900px]:grid-cols-[2fr_3fr]">
                    {/* Kolom kiri: grafik */}
                    {chartNode}

                    {/* Kolom kanan: tabel */}
                    <div>
                      {financialBookings.length === 0 ? (
                        <EmptyState icon={<Wallet size={20} aria-hidden="true" />} title="Belum ada booking pada periode ini" description="Ubah rentang tanggal untuk melihat estimasi dari periode lain." />
                      ) : (
                        <>
                        <div className="scrollbar-none hidden overflow-x-auto md:block">
                          <table className="w-full min-w-[560px] border-collapse text-left">
                            <thead><tr className="bg-slate-ice text-[.65rem] font-bold uppercase tracking-[.07em] text-muted"><th className="px-5 py-3">Mulai sewa</th><th className="px-5 py-3">Pemesan</th><th className="px-5 py-3">Kendaraan</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Estimasi</th></tr></thead>
                            <tbody>
                              {financialBookings.map((booking) => (
                                <tr className="border-t border-line text-[.76rem] transition-colors hover:bg-slate-ice/80" key={booking.id}>
                                  <td className="whitespace-nowrap px-5 py-3.5 text-muted">{formatJakartaDateTime(booking.start_at, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                  <td className="px-5 py-3.5 font-semibold text-ink">{booking.customer_name}</td>
                                  <td className="max-w-[180px] px-5 py-3.5 text-muted">{(booking.vehicle_snapshot ?? []).map(formatBookedVehicle).join(', ')}</td>
                                  <td className="px-5 py-3.5"><span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[.65rem] font-bold ${bookingStatusTone(booking.status)}`}>{bookingStatusLabels[booking.status] ?? booking.status}</span></td>
                                  <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-ink">Rp {formatPrice(Number(booking.estimated_price) || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="grid gap-3 border-t border-line p-4 md:hidden">
                          {financialBookings.map((booking) => (
                            <article className="rounded-xl border border-line p-4" key={booking.id}>
                              <div className="flex items-start justify-between gap-3">
                                <strong className="text-[.86rem] text-ink">{booking.customer_name}</strong>
                                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[.65rem] font-bold ${bookingStatusTone(booking.status)}`}>{bookingStatusLabels[booking.status] ?? booking.status}</span>
                              </div>
                              <p className="mb-0 mt-2 text-[.72rem] text-muted">{formatJakartaDateTime(booking.start_at, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                              <p className="mb-0 mt-1 text-[.72rem] text-muted">{(booking.vehicle_snapshot ?? []).map(formatBookedVehicle).join(', ')}</p>
                              <strong className="mt-3 block text-[.82rem]">Rp {formatPrice(Number(booking.estimated_price) || 0)}</strong>
                            </article>
                          ))}
                        </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )
            })()}
          </section>
        )}
          </div>
        </main>

      {exportModalOpen && (() => {
        // Hitung booking yang akan diexport berdasarkan mode dan rentang
        const parseLocalDate = (dateStr) => {
          const [y, m, d] = dateStr.split('-').map(Number)
          return new Date(y, m - 1, d)
        }
        let exportBookings = []
        let rangeLabel = ''
        if (exportMode === 'current') {
          exportBookings = filteredBookings
          rangeLabel = bookingDateRange
            ? `Tampilan_${bookingDateRange.label.replace(/[^a-zA-Z0-9_-]/g, '_')}`
            : 'Tampilan_Web'
        } else if (exportMode === 'month') {
          const [y, m] = exportMonth.split('-').map(Number)
          const start = new Date(y, m - 1, 1)
          const end   = new Date(y, m, 0, 23, 59, 59, 999) // akhir bulan
          exportBookings = bookings.filter((b) => {
            const d = new Date(b.start_at)
            return d >= start && d <= end
          })
          rangeLabel = exportMonth
        } else {
          if (!exportRangeStart || !exportRangeEnd) {
            exportBookings = []
          } else {
            const start = parseLocalDate(exportRangeStart)
            const end   = parseLocalDate(exportRangeEnd)
            end.setHours(23, 59, 59, 999)
            exportBookings = bookings.filter((b) => {
              const d = new Date(b.start_at)
              return d >= start && d <= end
            })
            rangeLabel = `${exportRangeStart}_sd_${exportRangeEnd}`
          }
        }
        const isRangeInvalid = exportMode === 'range' && exportRangeStart && exportRangeEnd && exportRangeStart > exportRangeEnd

        return (
          <div
            className="admin-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-ink/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-4 max-[520px]:items-center max-[520px]:p-3"
            role="presentation"
            onMouseDown={(event) => { if (event.target === event.currentTarget) setExportModalOpen(false) }}
          >
            <section
              className="admin-modal-panel scrollbar-none w-full max-w-[440px] overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="export-modal-title"
            >
              <header className="flex items-center justify-between border-b border-line px-5 py-4">
                <div>
                  <h2 className="m-0 font-display text-[1.05rem] font-bold" id="export-modal-title">Export Data Booking</h2>
                  <p className="mb-0 mt-0.5 text-[.72rem] text-muted">Pilih periode yang ingin diunduh.</p>
                </div>
                <button className="grid size-9 place-items-center rounded-xl text-muted hover:bg-slate-ice hover:text-ink" type="button" aria-label="Tutup" onClick={() => setExportModalOpen(false)}><X size={18} aria-hidden="true" /></button>
              </header>

              <div className="grid gap-5 p-5">
                {/* Pilih mode */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['current', 'Tampilan Web'],
                    ['month', 'Per Bulan'],
                    ['range', 'Rentang Tanggal'],
                  ].map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      className={`rounded-xl border px-4 py-2.5 text-[.78rem] font-bold transition-colors ${exportMode === mode ? 'border-cyan bg-cyan/10 text-cyan' : 'border-line bg-white text-muted hover:border-slate-300 hover:text-ink'}`}
                      onClick={() => setExportMode(mode)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Tampilan web aktif */}
                {exportMode === 'current' && (
                  <div className="rounded-xl border border-line bg-slate-ice p-3.5 text-[.74rem] text-muted">
                    <div className="flex items-center justify-between font-semibold text-ink">
                      <span>Data yang akan diunduh:</span>
                      <span className="font-bold text-cyan">{exportBookings.length} booking</span>
                    </div>
                    <p className="mb-0 mt-1.5 text-[.68rem] leading-relaxed text-muted">
                      Mengikuti filter rentang waktu ({bookingDateRange ? bookingDateRange.label : 'Semua waktu'}), status ({bookingStatusFilter === 'all' ? 'Semua status' : bookingStatusFilter}), dan pencarian yang aktif di dashboard.
                    </p>
                  </div>
                )}

                {/* Input per bulan */}
                {exportMode === 'month' && (
                  <label className="grid gap-1.5">
                    <span className="text-[.72rem] font-bold">Bulan</span>
                    <input
                      className="h-10 rounded-xl border border-line px-3 text-[.82rem] outline-none focus:border-cyan"
                      type="month"
                      value={exportMonth}
                      onChange={(e) => setExportMonth(e.target.value)}
                    />
                  </label>
                )}

                {/* Input rentang tanggal */}
                {exportMode === 'range' && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1.5">
                      <span className="text-[.72rem] font-bold">Dari</span>
                      <input
                        className="h-10 rounded-xl border border-line px-3 text-[.82rem] outline-none focus:border-cyan"
                        type="date"
                        value={exportRangeStart}
                        onChange={(e) => setExportRangeStart(e.target.value)}
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-[.72rem] font-bold">Sampai</span>
                      <input
                        className={`h-10 rounded-xl border px-3 text-[.82rem] outline-none focus:border-cyan ${isRangeInvalid ? 'border-red-400 bg-red-50' : 'border-line'}`}
                        type="date"
                        value={exportRangeEnd}
                        onChange={(e) => setExportRangeEnd(e.target.value)}
                      />
                    </label>
                    {isRangeInvalid && <p className="col-span-2 m-0 text-[.72rem] text-red-600">Tanggal akhir harus sama atau setelah tanggal awal.</p>}
                  </div>
                )}

                {/* Preview jumlah data */}
                <div className={`rounded-xl border px-4 py-3 text-[.78rem] ${exportBookings.length === 0 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-line bg-slate-ice/60 text-muted'}`}>
                  {isRangeInvalid
                    ? 'Perbaiki rentang tanggal terlebih dahulu.'
                    : exportBookings.length === 0
                      ? 'Tidak ada booking pada periode ini.'
                      : <><strong className="text-ink">{exportBookings.length}</strong> booking ditemukan pada periode ini.</>
                  }
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
                <button className="h-10 rounded-xl border border-line px-4 text-[.76rem] font-bold text-muted hover:bg-slate-ice" type="button" onClick={() => setExportModalOpen(false)}>Batal</button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan px-4 text-[.76rem] font-bold text-white hover:bg-cyan/90 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  disabled={exportBookings.length === 0 || !!isRangeInvalid}
                  onClick={async () => {
                    setExportModalOpen(false)
                    await handleExportBookingsExcel(exportBookings, rangeLabel)
                  }}
                >
                  <Download size={15} aria-hidden="true" />
                  Unduh Excel ({exportBookings.length})
                </button>
              </div>
            </section>
          </div>
        )
      })()}

      {selectedBooking && (
        <div
          className="admin-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-ink/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-4 max-[520px]:items-center max-[520px]:p-3"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedBooking(null) }}
        >
          <section
            className="admin-modal-panel scrollbar-none max-h-[92vh] w-full max-w-[580px] overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-h-[min(820px,92vh)] sm:rounded-2xl max-[520px]:max-h-[88dvh] max-[520px]:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-detail-title"
          >
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-4 max-[520px]:px-4 max-[520px]:py-3">
              <div>
                <h2 className="m-0 font-display text-[1.05rem] font-bold" id="booking-detail-title">Detail Booking</h2>
                {selectedBooking.booking_code && (
                  <span className="mt-0.5 block font-display text-[.68rem] font-bold tracking-wide text-cyan">{selectedBooking.booking_code}</span>
                )}
              </div>
              <button
                className="grid size-9 place-items-center rounded-xl text-muted hover:bg-slate-ice hover:text-ink"
                type="button"
                aria-label="Tutup detail booking"
                onClick={() => setSelectedBooking(null)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="grid gap-0 divide-y divide-line">
              {/* Status badge */}
              <div className="flex items-center justify-between gap-3 px-5 py-4 max-[520px]:px-4">
                <span className="text-[.72rem] font-bold uppercase tracking-wide text-muted">Status</span>
                <span className={`inline-flex rounded-full border px-3 py-1 text-[.68rem] font-bold ${bookingStatusTone(selectedBooking.status)}`}>
                  {bookingStatusLabels[selectedBooking.status] ?? selectedBooking.status}
                </span>
              </div>

              {/* Pemesan */}
              <div className="px-5 py-4 max-[520px]:px-4">
                <p className="mb-2 text-[.7rem] font-bold uppercase tracking-wide text-muted">Pemesan</p>
                <p className="mb-0 text-[.88rem] font-bold text-ink">{selectedBooking.customer_name}</p>
                <div className="mt-2">
                  <CustomerContact booking={selectedBooking} />
                </div>
              </div>

              {/* Jadwal */}
              <div className="px-5 py-4 max-[520px]:px-4">
                <p className="mb-2 text-[.7rem] font-bold uppercase tracking-wide text-muted">Jadwal Sewa</p>
                <div className="grid gap-1.5">
                  <span className="flex items-center gap-2 text-[.82rem] text-ink">
                    <CalendarDays size={14} className="shrink-0 text-cyan" aria-hidden="true" />
                    <span>
                      {formatJakartaDateTime(selectedBooking.start_at, { day: 'numeric', month: 'long', year: 'numeric' })}{' '}
                      <strong>{formatJakartaDateTime(selectedBooking.start_at, { hour: '2-digit', minute: '2-digit', hour12: false })}</strong>
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-[.82rem] text-muted">
                    <Clock3 size={14} className="shrink-0" aria-hidden="true" />
                    <span>
                      s/d{' '}
                      {formatJakartaDateTime(selectedBooking.end_at, { day: 'numeric', month: 'long', year: 'numeric' })}{' '}
                      <strong>{formatJakartaDateTime(selectedBooking.end_at, { hour: '2-digit', minute: '2-digit', hour12: false })}</strong>
                    </span>
                  </span>
                  <span className="mt-0.5 text-[.76rem] text-muted">
                    {formatDuration(selectedBooking.duration, selectedBooking.duration_unit)} · {isEventBooking(selectedBooking) ? 'Paket Rental Acara' : selectedBooking.booking_mode}
                  </span>
                </div>
              </div>

              {/* Kendaraan */}
              <div className="px-5 py-4 max-[520px]:px-4">
                <p className="mb-2 text-[.7rem] font-bold uppercase tracking-wide text-muted">Kendaraan</p>
                {isEventBooking(selectedBooking) ? (
                  <div className="grid gap-1.5">
                    <span className="inline-flex w-fit items-center rounded-full bg-purple-100 px-3 py-1 text-[.75rem] font-bold text-purple-700">Paket Rental Acara</span>
                    {(selectedBooking.vehicle_snapshot ?? []).length > 0 ? (
                      (selectedBooking.vehicle_snapshot ?? []).map((v, i) => (
                        <span key={i} className="flex items-center gap-2 text-[.82rem] text-ink">
                          <CarFront size={14} className="shrink-0 text-cyan" aria-hidden="true" />
                          {formatBookedVehicle(v)}
                        </span>
                      ))
                    ) : (
                      <p className="m-0 text-[.78rem] leading-5 text-muted">Armada belum ditentukan — dikonfirmasi admin setelah review request.</p>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-1.5">
                    {(selectedBooking.vehicle_snapshot ?? []).map((v, i) => (
                      <span key={i} className="flex items-center gap-2 text-[.82rem] text-ink">
                        <CarFront size={14} className="shrink-0 text-cyan" aria-hidden="true" />
                        {formatBookedVehicle(v)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Detail Acara — hanya tampil kalau booking acara */}
              {isEventBooking(selectedBooking) && (() => {
                const { eventType, addons, catatan } = parseEventNotes(selectedBooking.notes)
                return (
                  <div className="px-5 py-4 max-[520px]:px-4">
                    <p className="mb-3 text-[.7rem] font-bold uppercase tracking-wide text-muted">Detail Acara</p>
                    <div className="grid gap-2 rounded-xl border border-purple-100 bg-purple-50/60 p-3.5">
                      {eventType && (
                        <div className="flex items-start gap-2 text-[.78rem]">
                          <span className="mt-0.5 shrink-0 text-[.72rem] font-bold text-purple-500">JENIS</span>
                          <span className="font-semibold text-ink">{eventType}</span>
                        </div>
                      )}
                      {addons && (
                        <div className="flex items-start gap-2 text-[.78rem]">
                          <span className="mt-0.5 shrink-0 text-[.72rem] font-bold text-purple-500">ADD-ON</span>
                          <span className="text-ink">{addons}</span>
                        </div>
                      )}
                      {catatan && (
                        <div className="flex items-start gap-2 text-[.78rem]">
                          <span className="mt-0.5 shrink-0 text-[.72rem] font-bold text-purple-500">CATATAN</span>
                          <span className="text-ink">{catatan}</span>
                        </div>
                      )}
                      {!eventType && !addons && !catatan && (
                        <p className="m-0 text-[.76rem] text-muted">Detail acara belum diisi oleh pemesan.</p>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Penjemputan */}
              <div className="px-5 py-4 max-[520px]:px-4">
                <p className="mb-2 text-[.7rem] font-bold uppercase tracking-wide text-muted">Lokasi Penjemputan</p>
                <span className="flex items-start gap-2 text-[.82rem] text-ink">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-cyan" aria-hidden="true" />
                  <span>{selectedBooking.pickup_address || '—'}</span>
                </span>
              </div>

              {/* Supir */}
              <div className="px-5 py-4 max-[520px]:px-4">
                <p className="mb-2 text-[.7rem] font-bold uppercase tracking-wide text-muted">Supir</p>
                <DriverAssignControls booking={selectedBooking} bookings={bookings} drivers={drivers} onAssign={handleAssignDriver} />
              </div>

              {/* Catatan */}
              {selectedBooking.notes && !isEventBooking(selectedBooking) && (
                <div className="px-5 py-4 max-[520px]:px-4">
                  <p className="mb-2 text-[.7rem] font-bold uppercase tracking-wide text-muted">Catatan Pemesan</p>
                  <p className="mb-0 text-[.82rem] leading-6 text-ink">{selectedBooking.notes}</p>
                </div>
              )}

              {/* Harga & Ubah Deal */}
              <div className="border-t border-line px-5 py-4 max-[520px]:px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="grid">
                    <span className="text-[.82rem] font-semibold text-muted">
                      {selectedBooking.notes?.includes('NEGO') ? 'Total Biaya / Deal' : 'Estimasi Total'}
                    </span>
                    {selectedBooking.notes?.includes('NEGO') && (
                      <span className="text-[.68rem] font-medium text-emerald-600">
                        {selectedBooking.status === 'pending' ? 'Ada pengajuan nego via WA' : 'Harga deal telah dikunci'}
                      </span>
                    )}
                  </div>
                  {editingPriceBookingId === selectedBooking.id ? null : (
                    <div className="flex items-center gap-2">
                      <strong className="text-[1.05rem] text-ink">Rp {formatPrice(Number(selectedBooking.estimated_price) || 0)}</strong>
                      {selectedBooking.notes?.includes('NEGO') && selectedBooking.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPriceBookingId(selectedBooking.id)
                            setDealPriceInput(formatPrice(Number(selectedBooking.estimated_price) || 0))
                            setPriceActionError('')
                          }}
                          className="rounded-md border border-cyan/40 bg-cyan/5 px-2.5 py-1 text-[.72rem] font-bold text-cyan transition-colors hover:bg-cyan/10"
                        >
                          Ubah Deal
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {editingPriceBookingId === selectedBooking.id && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSaveDealPrice(selectedBooking.id)
                    }}
                    className="mt-3 grid gap-2 rounded-lg border border-cyan/30 bg-cyan/5 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[.72rem] font-bold text-cyan">Nominal Kesepakatan Nego (Rp)</span>
                      <span className="text-[.65rem] text-muted">Bisa langsung ketik angka</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="h-9 flex-1 rounded-md border border-line bg-white px-2.5 text-[.82rem] font-bold text-ink outline-none focus:border-cyan"
                        value={dealPriceInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '')
                          setDealPriceInput(val ? parseInt(val, 10).toLocaleString('id-ID') : '')
                        }}
                        placeholder="Contoh: 950.000"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={savingPrice}
                        className="h-9 rounded-md bg-cyan px-3.5 text-[.74rem] font-bold text-white transition-opacity hover:bg-cyan/90 disabled:opacity-50"
                      >
                        {savingPrice ? 'Menyimpan...' : 'Simpan Deal'}
                      </button>
                      <button
                        type="button"
                        disabled={savingPrice}
                        onClick={() => {
                          setEditingPriceBookingId(null)
                          setPriceActionError('')
                        }}
                        className="h-9 rounded-md border border-line bg-white px-2.5 text-[.74rem] font-bold text-muted hover:bg-slate-ice"
                      >
                        Batal
                      </button>
                    </div>
                    {priceActionError && (
                      <span className="text-[.68rem] text-red-600">{priceActionError}</span>
                    )}
                  </form>
                )}
              </div>

              {/* Info Tol */}
              {selectedBooking.toll_included && (
                <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 max-[520px]:px-4">
                  <span className="text-[.72rem] text-muted">
                    Biaya tol ({selectedBooking.toll_type === 'standard' ? 'Standar' : 'Custom'})
                  </span>
                  <strong className="text-[.82rem] text-amber-700">Rp {formatPrice(Number(selectedBooking.toll_amount) || 0)}</strong>
                </div>
              )}

              {/* Informasi Pembayaran & Bukti Transfer */}
              {(() => {
                const paymentInfo = getBookingPaymentInfo(selectedBooking)
                if (!paymentInfo && selectedBooking.status !== 'confirmed') return null
                return (
                  <div className="px-5 py-4 max-[520px]:px-4">
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <p className="mb-0 text-[.7rem] font-bold uppercase tracking-wide text-muted flex items-center gap-1.5">
                        <Receipt size={14} className="text-cyan" />
                        <span>Informasi Pembayaran & Bukti Transfer</span>
                      </p>
                      {paymentInfo && (
                        paymentInfo.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[.66rem] font-black text-emerald-800">
                            <Check size={11} className="text-emerald-700" /> LUNAS (100%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[.66rem] font-black text-amber-800">
                            <Clock3 size={11} className="text-amber-700" /> DP DITERIMA · SISA RP {formatPrice(paymentInfo.remaining_amount)}
                          </span>
                        )
                      )}
                    </div>

                    {paymentInfo ? (
                      <div className="rounded-xl border border-line bg-slate-ice/40 p-3.5 text-[.78rem] grid gap-3">
                        {/* 1. Rincian Tagihan */}
                        <div className="grid grid-cols-3 gap-2 max-[520px]:grid-cols-1">
                          <div className="rounded-lg bg-white p-2.5 border border-line/60">
                            <span className="block text-[.64rem] font-bold uppercase tracking-wider text-muted">Total Biaya Sewa</span>
                            <strong className="text-[.88rem] text-ink font-black">
                              Rp {formatPrice(paymentInfo.total_amount || selectedBooking.estimated_price)}
                            </strong>
                          </div>
                          <div className="rounded-lg bg-white p-2.5 border border-line/60">
                            {paymentInfo.status === 'paid' ? (
                              <>
                                <span className="block text-[.64rem] font-bold uppercase tracking-wider text-emerald-700">
                                  {paymentInfo.type === 'full' ? 'Dibayar Lunas' : 'Total Dibayarkan'}
                                </span>
                                <strong className="text-[.88rem] text-emerald-800 font-black">
                                  Rp {formatPrice(paymentInfo.total_amount || paymentInfo.amount || paymentInfo.dp_amount)}
                                </strong>
                                <div className="mt-0.5 text-[.64rem] text-muted truncate">
                                  {paymentInfo.settlement
                                    ? 'DP + Pelunasan (Lunas)'
                                    : `via ${paymentInfo.dp_method || paymentInfo.method} (100%)`}
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="block text-[.64rem] font-bold uppercase tracking-wider text-amber-700">DP Dibayarkan</span>
                                <strong className="text-[.88rem] text-amber-800 font-black">
                                  Rp {formatPrice(paymentInfo.dp_amount || paymentInfo.amount)}
                                </strong>
                                <div className="mt-0.5 text-[.64rem] text-muted truncate">
                                  via {paymentInfo.dp_method || paymentInfo.method}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="rounded-lg bg-white p-2.5 border border-line/60">
                            <span className="block text-[.64rem] font-bold uppercase tracking-wider text-muted">Sisa Tagihan</span>
                            {paymentInfo.status === 'paid' ? (
                              <strong className="text-[.88rem] text-emerald-700 font-black flex items-center gap-1">
                                <Check size={12} /> Rp 0 (Lunas)
                              </strong>
                            ) : (
                              <strong className="text-[.88rem] text-rose-600 font-black">
                                Rp {formatPrice(paymentInfo.remaining_amount)}
                              </strong>
                            )}
                            <div className="mt-0.5 text-[.64rem] text-muted truncate">
                              {paymentInfo.status === 'paid' ? 'Sudah diselesaikan' : 'Wajib dilunasi'}
                            </div>
                          </div>
                        </div>

                        {/* Nama Pengirim */}
                        <div className="border-t border-line/60 pt-2 flex flex-wrap items-center justify-between gap-2 text-[.72rem]">
                          <div>
                            <span className="text-muted">
                              {paymentInfo.status === 'paid' && paymentInfo.type === 'full'
                                ? 'Pengirim Pembayaran (Lunas):'
                                : paymentInfo.settlement
                                ? 'Pengirim Pembayaran:'
                                : 'Pengirim DP / Awal:'}
                            </span>{' '}
                            <strong className="text-ink">{paymentInfo.dp_sender_name || paymentInfo.sender_name}</strong>
                            {paymentInfo.settlement?.sender_name && paymentInfo.settlement.sender_name !== (paymentInfo.dp_sender_name || paymentInfo.sender_name) && (
                              <span className="text-muted"> · Pelunasan a.n <strong className="text-ink">{paymentInfo.settlement.sender_name}</strong></span>
                            )}
                          </div>
                          {paymentInfo.confirmed_at && (
                            <div className="text-muted text-[.68rem]">
                              Dikonfirmasi {formatJakartaDateTime(paymentInfo.confirmed_at, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })} WIB
                            </div>
                          )}
                        </div>

                        {paymentInfo.notes && (
                          <div className="text-[.73rem] text-muted">
                            <span className="font-semibold text-ink">Catatan:</span> {paymentInfo.notes}
                          </div>
                        )}

                        {/* Banner Input Pelunasan jika masih ada sisa */}
                        {paymentInfo.status === 'partial' && (
                          <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                            <div className="min-w-0">
                              <span className="text-[.76rem] font-black text-amber-900 flex items-center gap-1.5">
                                <AlertCircle size={15} className="text-amber-600 shrink-0" />
                                <span>Kewajiban Pelunasan: Rp {formatPrice(paymentInfo.remaining_amount)}</span>
                              </span>
                              <p className="m-0 mt-0.5 text-[.7rem] text-amber-800 leading-snug">
                                Booking telah dikonfirmasi dengan DP. Klik tombol di samping saat pelanggan melakukan pelunasan sisa sewa.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSettlementBooking(selectedBooking)
                                setSettlementDraft({
                                  method: 'Transfer BCA',
                                  sender_name: paymentInfo.dp_sender_name || selectedBooking.customer_name || '',
                                  amount: formatPrice(paymentInfo.remaining_amount),
                                  file: null,
                                  file_preview: null,
                                  notes: 'Pelunasan sisa biaya sewa',
                                })
                                setSettlementError('')
                                setSettlementModalOpen(true)
                              }}
                              className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 px-3.5 py-2 text-[.74rem] font-bold text-white shadow transition-all cursor-pointer w-full sm:w-auto"
                            >
                              <Receipt size={14} />
                              <span>+ Input Bukti Pelunasan</span>
                            </button>
                          </div>
                        )}

                        {/* Lampiran Struk Bukti Pembayaran */}
                        <div className="border-t border-line/60 pt-2.5 space-y-2">
                          <span className="block text-[.66rem] font-bold uppercase tracking-wider text-muted">
                            Lampiran Struk Bukti Transfer / Pembayaran:
                          </span>

                          {/* Jika jenis DP atau memiliki data settlement */}
                          {(paymentInfo.type === 'dp' || paymentInfo.settlement) ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Card 1: Bukti DP */}
                              <div className="rounded-xl border border-line bg-white p-3 flex flex-col justify-between gap-2.5">
                                <div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[.68rem] font-extrabold uppercase tracking-wide text-amber-700">
                                      1. Bukti Pembayaran DP
                                    </span>
                                    <strong className="text-[.76rem] font-bold text-ink">
                                      Rp {formatPrice(paymentInfo.dp_amount || paymentInfo.amount)}
                                    </strong>
                                  </div>
                                  <div className="mt-1 text-[.68rem] text-muted space-y-0.5">
                                    <div><span className="font-semibold text-ink">Metode:</span> {paymentInfo.dp_method || paymentInfo.method}</div>
                                    <div><span className="font-semibold text-ink">Pengirim:</span> {paymentInfo.dp_sender_name || paymentInfo.sender_name}</div>
                                  </div>
                                </div>
                                {paymentInfo.dp_proof_url ? (
                                  paymentInfo.dp_proof_url.toLowerCase().endsWith('.pdf') ? (
                                    <a
                                      href={paymentInfo.dp_proof_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-slate-ice/60 px-3 py-1.5 text-[.7rem] font-bold text-ink hover:text-cyan"
                                    >
                                      <FileText size={14} className="text-red-500" /> Lihat Dokumen (PDF)
                                    </a>
                                  ) : (
                                    <div
                                      className="relative group cursor-pointer overflow-hidden rounded-lg border border-line bg-slate-100"
                                      onClick={() => setLightboxUrl(paymentInfo.dp_proof_url)}
                                    >
                                      <img
                                        src={paymentInfo.dp_proof_url}
                                        alt="Bukti DP"
                                        className="h-28 w-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="inline-flex items-center gap-1 rounded bg-white/90 px-2 py-0.5 text-[.65rem] font-bold text-ink shadow">
                                          <ZoomIn size={12} /> Perbesar
                                        </span>
                                      </div>
                                    </div>
                                  )
                                ) : (
                                  <div className="text-[.68rem] text-muted italic">Tidak ada foto struk DP</div>
                                )}
                              </div>

                              {/* Card 2: Bukti Pelunasan */}
                              {paymentInfo.settlement ? (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 flex flex-col justify-between gap-2.5">
                                  <div>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[.68rem] font-extrabold uppercase tracking-wide text-emerald-800">
                                        2. Bukti Pelunasan (Lunas)
                                      </span>
                                      <strong className="text-[.76rem] font-black text-emerald-700">
                                        Rp {formatPrice(paymentInfo.settlement.amount)}
                                      </strong>
                                    </div>
                                    <div className="mt-1 text-[.68rem] text-muted space-y-0.5">
                                      <div><span className="font-semibold text-ink">Metode:</span> {paymentInfo.settlement.method}</div>
                                      <div><span className="font-semibold text-ink">Pembayar:</span> {paymentInfo.settlement.sender_name}</div>
                                      {paymentInfo.settlement.notes && (
                                        <div className="text-slate-600 line-clamp-1" title={paymentInfo.settlement.notes}>
                                          <span className="font-semibold text-ink">Catatan:</span> {paymentInfo.settlement.notes}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {paymentInfo.settlement.proof_url ? (
                                    paymentInfo.settlement.proof_url.toLowerCase().endsWith('.pdf') ? (
                                      <a
                                        href={paymentInfo.settlement.proof_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[.7rem] font-bold text-ink hover:text-cyan"
                                      >
                                        <FileText size={14} className="text-red-500" /> Lihat Dokumen (PDF)
                                      </a>
                                    ) : (
                                      <div
                                        className="relative group cursor-pointer overflow-hidden rounded-lg border border-line bg-slate-100"
                                        onClick={() => setLightboxUrl(paymentInfo.settlement.proof_url)}
                                      >
                                        <img
                                          src={paymentInfo.settlement.proof_url}
                                          alt="Bukti Pelunasan"
                                          className="h-28 w-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <span className="inline-flex items-center gap-1 rounded bg-white/90 px-2 py-0.5 text-[.65rem] font-bold text-ink shadow">
                                            <ZoomIn size={12} /> Perbesar
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  ) : (
                                    <div className="text-[.68rem] text-muted italic">Tidak ada foto struk pelunasan</div>
                                  )}
                                </div>
                              ) : (
                                <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-3 flex flex-col justify-center items-center text-center gap-2">
                                  <Receipt size={22} className="text-amber-500 mt-1" />
                                  <div>
                                    <span className="block text-[.72rem] font-bold text-amber-900">Menunggu Bukti Pelunasan</span>
                                    <span className="block text-[.65rem] text-amber-800">Sisa tagihan: Rp {formatPrice(paymentInfo.remaining_amount)}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSettlementBooking(selectedBooking)
                                      setSettlementDraft({
                                        method: 'Transfer BCA',
                                        sender_name: paymentInfo.dp_sender_name || selectedBooking.customer_name || '',
                                        amount: formatPrice(paymentInfo.remaining_amount),
                                        file: null,
                                        file_preview: null,
                                        notes: 'Pelunasan sisa biaya sewa',
                                      })
                                      setSettlementError('')
                                      setSettlementModalOpen(true)
                                    }}
                                    className="rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-[.68rem] font-bold text-white shadow-xs"
                                  >
                                    + Input Pelunasan
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Bukti Lunas Penuh (100%) */
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[.66rem] font-bold text-emerald-800">
                                    <Check size={11} /> Lunas Penuh (100%)
                                  </span>
                                  <span className="text-[.72rem] text-muted">{paymentInfo.method}</span>
                                </div>
                                <div className="mt-1 text-[.72rem] text-ink font-semibold">
                                  a.n {paymentInfo.sender_name} · Rp {formatPrice(paymentInfo.amount || paymentInfo.total_amount)}
                                </div>
                              </div>
                              {paymentInfo.proof_url && (
                                paymentInfo.proof_url.toLowerCase().endsWith('.pdf') ? (
                                  <a
                                    href={paymentInfo.proof_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[.7rem] font-bold text-ink hover:text-cyan"
                                  >
                                    <FileText size={14} className="text-red-500" /> Lihat PDF
                                  </a>
                                ) : (
                                  <div
                                    className="relative group cursor-pointer overflow-hidden rounded-lg border border-line bg-white shrink-0"
                                    onClick={() => setLightboxUrl(paymentInfo.proof_url)}
                                  >
                                    <img
                                      src={paymentInfo.proof_url}
                                      alt="Bukti Transfer"
                                      className="h-16 w-24 object-cover group-hover:scale-105 transition-transform"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <ZoomIn size={14} className="text-white" />
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-line bg-slate-ice/30 p-3 text-center">
                        <p className="m-0 text-[.74rem] text-muted">Belum ada data bukti pembayaran tercatat.</p>
                        <button
                          type="button"
                          onClick={() => {
                            const estPrice = Number(selectedBooking.estimated_price) || 0
                            const defaultDp = estPrice > 0 ? Math.round(estPrice * 0.5 / 1000) * 1000 : 500000
                            setPaymentConfirmBooking(selectedBooking)
                            setPaymentConfirmDraft({
                              pay_type: 'dp',
                              method: 'Transfer BCA',
                              sender_name: selectedBooking.customer_name || '',
                              amount: formatPrice(defaultDp),
                              file: null,
                              file_preview: null,
                              notes: '',
                            })
                            setPaymentConfirmError('')
                            setPaymentConfirmModalOpen(true)
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-cyan/40 bg-cyan/10 px-3 py-1.5 text-[.72rem] font-bold text-cyan hover:bg-cyan/20 transition-colors"
                        >
                          <Plus size={13} /> Tambah Bukti Pembayaran
                        </button>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Ubah status */}
              <div className="flex items-center justify-between gap-3 px-5 py-4 max-[520px]:px-4">
                <span className="text-[.72rem] font-bold uppercase tracking-wide text-muted">Ubah Status</span>
                <div className="w-44">
                  <BookingStatusSelect
                    booking={selectedBooking}
                    onChange={handleBookingStatusChange}
                  />
                </div>
              </div>

              {/* Waktu dibuat */}
              {selectedBooking.created_at && (
                <div className="px-5 py-4 max-[520px]:px-4">
                  <p className="mb-0 text-[.72rem] text-muted">
                    Dibuat pada{' '}
                    {formatJakartaDateTime(selectedBooking.created_at, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {vehicleFormOpen && <div className="admin-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-ink/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-4 max-[520px]:items-center max-[520px]:p-3" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setVehicleFormOpen(false) }}>
        <section className="admin-modal-panel scrollbar-none max-h-[92vh] w-full max-w-[650px] overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-h-[min(760px,92vh)] sm:rounded-2xl max-[520px]:max-h-[84dvh] max-[520px]:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="vehicle-editor-title">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-4 max-[520px]:px-4 max-[520px]:py-3">
            <div>
              <h2 className="m-0 font-display text-[1.05rem] font-bold" id="vehicle-editor-title">{editingVehicleId ? 'Ubah kendaraan' : 'Tambah kendaraan'}</h2>
              <p className="mb-0 mt-1 text-[.8rem] font-medium text-slate-700">Informasi armada yang tampil di katalog.</p>
            </div>
            <button className="grid size-9 place-items-center rounded-xl text-muted hover:bg-slate-ice hover:text-ink" type="button" aria-label="Tutup form" onClick={() => setVehicleFormOpen(false)}><X size={18} aria-hidden="true" /></button>
          </header>
          <form className="vehicle-editor-form grid grid-cols-2 gap-4 p-5 max-[520px]:grid-cols-1 max-[520px]:gap-3 max-[520px]:p-4" onSubmit={handleSaveVehicle}>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Nama kendaraan</span><input className={fieldClass} required maxLength={120} value={vehicleDraft.name} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, name: event.target.value }))} /></label>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Kategori</span><select className={fieldClass} value={vehicleDraft.category} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, category: event.target.value }))}><option>MPV</option><option>Premium</option><option>Rombongan</option></select></label>
            <fieldset className="grid gap-2 rounded-lg border border-line bg-slate-ice/50 p-3"><legend className="px-1 text-[.8rem] font-bold text-ink">Transmisi tersedia</legend><div className="flex flex-wrap gap-x-5 gap-y-2">{[{ value: 'automatic', label: 'Matic' }, { value: 'manual', label: 'Manual' }].map((option) => <label className="flex items-center gap-2 text-[.8rem] font-medium text-slate-900" key={option.value}><input className="size-4 accent-crimson" type="checkbox" checked={vehicleDraft.transmission_options.includes(option.value)} onChange={(event) => setVehicleDraft((draft) => {
              const transmissionStock = { ...draft.transmission_stock }
              if (event.target.checked) transmissionStock[option.value] = 0
              else delete transmissionStock[option.value]
              return { ...draft, transmission_options: event.target.checked ? [...draft.transmission_options, option.value] : draft.transmission_options.filter((type) => type !== option.value), transmission_stock: transmissionStock }
            })} />{option.label}</label>)}</div></fieldset>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Detail transmisi</span><input className={fieldClass} maxLength={120} value={vehicleDraft.transmission_details} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, transmission_details: event.target.value }))} placeholder="CVT / e-CVT Hybrid" /></label>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Teknologi mesin</span><select className={fieldClass} value={vehicleDraft.powertrain_type} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, powertrain_type: event.target.value }))}><option value="">Belum ditentukan</option><option value="gasoline">Bensin</option><option value="hybrid">Hybrid</option><option value="ev_phev">EV / PHEV</option></select></label>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Harga dengan tol / 12 jam</span><input className={fieldClass} maxLength={24} value={vehicleDraft.price} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, price: event.target.value }))} placeholder="1.100.000 atau '-' (Nego)" /><span className="text-[.68rem] text-muted">Isi tanda &apos;-&apos; atau kosongkan jika harga Nego via WhatsApp</span></label>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Harga tanpa tol / 12 jam</span><input className={fieldClass} maxLength={24} value={vehicleDraft.price_without_toll} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, price_without_toll: event.target.value }))} placeholder="1.000.000" /><span className="text-[.68rem] text-muted">Kosongkan jika sama dengan harga dengan tol</span></label>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Tempat duduk</span><input className={fieldClass} required maxLength={40} value={vehicleDraft.seats} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, seats: event.target.value }))} placeholder="6 kursi" /></label>
            <div className="grid gap-2 rounded-lg border border-line p-3"><span className="text-[.8rem] font-bold text-ink">Jumlah unit per transmisi</span>{vehicleDraft.transmission_options.map((type) => <label className="grid grid-cols-[1fr_100px] items-center gap-3 text-[.8rem] font-medium text-slate-900" key={type}><span>{type === 'automatic' ? 'Matic' : 'Manual'}</span><input className={fieldClass} type="number" min="0" step="1" value={vehicleDraft.transmission_stock[type] ?? 0} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, transmission_stock: { ...draft.transmission_stock, [type]: event.target.value } }))} /></label>)}<span className="text-[.78rem] font-semibold text-slate-800">Total baru: {vehicleDraft.transmission_options.reduce((total, type) => total + (Number(vehicleDraft.transmission_stock[type]) || 0), 0)} unit</span>{vehicleDraft.existing_stock > 0 && <span className="text-[.76rem] font-medium leading-5 text-slate-700">Stok lama {vehicleDraft.existing_stock} unit · belum dialokasikan {Math.max(0, vehicleDraft.existing_stock - vehicleDraft.transmission_options.reduce((total, type) => total + (Number(vehicleDraft.transmission_stock[type]) || 0), 0))} unit</span>}</div>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Status unit</span><select className={fieldClass} value={vehicleDraft.status} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, status: event.target.value }))}><option value="ready">Ready</option><option value="booking">Booking</option><option value="maintenance">Perawatan</option></select></label>
            {editingVehicleId ? (
              <div className="grid gap-1.5">
                <label className="grid gap-1.5">
                  <span className="text-[.72rem] font-bold">Label promosi</span>
                  <select className={fieldClass} value={customBadge ? '__custom' : vehicleDraft.badge} onChange={(event) => {
                    if (event.target.value === '__custom') {
                      setCustomBadge(true)
                      setVehicleDraft((draft) => ({ ...draft, badge: promoBadgeOptions.includes(draft.badge) ? '' : draft.badge }))
                    } else {
                      setCustomBadge(false)
                      // Kalau ganti dari Promo ke yang lain → clear data promo
                      // Kalau ganti dari Harga spesial ke yang lain → clear data spesial
                      setVehicleDraft((draft) => ({
                        ...draft,
                        badge: event.target.value,
                        ...(event.target.value !== 'Promo' ? { promo_price: '', promo_start: '', promo_end: '' } : {}),
                        ...(event.target.value !== 'Harga spesial' ? { special_price: '', special_start: '', special_end: '', special_label: '' } : {}),
                      }))
                    }
                  }}>
                    <option value="">Tanpa label</option>
                    <option value="Promo">Promo</option>
                    <option value="Favorit">Favorit</option>
                    <option value="Harga spesial">Harga spesial</option>
                    <option value="__custom">Tulis sendiri</option>
                  </select>
                </label>
                {customBadge && <input className={fieldClass} maxLength={40} value={vehicleDraft.badge} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, badge: event.target.value }))} placeholder="Contoh: Paket Lebaran" aria-label="Teks label promosi kustom" />}
                <span className="text-[.68rem] leading-4 text-muted">Label <strong>Promo</strong>, <strong>Terlaris</strong>, dan <strong>Unit Baru</strong> diatur otomatis oleh sistem.</span>
              </div>
            ) : (
              <div className="grid gap-1.5 rounded-lg border border-line bg-slate-ice/60 p-3">
                <span className="text-[.72rem] font-bold text-ink">Label promosi</span>
                <span className="text-[.72rem] leading-5 text-muted">Label diatur otomatis — <strong className="text-amber-700">Promo</strong> saat harga promo aktif, <strong className="text-amber-700">Unit Baru</strong> selama 7 hari pertama, lalu <strong className="text-crimson">Terlaris</strong> jika masuk top 3 pesanan selesai.</span>
              </div>
            )}
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Urutan tampil</span><input className={fieldClass} type="number" min="0" step="1" value={vehicleDraft.sort_order} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, sort_order: event.target.value }))} /></label>

            {/* Promo & Harga Spesial - hanya saat edit dan sesuai label yang dipilih */}
            {editingVehicleId && (<>
              {/* Promo - muncul kalau badge = Promo */}
              {vehicleDraft.badge === 'Promo' && (
              <div className="col-span-2 grid gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 max-[520px]:col-span-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[.8rem] font-bold text-amber-900">Harga Promo</span>
                  {vehicleDraft.promo_price && vehicleDraft.promo_end && new Date(vehicleDraft.promo_end) >= new Date()
                    ? <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[.64rem] font-bold text-white">Aktif</span>
                    : vehicleDraft.promo_price
                      ? <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[.64rem] font-bold text-slate-600">Tidak aktif</span>
                      : null
                  }
                </div>
                <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
                  <label className="grid gap-1.5">
                    <span className="text-[.72rem] font-bold text-amber-900">Harga promo <span className="font-normal">(dengan tol)</span></span>
                    <input className={fieldClass} maxLength={24} placeholder="700.000" value={vehicleDraft.promo_price} onChange={(e) => setVehicleDraft((d) => ({ ...d, promo_price: e.target.value }))} />
                    <span className="text-[.66rem] text-muted">Harga tanpa tol dihitung otomatis dari selisih diskon</span>
                  </label>
                  <div />
                  <label className="grid gap-1.5">
                    <span className="text-[.72rem] font-bold text-amber-900">Berlaku dari</span>
                    <input className={fieldClass} type="date" value={vehicleDraft.promo_start} onChange={(e) => setVehicleDraft((d) => ({ ...d, promo_start: e.target.value }))} />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-[.72rem] font-bold text-amber-900">Berlaku s/d</span>
                    <input className={fieldClass} type="date" value={vehicleDraft.promo_end} onChange={(e) => setVehicleDraft((d) => ({ ...d, promo_end: e.target.value }))} />
                  </label>
                </div>
                {vehicleDraft.promo_price && (
                  <button type="button" className="w-fit text-[.7rem] font-semibold text-red-500 hover:underline" onClick={() => setVehicleDraft((d) => ({ ...d, promo_price: '', promo_start: '', promo_end: '' }))}>Hapus promo</button>
                )}
              </div>
              )}

              {/* Harga Spesial - muncul kalau badge = Harga spesial */}
              {vehicleDraft.badge === 'Harga spesial' && (
              <div className="col-span-2 grid gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 max-[520px]:col-span-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[.8rem] font-bold text-blue-900">⭐ Harga Spesial</span>
                  {vehicleDraft.special_price
                    ? <span className="rounded-full bg-blue-500 px-2.5 py-0.5 text-[.64rem] font-bold text-white">Aktif</span>
                    : null
                  }
                </div>
                <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
                  <label className="grid gap-1.5">
                    <span className="text-[.72rem] font-bold text-blue-900">Harga spesial <span className="font-normal">(dengan tol)</span></span>
                    <input className={fieldClass} maxLength={24} placeholder="950.000" value={vehicleDraft.special_price} onChange={(e) => setVehicleDraft((d) => ({ ...d, special_price: e.target.value }))} />
                    <span className="text-[.66rem] text-muted">Harga tanpa tol dihitung otomatis dari selisih diskon</span>
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-[.72rem] font-bold text-blue-900">Minimal hari booking</span>
                    <input className={fieldClass} type="number" min="2" max="30" step="1" placeholder="3" value={vehicleDraft.special_min_days} onChange={(e) => setVehicleDraft((d) => ({ ...d, special_min_days: e.target.value }))} />
                    <span className="text-[.66rem] text-muted">Harga berlaku jika booking ≥ X hari (mode Harian)</span>
                  </label>
                  <label className="col-span-2 grid gap-1.5 max-[520px]:col-span-1">
                    <span className="text-[.72rem] font-bold text-blue-900">Label keterangan <span className="font-normal text-muted">(opsional)</span></span>
                    <select className={fieldClass} value={vehicleDraft.special_label} onChange={(e) => setVehicleDraft((d) => ({ ...d, special_label: e.target.value }))}>
                      <option value="">Min. {vehicleDraft.special_min_days || 3} hari (otomatis)</option>
                      <option value="Paket hemat">Paket hemat</option>
                      <option value="Harga long-term">Harga long-term</option>
                      <option value="Diskon durasi">Diskon durasi</option>
                      <option value="Harga spesial pelanggan">Harga spesial pelanggan</option>
                    </select>
                  </label>
                </div>
                {vehicleDraft.special_price && (
                  <button type="button" className="w-fit text-[.7rem] font-semibold text-red-500 hover:underline" onClick={() => setVehicleDraft((d) => ({ ...d, special_price: '', special_min_days: 3, special_label: '' }))}>Hapus harga spesial</button>
                )}
              </div>
              )}
            </>)}

            <div className="col-span-2 grid gap-3 max-[520px]:col-span-1">
              <label className="grid gap-1.5">
                <span className="text-[.72rem] font-bold">Foto kendaraan</span>
                <input
                  className="block w-full rounded-xl border border-line px-3 py-2 text-[.76rem] file:mr-3 file:rounded-lg file:border-0 file:bg-slate-ice file:px-3 file:py-1.5 file:text-[.72rem] file:font-bold"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    const allowed = ['image/jpeg', 'image/png', 'image/webp']
                    if (!allowed.includes(file.type)) {
                      setVehicleFormError('Format foto tidak didukung. Harap gunakan format JPG, PNG, atau WebP.')
                      event.target.value = ''
                      return
                    }
                    if (file.size > 25 * 1024 * 1024) {
                      setVehicleFormError(`Ukuran foto terlalu besar (${formatFileSize(file.size)}). Maksimal ukuran file adalah 25 MB sebelum kompresi.`)
                      event.target.value = ''
                      return
                    }
                    setVehicleFormError('')
                    let processed = file
                    if (file.size > 500 * 1024) {
                      try {
                        processed = await compressImageFile(file, { maxWidthOrHeight: 1920, quality: 0.84 })
                      } catch (cErr) {
                        console.warn('[Auto compress error]', cErr)
                      }
                    }
                    if (processed.size > 5 * 1024 * 1024) {
                      setVehicleFormError(`Ukuran foto kendaraan melebihi batas 5 MB (${formatFileSize(processed.size)}). Silakan gunakan foto yang lebih kecil.`)
                      event.target.value = ''
                      return
                    }
                    setVehicleImage({ file: processed, previewUrl: URL.createObjectURL(processed) })
                  }}
                />
              </label>
              {(vehicleImage?.previewUrl || vehicleDraft.image_url) && (
                <img
                  className="h-36 w-full rounded-xl border border-line bg-slate-ice object-contain p-2"
                  src={vehicleImage?.previewUrl ?? vehicleDraft.image_url}
                  alt="Pratinjau foto kendaraan"
                />
              )}
              <span className="text-[.74rem] font-medium text-slate-700">
                JPG, PNG, atau WebP. Maksimal 5 MB (Otomatis Dioptimasi).{' '}
                {vehicleImage && (
                  <span className="font-bold text-emerald-700">
                    Foto terpilih: {formatFileSize(vehicleImage.file.size)}
                  </span>
                )}{' '}
                Foto lama dipertahankan jika tidak memilih foto baru.
              </span>
            </div>
            <label className="col-span-2 flex items-center gap-2.5 text-[.78rem] font-medium max-[520px]:col-span-1"><input className="size-4 accent-crimson" type="checkbox" checked={vehicleDraft.is_active} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, is_active: event.target.checked }))} />Tampilkan di katalog publik</label>
            {vehicleFormError && <p className="col-span-2 m-0 rounded-xl bg-red-50 px-3 py-2.5 text-[.74rem] text-red-700 max-[520px]:col-span-1" role="alert">{vehicleFormError}</p>}
            <div className="col-span-2 sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-line bg-white px-5 py-4 max-[520px]:col-span-1 max-[520px]:-mx-4 max-[520px]:-mb-4 max-[520px]:px-4 max-[520px]:py-3">
              <button className="h-10 rounded-xl border border-line px-4 text-[.76rem] font-bold text-muted hover:bg-slate-ice" type="button" onClick={() => setVehicleFormOpen(false)}>Batal</button>
              <button className="h-10 rounded-xl bg-crimson px-4 text-[.76rem] font-bold text-white hover:bg-crimson-deep disabled:opacity-60" type="submit" disabled={savingVehicle}>{savingVehicle ? 'Menyimpan...' : 'Simpan kendaraan'}</button>
            </div>
          </form>
        </section>
      </div>}

      {driverFormOpen && (
        <div className="admin-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-ink/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDriverFormOpen(false) }}>
          <section className="admin-modal-panel scrollbar-none max-h-[92vh] w-full max-w-[500px] overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-h-[min(760px,92vh)] sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="driver-editor-title">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-4">
              <div>
                <h2 className="m-0 font-display text-[1.05rem] font-bold" id="driver-editor-title">{editingDriverId ? 'Ubah data supir' : 'Tambah supir baru'}</h2>
                <p className="mb-0 mt-1 text-[.72rem] text-muted">Kelola profil dan ketersediaan supir operasional.</p>
              </div>
              <button className="grid size-9 place-items-center rounded-xl text-muted hover:bg-slate-ice hover:text-ink" type="button" aria-label="Tutup form" onClick={() => setDriverFormOpen(false)}>
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <form className="grid gap-4 p-5" onSubmit={handleSaveDriver}>
              <label className="grid gap-1.5">
                <span className="text-[.72rem] font-bold">Nama Lengkap Supir</span>
                <input className={fieldClass} required maxLength={120} value={driverDraft.name} onChange={(event) => setDriverDraft((d) => ({ ...d, name: event.target.value }))} placeholder="Contoh: Pak Budi Santoso" />
              </label>
              <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
                <label className="grid gap-1.5">
                  <span className="text-[.72rem] font-bold">No. WhatsApp / Telepon</span>
                  <input className={fieldClass} required maxLength={30} value={driverDraft.phone} onChange={(event) => setDriverDraft((d) => ({ ...d, phone: event.target.value }))} placeholder="08123456789" />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[.72rem] font-bold">Jenis SIM</span>
                  <select className={fieldClass} value={driverDraft.sim_type} onChange={(event) => setDriverDraft((d) => ({ ...d, sim_type: event.target.value }))}>
                    <option value="SIM A">SIM A (Mobil biasa)</option>
                    <option value="SIM B1">SIM B1 (HiAce / Elf)</option>
                    <option value="SIM B2">SIM B2 (Bus / Truk)</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-1.5">
                <span className="text-[.72rem] font-bold">Status Ketersediaan</span>
                <select className={fieldClass} value={driverDraft.status} onChange={(event) => setDriverDraft((d) => ({ ...d, status: event.target.value }))}>
                  <option value="available">Tersedia / Kosong</option>
                  <option value="on_duty">Sedang Bertugas</option>
                  <option value="off">Libur / Off</option>
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-[.72rem] font-bold">Catatan / Rute (Opsional)</span>
                <textarea className="min-h-[75px] rounded-xl border border-line p-3 text-[.8rem] outline-none focus:border-cyan" maxLength={250} value={driverDraft.notes} onChange={(event) => setDriverDraft((d) => ({ ...d, notes: event.target.value }))} placeholder="Contoh: Spesialis rute luar kota, biasa bawa Innova / Fortuner" />
              </label>

              {driverFormError && <p className="m-0 rounded-xl bg-red-50 px-3 py-2.5 text-[.74rem] text-red-700" role="alert">{driverFormError}</p>}
              <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-line bg-white px-5 py-4">
                <button className="h-10 rounded-xl border border-line px-4 text-[.76rem] font-bold text-muted hover:bg-slate-ice" type="button" onClick={() => setDriverFormOpen(false)}>Batal</button>
                <button className="h-10 rounded-xl bg-crimson px-4 text-[.76rem] font-bold text-white hover:bg-crimson-deep disabled:opacity-60" type="submit" disabled={savingDriver}>{savingDriver ? 'Menyimpan...' : 'Simpan supir'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {bookingFormOpen && (
        <div
          className="admin-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-ink/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setBookingFormOpen(false) }}
        >
          <form
            onSubmit={handleSaveManualBooking}
            className="admin-modal-panel flex max-h-[90vh] w-full max-w-[640px] flex-col rounded-t-2xl bg-white shadow-2xl sm:max-h-[min(820px,90vh)] sm:rounded-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-booking-title"
          >
            <style>{`
              .manual-booking-scroll::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
              .manual-booking-scroll { -ms-overflow-style: none !important; scrollbar-width: none !important; }
            `}</style>

            {/* Header: Fixed top */}
            <header className="flex shrink-0 items-center justify-between border-b border-line bg-white px-5 py-4">
              <div>
                <h2 className="m-0 font-display text-[1.05rem] font-bold" id="manual-booking-title">Input Booking Manual (Order WA)</h2>
                <p className="mb-0 mt-0.5 text-[.72rem] text-muted">Catat pesanan dari WhatsApp atau offline ke dalam sistem reservasi.</p>
              </div>
              <button
                className="grid size-9 place-items-center rounded-xl text-muted hover:bg-slate-ice hover:text-ink"
                type="button"
                aria-label="Tutup form"
                onClick={() => setBookingFormOpen(false)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            {/* Error Notification Banner if any (Always visible right under header) */}
            {bookingFormError && (
              <div className="shrink-0 bg-red-50 border-b border-red-200 px-5 py-2.5 flex items-start gap-2.5 text-[.74rem] text-red-700 animate-fadeIn" role="alert">
                <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
                <span className="flex-1 font-medium">{bookingFormError}</span>
                <button
                  type="button"
                  onClick={() => setBookingFormError('')}
                  className="shrink-0 text-red-500 hover:text-red-800"
                  aria-label="Tutup error"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Scrollable Content Body with hidden scrollbar */}
            <div
              data-scrollbar="none"
              className="manual-booking-scroll scrollbar-none flex-1 overflow-y-auto px-5 py-4"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              <div className="grid gap-3.5">
                {/* 1. Pelanggan & Lokasi Jemput */}
                <div className="rounded-xl border border-line bg-slate-ice/40 p-3.5">
                  <span className="mb-2 block text-[.68rem] font-extrabold uppercase tracking-wider text-muted">1. Data Pelanggan & Lokasi Jemput</span>
                  <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
                    <label className="grid gap-1">
                      <span className="text-[.72rem] font-bold text-ink">Nama Pemesan *</span>
                      <input
                        className={fieldClass}
                        required
                        maxLength={80}
                        value={bookingDraft.customer_name}
                        onChange={(e) => setBookingDraft((d) => ({ ...d, customer_name: e.target.value }))}
                        placeholder="Contoh: Bpk. ******"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[.72rem] font-bold text-ink">No. WhatsApp / HP *</span>
                      <input
                        className={fieldClass}
                        required
                        maxLength={30}
                        value={bookingDraft.customer_phone}
                        onChange={(e) => setBookingDraft((d) => ({ ...d, customer_phone: e.target.value }))}
                        placeholder="Contoh: 0812-****-****"
                      />
                    </label>
                  </div>
                  <label className="mt-2.5 grid gap-1">
                    <span className="text-[.72rem] font-bold text-ink">Alamat Jemput / Titik Temu *</span>
                    <input
                      className={fieldClass}
                      required
                      maxLength={200}
                      value={bookingDraft.pickup_address}
                      onChange={(e) => setBookingDraft((d) => ({ ...d, pickup_address: e.target.value }))}
                      placeholder="Contoh: Pool Khalisa / Bandara Soetta T3 / Jl. *******"
                    />
                  </label>
                </div>

                {/* 2. Armada & Layanan */}
                {(() => {
                  const currentVehicle = vehicles.find((v) => String(v.id) === String(bookingDraft.vehicle_id))
                  const vehicleCheck = checkVehicleAvailableInWindow(
                    currentVehicle,
                    manualBookingWindow,
                    bookings,
                    null,
                    manualVehicleAvailability
                  )
                  const transmissionCheck = checkVehicleAvailableInWindow(
                    currentVehicle,
                    manualBookingWindow,
                    bookings,
                    bookingDraft.transmission_type,
                    manualVehicleAvailability
                  )
                  const isCurrentVehicleBlocked = !vehicleCheck.available || !transmissionCheck.available
                  const availableFleetList = vehicles.filter((v) =>
                    checkVehicleAvailableInWindow(v, manualBookingWindow, bookings, null, manualVehicleAvailability).available
                  )

                  return (
                    <div className="rounded-xl border border-line bg-slate-ice/40 p-3.5">
                      <span className="mb-2 block text-[.68rem] font-extrabold uppercase tracking-wider text-muted">2. Armada & Layanan</span>

                      <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
                        <label className="grid gap-1">
                          <span className="text-[.72rem] font-bold text-ink">Model Kendaraan *</span>
                          <select
                            className={`${fieldClass} ${!vehicleCheck.available ? 'border-rose-400 bg-rose-50/60 text-rose-900 focus:border-rose-500 ring-1 ring-rose-300' : ''}`}
                            value={bookingDraft.vehicle_id}
                            onChange={(e) => handleManualVehicleChange(e.target.value)}
                          >
                            {vehicles.map((v) => {
                              const check = checkVehicleAvailableInWindow(v, manualBookingWindow, bookings, null, manualVehicleAvailability)
                              const isCurrent = String(v.id) === String(bookingDraft.vehicle_id)
                              const statusTag = !check.available ? (check.reason.includes('Perawatan') ? ' (Perawatan)' : ' (Penuh)') : ''
                              return (
                                <option
                                  key={v.id}
                                  value={v.id}
                                  disabled={!check.available && !isCurrent}
                                  className={!check.available ? 'text-gray-400 bg-gray-50' : 'text-ink'}
                                >
                                  {v.name} ({v.category || 'Armada'}){statusTag}
                                </option>
                              )
                            })}
                          </select>
                        </label>

                        <label className="grid gap-1">
                          <span className="text-[.72rem] font-bold text-ink">Transmisi *</span>
                          <select
                            className={`${fieldClass} ${!transmissionCheck.available ? 'border-rose-400 bg-rose-50/60 text-rose-900 ring-1 ring-rose-300' : ''}`}
                            value={bookingDraft.transmission_type}
                            onChange={(e) => setBookingDraft((d) => ({ ...d, transmission_type: e.target.value }))}
                          >
                            {(() => {
                              const v = currentVehicle
                              const opts = v?.transmission_options && v.transmission_options.length > 0
                                ? v.transmission_options
                                : ['automatic', 'manual']
                              return opts.map((opt) => {
                                const tCheck = checkVehicleAvailableInWindow(v, manualBookingWindow, bookings, opt, manualVehicleAvailability)
                                const label = opt === 'automatic' ? 'Matic' : 'Manual'
                                const statusTag = !tCheck.available ? ' (Penuh)' : ''
                                return (
                                  <option
                                    key={opt}
                                    value={opt}
                                    disabled={!tCheck.available}
                                    className={!tCheck.available ? 'text-gray-400 bg-gray-50' : 'text-ink'}
                                  >
                                    {label}{statusTag}
                                  </option>
                                )
                              })
                            })()}
                          </select>
                        </label>
                      </div>

                      {/* Notifikasi Ringkas Jika Mobil Terpilih Sedang Penuh */}
                      {isCurrentVehicleBlocked && (
                        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[.74rem] text-rose-700 animate-fadeIn">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <AlertCircle size={15} className="shrink-0 text-rose-600" />
                            <span className="truncate"><strong>{currentVehicle?.name}</strong> sedang tidak tersedia pada jam ini.</span>
                          </div>
                          {availableFleetList.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleManualVehicleChange(availableFleetList[0].id)}
                              className="text-[.7rem] font-bold text-rose-800 underline hover:text-rose-950 cursor-pointer shrink-0 ml-1"
                            >
                              Ganti ke {availableFleetList[0].name}
                            </button>
                          )}
                        </div>
                      )}

                  <div className="mt-2.5 grid grid-cols-2 gap-3 max-[580px]:grid-cols-1">
                    {(() => {
                      const tempWindow = (() => {
                        if (!bookingDraft.start_date || !bookingDraft.start_time) return null
                        try {
                          const s = toJakartaISOString(bookingDraft.start_date, bookingDraft.start_time)
                          const totalH = Number(bookingDraft.duration_hours) || 24
                          const e = new Date(new Date(s).getTime() + totalH * 60 * 60 * 1000).toISOString()
                          return { start_at: s, end_at: e }
                        } catch {
                          return null
                        }
                      })()

                      const availableDrivers = tempWindow
                        ? drivers.filter((d) => d.status !== 'off' && !isDriverBookedForWindow(d.id, tempWindow, bookings))
                        : drivers.filter((d) => d.status !== 'off')

                      const noDriverAvailable = tempWindow !== null && availableDrivers.length === 0

                      return (
                        <>
                          <label className="grid min-w-0 gap-1">
                            <span className="text-[.72rem] font-bold text-ink flex items-center justify-between">
                              <span>Mode Layanan *</span>
                              {noDriverAvailable && (
                                <span className="text-[.62rem] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                  Supir Habis / Penuh
                                </span>
                              )}
                            </span>
                            <select
                              className={`${fieldClass} truncate ${noDriverAvailable && bookingDraft.booking_mode !== 'Sewa mobil lepas kunci' ? 'border-rose-400 bg-rose-50/40 text-rose-900' : ''}`}
                              value={bookingDraft.booking_mode}
                              onChange={(e) => {
                                const nextMode = e.target.value
                                setBookingDraft((d) => ({
                                  ...d,
                                  booking_mode: nextMode,
                                  ...(nextMode === 'Sewa mobil lepas kunci' ? { driver_id: '' } : {})
                                }))
                              }}
                            >
                              <option value="Sewa mobil lepas kunci">Lepas Kunci (Self Drive)</option>
                              <option
                                value="Sewa mobil + Supir"
                                disabled={noDriverAvailable}
                              >
                                {noDriverAvailable ? 'Dengan Supir (❌ Supir Penuh / Bentrok)' : 'Dengan Supir (+ Driver)'}
                              </option>
                              <option
                                value="Rental Acara"
                                disabled={noDriverAvailable}
                              >
                                {noDriverAvailable ? 'Paket Rental Acara (❌ Supir Penuh / Bentrok)' : 'Paket Rental Acara'}
                              </option>
                            </select>
                          </label>

                          {bookingDraft.booking_mode === 'Sewa mobil + Supir' || bookingDraft.booking_mode === 'Rental Acara' ? (() => {
                            const selectedDriverConflict = (() => {
                              if (!bookingDraft.driver_id) return null
                              const d = drivers.find((drv) => String(drv.id) === String(bookingDraft.driver_id))
                              if (!d) return null
                              if (d.status === 'off') return `${d.name} sedang berstatus Libur`
                              if (tempWindow && isDriverBookedForWindow(d.id, tempWindow, bookings)) {
                                return `${d.name} memiliki jadwal tugas lain yang bentrok`
                              }
                              return null
                            })()

                            return (
                              <label className="grid min-w-0 gap-1">
                                <span className="text-[.72rem] font-bold text-ink">
                                  Supir Bertugas {bookingDraft.status === 'confirmed' ? '*' : '(Opsional)'}
                                </span>
                                <select
                                  className={`${fieldClass} truncate ${selectedDriverConflict || noDriverAvailable ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500' : ''}`}
                                  value={bookingDraft.driver_id}
                                  onChange={(e) => setBookingDraft((d) => ({ ...d, driver_id: e.target.value }))}
                                >
                                  <option value="">
                                    {noDriverAvailable ? '-- Tidak ada supir tersedia --' : '-- Pilih supir / nanti --'}
                                  </option>
                                  {drivers.map((d) => {
                                    const isBusy = tempWindow ? isDriverBookedForWindow(d.id, tempWindow, bookings) : false
                                    const statusTag = d.status === 'off' ? ' (Libur)' : isBusy ? ' (Jadwal Bentrok)' : d.status === 'on_duty' ? ' (Sedang Tugas)' : ' (Tersedia)'
                                    return (
                                      <option
                                        key={d.id}
                                        value={d.id}
                                        disabled={d.status === 'off' || isBusy}
                                        className={isBusy || d.status === 'off' ? 'text-gray-400 bg-gray-50' : ''}
                                      >
                                        {d.name}{statusTag}
                                      </option>
                                    )
                                  })}
                                </select>
                                {noDriverAvailable ? (
                                  <span className="text-[.68rem] font-medium text-rose-600 animate-fadeIn">
                                    ⚠️ Seluruh supir sedang bertugas atau libur pada rentang waktu ini. Silakan pilih layanan Lepas Kunci atau ubah tanggal sewa.
                                  </span>
                                ) : selectedDriverConflict ? (
                                  <span className="text-[.68rem] font-medium text-rose-600 animate-fadeIn">
                                    ⚠️ {selectedDriverConflict}. Silakan ganti supir lain.
                                  </span>
                                ) : null}
                              </label>
                            )
                          })() : (
                            <div className="flex min-w-0 items-center rounded-xl border border-dashed border-line bg-white/70 px-3 text-[.74rem] text-muted italic">
                              Tanpa supir (pelanggan nyetir sendiri)
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>

                  {/* Opsi Khusus Paket Acara (Tampil jika Mode Layanan === 'Rental Acara') */}
                  {bookingDraft.booking_mode === 'Rental Acara' && (
                    <div className="mt-3 space-y-3 rounded-xl border border-purple-200 bg-purple-50/70 p-3.5 animate-fadeIn">
                      <div className="flex items-center gap-1.5 text-purple-800">
                        <Sparkles size={14} className="shrink-0 text-purple-600" />
                        <span className="text-[.74rem] font-bold">Detail Jenis Acara & Add-on Dekorasi</span>
                      </div>

                      <div className="grid gap-2.5">
                        <div className="grid min-w-0 gap-1">
                          <span className="text-[.68rem] font-bold text-purple-900">Jenis Acara *</span>
                          <select
                            className="h-9 w-full min-w-0 rounded-lg border border-purple-200 bg-white px-2.5 text-[.76rem] font-semibold text-ink outline-none focus:border-purple-500"
                            value={bookingDraft.event_type}
                            onChange={(e) => setBookingDraft((d) => ({ ...d, event_type: e.target.value }))}
                          >
                            {eventTypeOptions.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          {bookingDraft.event_type === 'Lainnya' && (
                            <input
                              type="text"
                              maxLength={80}
                              className="mt-1 h-8 w-full min-w-0 rounded-lg border border-purple-200 bg-white px-2.5 text-[.74rem] text-ink outline-none focus:border-purple-500"
                              placeholder="Sebutkan jenis acara..."
                              value={bookingDraft.event_type_other}
                              onChange={(e) => setBookingDraft((d) => ({ ...d, event_type_other: e.target.value }))}
                            />
                          )}
                        </div>

                        <div className="grid min-w-0 gap-1.5 border-t border-purple-200/60 pt-2.5">
                          <span className="text-[.68rem] font-bold text-purple-900">Add-on Dekorasi (Bisa pilih lebih dari satu):</span>
                          <div className="flex flex-wrap gap-1.5">
                            {eventAddonOptions.map((opt) => {
                              const isSelected = Array.isArray(bookingDraft.event_addons) && bookingDraft.event_addons.includes(opt.id)
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => {
                                    setBookingDraft((prev) => {
                                      const cur = Array.isArray(prev.event_addons) ? prev.event_addons : []
                                      const next = isSelected ? cur.filter((id) => id !== opt.id) : [...cur, opt.id]
                                      return { ...prev, event_addons: next }
                                    })
                                  }}
                                  className={`rounded-full border px-2.5 py-1 text-[.66rem] font-semibold transition-all ${
                                    isSelected
                                      ? 'border-purple-600 bg-purple-600 text-white shadow-xs'
                                      : 'border-purple-200 bg-white text-purple-900 hover:border-purple-400'
                                  }`}
                                >
                                  {isSelected ? `✓ ${opt.label}` : opt.label}
                                </button>
                              )
                            })}
                          </div>
                          {Array.isArray(bookingDraft.event_addons) && bookingDraft.event_addons.includes('kustom') && (
                            <input
                              type="text"
                              maxLength={100}
                              className="mt-1 h-8 w-full min-w-0 rounded-lg border border-purple-200 bg-white px-2.5 text-[.74rem] text-ink outline-none focus:border-purple-500"
                              placeholder="Tulis dekorasi kustom yang diminta..."
                              value={bookingDraft.event_addon_custom}
                              onChange={(e) => setBookingDraft((d) => ({ ...d, event_addon_custom: e.target.value }))}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                  )
                })()}

                {/* 3. Jadwal & Durasi Sewa */}
                <div className="rounded-xl border border-line bg-slate-ice/40 p-3.5">
                  <span className="mb-2 block text-[.68rem] font-extrabold uppercase tracking-wider text-muted">3. Jadwal & Durasi Sewa</span>
                  <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
                    <label className="grid gap-1">
                      <span className="text-[.72rem] font-bold text-ink">Tanggal Mulai *</span>
                      <input
                        type="date"
                        className={fieldClass}
                        required
                        value={bookingDraft.start_date}
                        onChange={(e) => setBookingDraft((d) => ({ ...d, start_date: e.target.value }))}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[.72rem] font-bold text-ink">Jam Mulai *</span>
                      <input
                        type="time"
                        className={fieldClass}
                        required
                        value={bookingDraft.start_time}
                        onChange={(e) => setBookingDraft((d) => ({ ...d, start_time: e.target.value }))}
                      />
                    </label>
                  </div>

                  {/* Input Durasi Komposit ala Halaman Utama (Bulan, Hari, Jam) */}
                  <div className="mt-3 border-t border-line/60 pt-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[.72rem] font-bold text-ink">Durasi Sewa:</span>
                      <span className="text-[.72rem] font-bold text-crimson">
                        {formatDuration(bookingDraft.duration_hours, 'jam')} {Number(bookingDraft.duration_hours) > 0 ? `(${bookingDraft.duration_hours} jam total)` : ''}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <label className="flex flex-col gap-1 rounded-xl border border-line bg-white p-2 text-center transition-colors focus-within:border-cyan">
                        <span className="text-[.65rem] font-bold uppercase tracking-wider text-muted">Bulan</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="w-full text-center text-[.95rem] font-extrabold text-ink outline-none"
                          value={bookingDraft.duration_months}
                          onChange={(e) => updateManualDurationParts(e.target.value, bookingDraft.duration_days, bookingDraft.duration_hours_part)}
                          placeholder="0"
                        />
                        <span className="text-[.6rem] text-muted">× 30 hari</span>
                      </label>

                      <label className="flex flex-col gap-1 rounded-xl border border-line bg-white p-2 text-center transition-colors focus-within:border-cyan">
                        <span className="text-[.65rem] font-bold uppercase tracking-wider text-muted">Hari</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="w-full text-center text-[.95rem] font-extrabold text-ink outline-none"
                          value={bookingDraft.duration_days}
                          onChange={(e) => updateManualDurationParts(bookingDraft.duration_months, e.target.value, bookingDraft.duration_hours_part)}
                          placeholder="0"
                        />
                        <span className="text-[.6rem] text-muted">× 24 jam</span>
                      </label>

                      <label className="flex flex-col gap-1 rounded-xl border border-line bg-white p-2 text-center transition-colors focus-within:border-cyan">
                        <span className="text-[.65rem] font-bold uppercase tracking-wider text-muted">Jam</span>
                        <input
                          type="number"
                          min="0"
                          max="23"
                          step="1"
                          className="w-full text-center text-[.95rem] font-extrabold text-ink outline-none"
                          value={bookingDraft.duration_hours_part}
                          onChange={(e) => updateManualDurationParts(bookingDraft.duration_months, bookingDraft.duration_days, e.target.value)}
                          placeholder="0"
                        />
                        <span className="text-[.6rem] text-muted">Jam tambahan</span>
                      </label>
                    </div>

                    {/* Tombol Pilihan Durasi Cepat */}
                    <div className="mt-2.5">
                      <span className="mb-1.5 block text-[.66rem] font-semibold text-muted">Pilihan Cepat:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: '12 Jam', hours: 12 },
                          { label: '1 Hari', hours: 24 },
                          { label: '2 Hari', hours: 48 },
                          { label: '3 Hari', hours: 72 },
                          { label: '1 Minggu', hours: 168 },
                          { label: '1 Bulan (30 Hari)', hours: 720 },
                          { label: '2 Bulan (60 Hari)', hours: 1440 },
                          { label: '3 Bulan (90 Hari)', hours: 2160 },
                        ].map((preset) => {
                          const isSelected = Number(bookingDraft.duration_hours) === preset.hours
                          return (
                            <button
                              key={preset.hours}
                              type="button"
                              onClick={() => handleManualDurationPreset(preset.hours)}
                              className={`rounded-lg px-2.5 py-1 text-[.68rem] font-semibold transition-colors ${
                                isSelected
                                  ? 'bg-ink text-white shadow-sm'
                                  : 'border border-line bg-white text-muted hover:border-cyan/40 hover:text-ink'
                              }`}
                            >
                              {preset.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Info Realtime Jadwal Kembali */}
                    {bookingDraft.start_date && bookingDraft.start_time && (
                      <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-cyan/30 bg-cyan/5 px-3 py-2 text-[.74rem] text-cyan">
                        <Clock3 size={15} className="shrink-0 text-cyan" />
                        <span>
                          Jadwal Kembali: <strong>
                            {(() => {
                              try {
                                const s = toJakartaISOString(bookingDraft.start_date, bookingDraft.start_time)
                                const totalH = Number(bookingDraft.duration_hours) || 24
                                const e = new Date(new Date(s).getTime() + totalH * 60 * 60 * 1000).toISOString()
                                return formatJakartaDateTime(e, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
                              } catch {
                                return '—'
                              }
                            })()} WIB
                          </strong> ({formatDuration(bookingDraft.duration_hours, 'jam')})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Biaya Sewa & Status Booking */}
                <div className="rounded-xl border border-line bg-slate-ice/40 p-3.5">
                  <span className="mb-2 block text-[.68rem] font-extrabold uppercase tracking-wider text-muted">4. Biaya & Status Booking</span>
                  <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
                    <label className="grid gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[.72rem] font-bold text-ink">Harga Sewa / Deal *</span>
                        {(() => {
                          const v = vehicles.find((item) => String(item.id) === String(bookingDraft.vehicle_id))
                          const std = calculateVehicleRate(v, bookingDraft.duration_hours, bookingDraft.toll_included)
                          return std.price > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                const formatted = formatPrice(std.price)
                                setBookingDraft((d) => ({
                                  ...d,
                                  deal_price: formatted,
                                  ...(d.payment_type === 'full' ? { payment_amount: formatted } : {}),
                                }))
                              }}
                              className="text-[.64rem] font-semibold text-cyan hover:underline"
                              title="Kembalikan ke tarif standar acuan"
                            >
                              Reset Acuan (Rp {formatPrice(std.price)})
                            </button>
                          ) : null
                        })()}
                      </div>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-2.5 text-[.78rem] font-bold text-muted">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          className={`${fieldClass} pl-9 font-bold`}
                          required
                          value={bookingDraft.deal_price}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '')
                            const formattedVal = val ? parseInt(val, 10).toLocaleString('id-ID') : ''
                            setBookingDraft((d) => ({
                              ...d,
                              deal_price: formattedVal,
                              ...(d.payment_type === 'full' ? { payment_amount: formattedVal } : {}),
                            }))
                          }}
                          placeholder="850.000"
                        />
                      </div>
                      <span className="text-[.63rem] text-muted">Otomatis dihitung dari armada & durasi, bisa langsung diedit sesuai deal.</span>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-[.72rem] font-bold text-ink">Status Awal Booking *</span>
                      <select
                        className={fieldClass}
                        value={
                          bookingDraft.status === 'confirmed'
                            ? (bookingDraft.payment_type === 'full' ? 'confirmed_full' : 'confirmed_dp')
                            : 'pending'
                        }
                        onChange={(e) => {
                          const val = e.target.value
                          const dealNum = parseInt(String(bookingDraft.deal_price || '0').replace(/\D/g, ''), 10) || 0
                          if (val === 'confirmed_full') {
                            setBookingDraft((d) => ({
                              ...d,
                              status: 'confirmed',
                              payment_type: 'full',
                              payment_amount: d.deal_price,
                            }))
                          } else if (val === 'confirmed_dp') {
                            const half = Math.round(dealNum * 0.5 / 1000) * 1000 || 500000
                            setBookingDraft((d) => ({
                              ...d,
                              status: 'confirmed',
                              payment_type: 'dp',
                              payment_amount: d.payment_amount && d.payment_amount !== d.deal_price ? d.payment_amount : formatPrice(half),
                            }))
                          } else {
                            setBookingDraft((d) => ({
                              ...d,
                              status: 'pending',
                            }))
                          }
                        }}
                      >
                        <option value="confirmed_full">✅ Dikonfirmasi (Lunas Penuh 100%)</option>
                        <option value="confirmed_dp">🟡 Dikonfirmasi (Bayar DP / Uang Muka)</option>
                        <option value="pending">⏳ Menunggu (Belum Bayar / Menunggu DP)</option>
                      </select>
                      <span className="text-[.63rem] text-muted">
                        {bookingDraft.status === 'confirmed'
                          ? (bookingDraft.payment_type === 'full'
                              ? 'Status Lunas 100%: Unit langsung dikunci di web & tidak ada sisa tagihan.'
                              : 'Status DP: Unit langsung dikunci di web & sisa tagihan dilunasi nanti.')
                          : 'Status Menunggu: Belum ada pembayaran masuk, unit belum dikunci permanen.'}
                      </span>
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line/60 pt-2.5">
                    <label className="flex items-center gap-2 text-[.74rem] text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-line text-cyan focus:ring-cyan"
                        checked={bookingDraft.toll_included}
                        onChange={(e) => handleTollToggle(e.target.checked)}
                      />
                      <span className="font-semibold">Termasuk Biaya Tol</span>
                    </label>
                    {bookingDraft.toll_included && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[.72rem] text-muted font-bold">Biaya Tol: Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          className={`${fieldClass} !h-8 !w-32 font-bold`}
                          value={bookingDraft.toll_amount}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '')
                            setBookingDraft((d) => ({
                              ...d,
                              toll_amount: val ? parseInt(val, 10).toLocaleString('id-ID') : '',
                            }))
                          }}
                          placeholder="50.000"
                        />
                        <span className="text-[.63rem] text-muted">(Bisa diedit)</span>
                      </div>
                    )}
                  </div>

                  <label className="mt-3 grid gap-1 border-t border-line/60 pt-2.5">
                    <span className="text-[.72rem] font-bold text-ink">Catatan Order (WhatsApp / Transfer)</span>
                    <textarea
                      className="min-h-[60px] rounded-xl border border-line bg-white p-2.5 text-[.78rem] outline-none focus:border-cyan"
                      maxLength={300}
                      value={bookingDraft.notes}
                      onChange={(e) => setBookingDraft((d) => ({ ...d, notes: e.target.value }))}
                      placeholder="Contoh: [ORDER VIA WA] - DP via transfer BCA"
                    />
                  </label>
                </div>

                {/* 5. Rincian Pembayaran & Bukti Transfer (Khusus jika status Dikonfirmasi) */}
                {bookingDraft.status === 'confirmed' && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[.68rem] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <Receipt size={14} className="text-emerald-600" />
                        5. Pembayaran & Bukti Transfer ({bookingDraft.payment_type === 'full' ? 'Lunas Penuh 100%' : 'DP / Uang Muka'})
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[.62rem] font-bold text-emerald-700">
                        Wajib Diisi
                      </span>
                    </div>

                    {/* Pilihan Jenis Pembayaran: DP vs Lunas */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-xl border border-emerald-200">
                      <button
                        type="button"
                        onClick={() => {
                          const dealNum = parseInt(String(bookingDraft.deal_price || '0').replace(/\D/g, ''), 10) || 0
                          const half = Math.round(dealNum * 0.5 / 1000) * 1000 || 500000
                          setBookingDraft((d) => ({
                            ...d,
                            payment_type: 'dp',
                            payment_amount: d.payment_amount && d.payment_amount !== d.deal_price ? d.payment_amount : formatPrice(half),
                          }))
                        }}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[.74rem] font-bold transition-all ${
                          bookingDraft.payment_type === 'dp'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'text-muted hover:text-ink'
                        }`}
                      >
                        <span>🟡 DP (Uang Muka)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBookingDraft((d) => ({
                            ...d,
                            payment_type: 'full',
                            payment_amount: d.deal_price,
                          }))
                        }}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[.74rem] font-bold transition-all ${
                          bookingDraft.payment_type === 'full'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-muted hover:text-ink'
                        }`}
                      >
                        <span>✅ Lunas Penuh (100%)</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
                      <label className="grid gap-1">
                        <span className="text-[.72rem] font-bold text-ink">Metode Pembayaran *</span>
                        <select
                          className={fieldClass}
                          required
                          value={bookingDraft.payment_method}
                          onChange={(e) => setBookingDraft((d) => ({ ...d, payment_method: e.target.value }))}
                        >
                          {paymentMethodOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </label>

                      <label className="grid gap-1">
                        <span className="text-[.72rem] font-bold text-ink">Nama Pemilik Rekening / Pengirim *</span>
                        <input
                          type="text"
                          required
                          className={fieldClass}
                          placeholder={bookingDraft.customer_name || 'Contoh: Bpk Handoko'}
                          value={bookingDraft.payment_sender_name}
                          onChange={(e) => setBookingDraft((d) => ({ ...d, payment_sender_name: e.target.value }))}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
                      <label className="grid gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[.72rem] font-bold text-ink">
                            {bookingDraft.payment_type === 'full' ? 'Nominal Lunas 100% (Rp) *' : 'Nominal DP (Rp) *'}
                          </span>
                          {bookingDraft.payment_type === 'dp' && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const dealNum = parseInt(String(bookingDraft.deal_price || '0').replace(/\D/g, ''), 10) || 0
                                  const half = Math.round(dealNum * 0.5 / 1000) * 1000
                                  if (half > 0) setBookingDraft((d) => ({ ...d, payment_amount: formatPrice(half) }))
                                }}
                                className="text-[.62rem] font-semibold text-amber-700 hover:underline"
                              >
                                DP 50%
                              </button>
                              <span className="text-slate-300">·</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const dealNum = parseInt(String(bookingDraft.deal_price || '0').replace(/\D/g, ''), 10) || 0
                                  const third = Math.round(dealNum * 0.3 / 1000) * 1000
                                  if (third > 0) setBookingDraft((d) => ({ ...d, payment_amount: formatPrice(third) }))
                                }}
                                className="text-[.62rem] font-semibold text-amber-700 hover:underline"
                              >
                                DP 30%
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-2.5 text-[.78rem] font-bold text-muted">Rp</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            className={`${fieldClass} pl-9 font-bold`}
                            required
                            disabled={bookingDraft.payment_type === 'full'}
                            placeholder="500.000"
                            value={bookingDraft.payment_type === 'full' ? bookingDraft.deal_price : (bookingDraft.payment_amount || bookingDraft.deal_price)}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '')
                              setBookingDraft((d) => ({
                                ...d,
                                payment_amount: val ? parseInt(val, 10).toLocaleString('id-ID') : '',
                              }))
                            }}
                          />
                        </div>
                      </label>

                      <label className="grid gap-1">
                        <span className="text-[.72rem] font-bold text-ink">Catatan Pembayaran (Opsional)</span>
                        <input
                          type="text"
                          className={fieldClass}
                          placeholder={bookingDraft.payment_type === 'full' ? 'Contoh: Lunas 100% via transfer' : 'Contoh: DP 50%, sisa dilunasi saat serah terima'}
                          value={bookingDraft.payment_notes}
                          onChange={(e) => setBookingDraft((d) => ({ ...d, payment_notes: e.target.value }))}
                        />
                      </label>
                    </div>

                    {/* Banner Realtime Sisa Tagihan */}
                    {(() => {
                      const dealNum = parseInt(String(bookingDraft.deal_price || '0').replace(/\D/g, ''), 10) || 0
                      const payNum = bookingDraft.payment_type === 'full'
                        ? dealNum
                        : (parseInt(String(bookingDraft.payment_amount || '0').replace(/\D/g, ''), 10) || 0)
                      const sisaNum = Math.max(0, dealNum - payNum)

                      if (bookingDraft.payment_type === 'full') {
                        return (
                          <div className="rounded-lg bg-emerald-100/70 border border-emerald-300 p-2.5 text-[.72rem] flex items-center justify-between text-emerald-900">
                            <span>✅ <strong>Lunas Penuh (100%)</strong> · Tidak ada sisa tagihan.</span>
                            <strong>Rp {formatPrice(dealNum)}</strong>
                          </div>
                        )
                      }
                      return (
                        <div className="rounded-lg bg-amber-100/80 border border-amber-300 p-2.5 text-[.72rem] flex items-center justify-between text-amber-900">
                          <div>
                            <span>🟡 <strong>DP Diterima:</strong> Rp {formatPrice(payNum)}</span>
                            <span className="mx-1.5 text-amber-400">|</span>
                            <span><strong>Sisa Pelunasan:</strong></span>
                          </div>
                          <strong className="text-[.82rem] text-amber-800">
                            Rp {formatPrice(sisaNum)}
                          </strong>
                        </div>
                      )
                    })()}

                    {/* Upload Bukti Pembayaran */}
                    <div className="grid gap-1.5 border-t border-emerald-200/60 pt-2.5">
                      <span className="text-[.72rem] font-bold text-ink">Upload Bukti Transfer / Resi *</span>
                      {bookingDraft.payment_proof_file || bookingDraft.payment_proof_preview ? (
                        <div className="rounded-xl border border-emerald-200 bg-white p-2.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {bookingDraft.payment_proof_preview && !bookingDraft.payment_proof_preview.toLowerCase().endsWith('.pdf') ? (
                              <img
                                src={bookingDraft.payment_proof_preview}
                                alt="Bukti Transfer"
                                className="size-12 rounded-lg border border-line object-cover shrink-0 cursor-pointer"
                                onClick={() => setLightboxUrl(bookingDraft.payment_proof_preview)}
                                title="Klik untuk memperbesar"
                              />
                            ) : (
                              <div className="grid size-12 shrink-0 place-items-center rounded-lg border border-line bg-slate-ice text-red-500">
                                <FileText size={20} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="m-0 truncate text-[.74rem] font-bold text-ink">
                                {bookingDraft.payment_proof_file ? bookingDraft.payment_proof_file.name : 'Bukti Transfer'}
                              </p>
                              <p className="mb-0 mt-0.5 text-[.64rem] font-medium text-emerald-700">
                                {bookingDraft.payment_proof_file
                                  ? `${formatFileSize(bookingDraft.payment_proof_file.size)} · Siap diunggah`
                                  : 'Terpilih'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setBookingDraft((d) => ({ ...d, payment_proof_file: null, payment_proof_preview: null }))}
                            className="rounded-lg border border-line bg-white px-2.5 py-1 text-[.68rem] font-bold text-rose-600 hover:bg-rose-50"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-white p-3.5 text-center hover:bg-emerald-50/50 transition-colors">
                          <UploadCloud size={22} className="text-emerald-600 mb-1" />
                          <span className="text-[.74rem] font-bold text-ink">
                            Pilih Foto Bukti Transfer / Struk ATM
                          </span>
                          <span className="text-[.64rem] text-muted">
                            JPG, PNG, WEBP (Otomatis Dioptimasi) atau PDF (Maksimal 4.5 MB)
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
                              if (!allowed.includes(file.type)) {
                                setBookingFormError('Format file tidak didukung. Harap pilih gambar (JPG, PNG, WEBP) atau dokumen PDF.')
                                e.target.value = ''
                                return
                              }
                              const isPdf = file.type === 'application/pdf'
                              if (isPdf && file.size > 4.5 * 1024 * 1024) {
                                setBookingFormError(`Ukuran file PDF terlalu besar (${formatFileSize(file.size)}). Batas maksimal dokumen adalah 4.5 MB.`)
                                e.target.value = ''
                                return
                              }
                              if (file.size > 25 * 1024 * 1024) {
                                setBookingFormError(`Ukuran foto terlalu besar (${formatFileSize(file.size)}). Maksimal ukuran file adalah 25 MB sebelum kompresi.`)
                                e.target.value = ''
                                return
                              }
                              setBookingFormError('')
                              let processed = file
                              if (file.type.startsWith('image/') && file.size > 500 * 1024) {
                                try {
                                  processed = await compressImageFile(file, { maxWidthOrHeight: 1920, quality: 0.82 })
                                } catch (compErr) {
                                  console.warn('Auto kompresi gagal:', compErr)
                                }
                              }
                              if (processed.size > 4.5 * 1024 * 1024) {
                                setBookingFormError(`Ukuran file bukti pembayaran terlalu besar (${formatFileSize(processed.size)}). Batas maksimal server adalah 4.5 MB. Harap gunakan foto dengan resolusi lebih kecil.`)
                                e.target.value = ''
                                return
                              }
                              const preview = processed.type.startsWith('image/') ? URL.createObjectURL(processed) : null
                              setBookingDraft((d) => ({
                                ...d,
                                payment_proof_file: processed,
                                payment_proof_preview: preview,
                              }))
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer: Fixed bottom */}
            {(() => {
              const chosenV = vehicles.find((v) => String(v.id) === String(bookingDraft.vehicle_id))
              const chk = checkVehicleAvailableInWindow(chosenV, manualBookingWindow, bookings, bookingDraft.transmission_type, manualVehicleAvailability)
              const isVehicleBlocked = !chk.available

              return (
                <footer className="flex shrink-0 flex-col gap-2 border-t border-line bg-slate-ice/40 px-5 py-3.5">
                  {bookingFormError && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-[.72rem] text-red-700">
                      <AlertCircle size={14} className="shrink-0 text-red-600" />
                      <span className="flex-1 font-medium truncate">{bookingFormError}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="h-10 rounded-xl border border-line bg-white px-4 text-[.76rem] font-bold text-muted hover:bg-slate-ice"
                      type="button"
                      onClick={() => setBookingFormOpen(false)}
                    >
                      Batal
                    </button>
                    <button
                      className="h-10 rounded-xl bg-crimson px-5 text-[.76rem] font-bold text-white hover:bg-crimson-deep disabled:opacity-50 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
                      type="submit"
                      disabled={savingBooking || isVehicleBlocked}
                    >
                      {savingBooking ? (
                        <span className="flex items-center gap-2">
                          <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Menyimpan...
                        </span>
                      ) : isVehicleBlocked ? (
                        'Unit Tidak Tersedia'
                      ) : bookingDraft.status === 'confirmed' ? (
                        bookingDraft.payment_type === 'full' ? 'Simpan Booking (Lunas 100%)' : 'Simpan Booking (Sudah DP)'
                      ) : (
                        'Simpan Booking (Menunggu DP)'
                      )}
                    </button>
                  </div>
                </footer>
              )
            })()}
          </form>
        </div>
      )}

      {/* Modal Konfirmasi Pembayaran & Kunci Reservasi */}
      {paymentConfirmModalOpen && paymentConfirmBooking && (
        <div
          className="admin-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 backdrop-blur-[4px] sm:items-center sm:p-4 max-[520px]:items-center max-[520px]:p-3 animate-fadeIn"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !paymentConfirmSubmitting) {
              setPaymentConfirmModalOpen(false)
              setPaymentConfirmBooking(null)
            }
          }}
        >
          <form
            onSubmit={handleConfirmPaymentAndBooking}
            className="admin-modal-panel flex max-h-[92vh] w-full max-w-[560px] flex-col rounded-t-2xl bg-white shadow-2xl sm:max-h-[min(840px,92vh)] sm:rounded-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-confirm-title"
          >
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b border-line bg-white px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Receipt size={18} />
                </div>
                <div>
                  <h2 className="m-0 font-display text-[1.05rem] font-bold text-ink" id="payment-confirm-title">
                    Konfirmasi Pembayaran
                  </h2>
                  <p className="mb-0 mt-0.5 text-[.72rem] text-muted">
                    Wajib verifikasi metode, pengirim, dan bukti transfer sebelum booking dikonfirmasi.
                  </p>
                </div>
              </div>
              <button
                className="grid size-9 place-items-center rounded-xl text-muted hover:bg-slate-ice hover:text-ink disabled:opacity-50"
                type="button"
                disabled={paymentConfirmSubmitting}
                aria-label="Tutup form konfirmasi"
                onClick={() => {
                  setPaymentConfirmModalOpen(false)
                  setPaymentConfirmBooking(null)
                }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            {/* Error Notification if any */}
            {paymentConfirmError && (
              <div className="shrink-0 bg-red-50 border-b border-red-200 px-5 py-2.5 flex items-start gap-2.5 text-[.74rem] text-red-700 animate-fadeIn" role="alert">
                <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1 font-semibold">{paymentConfirmError}</div>
              </div>
            )}

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Ringkasan Booking */}
              <div className="rounded-xl border border-cyan/20 bg-cyan/5 p-3.5 text-[.76rem]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="block text-[.66rem] font-bold uppercase tracking-wider text-cyan">Data Pemesan</span>
                    <strong className="text-[.88rem] text-ink">{paymentConfirmBooking.customer_name}</strong>
                    <div className="mt-0.5 flex items-center gap-2 text-[.72rem] text-muted">
                      <span>{paymentConfirmBooking.customer_phone}</span>
                      {paymentConfirmBooking.booking_code && (
                        <span className="font-bold text-cyan">· {paymentConfirmBooking.booking_code}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[.66rem] font-bold uppercase tracking-wider text-muted">Total Sewa</span>
                    <strong className="text-[.92rem] font-black text-ink">
                      Rp {formatPrice(Number(paymentConfirmBooking.estimated_price) || 0)}
                    </strong>
                  </div>
                </div>

                <div className="mt-2.5 border-t border-cyan/15 pt-2 text-[.72rem] text-slate-600 flex items-center justify-between">
                  <span>
                    🚗 {(paymentConfirmBooking.vehicle_snapshot ?? []).map(formatBookedVehicle).join(' + ') || 'Unit Armada'}
                  </span>
                  <span>
                    ⏱️ {formatDuration(paymentConfirmBooking.duration, paymentConfirmBooking.duration_unit)}
                  </span>
                </div>
              </div>

              {/* Form Input Pembayaran */}
              <div className="space-y-3.5">
                {/* Pilihan Jenis Pembayaran: DP vs Lunas Penuh */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-line">
                  <button
                    type="button"
                    onClick={() => {
                      const full = Number(paymentConfirmBooking.estimated_price) || 0
                      const half = Math.round(full * 0.5 / 1000) * 1000 || 500000
                      setPaymentConfirmDraft((d) => ({
                        ...d,
                        pay_type: 'dp',
                        amount: formatPrice(half),
                      }))
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[.76rem] font-bold transition-all ${
                      paymentConfirmDraft.pay_type === 'dp'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    <span>🟡 DP (Uang Muka)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const full = Number(paymentConfirmBooking.estimated_price) || 0
                      setPaymentConfirmDraft((d) => ({
                        ...d,
                        pay_type: 'full',
                        amount: formatPrice(full),
                      }))
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[.76rem] font-bold transition-all ${
                      paymentConfirmDraft.pay_type === 'full'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    <span>✅ Lunas Penuh (100%)</span>
                  </button>
                </div>

                {/* 1. Metode Pembayaran */}
                <label className="grid gap-1">
                  <span className="text-[.74rem] font-bold text-ink flex items-center gap-1">
                    Metode Pembayaran <span className="text-red-500">*</span>
                  </span>
                  <select
                    className={fieldClass}
                    required
                    value={paymentConfirmDraft.method}
                    onChange={(e) => setPaymentConfirmDraft((d) => ({ ...d, method: e.target.value }))}
                  >
                    {paymentMethodOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <span className="text-[.63rem] text-muted">Pilih rekening tujuan transfer atau kas pembayaran.</span>
                </label>

                {/* 2. Nama Pemilik Rekening / Pengirim */}
                <label className="grid gap-1">
                  <span className="text-[.74rem] font-bold text-ink flex items-center gap-1">
                    Nama Pemilik Rekening / Pengirim <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    required
                    className={fieldClass}
                    placeholder="Contoh: Bpk Handoko Pratama"
                    value={paymentConfirmDraft.sender_name}
                    onChange={(e) => setPaymentConfirmDraft((d) => ({ ...d, sender_name: e.target.value }))}
                  />
                  <span className="text-[.63rem] text-muted">
                    Nama pemilik rekening yang mentransfer (sesuai struk / mutasi bank).
                  </span>
                </label>

                {/* 3. Nominal Pembayaran / DP */}
                <div className="grid gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[.74rem] font-bold text-ink flex items-center gap-1">
                      {paymentConfirmDraft.pay_type === 'full' ? 'Nominal Lunas 100% (Rp) *' : 'Nominal DP (Rp) *'}
                    </span>
                    {paymentConfirmDraft.pay_type === 'dp' && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const full = Number(paymentConfirmBooking.estimated_price) || 0
                            const half = Math.round(full * 0.5 / 1000) * 1000
                            if (half > 0) setPaymentConfirmDraft((d) => ({ ...d, amount: formatPrice(half) }))
                          }}
                          className="rounded px-1.5 py-0.5 text-[.64rem] font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100"
                        >
                          DP 50%
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const full = Number(paymentConfirmBooking.estimated_price) || 0
                            const third = Math.round(full * 0.3 / 1000) * 1000
                            if (third > 0) setPaymentConfirmDraft((d) => ({ ...d, amount: formatPrice(third) }))
                          }}
                          className="rounded px-1.5 py-0.5 text-[.64rem] font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100"
                        >
                          DP 30%
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentConfirmDraft((d) => ({ ...d, amount: '500.000' }))}
                          className="rounded px-1.5 py-0.5 text-[.64rem] font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100"
                        >
                          Rp 500rb
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-2.5 text-[.78rem] font-bold text-muted">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      disabled={paymentConfirmDraft.pay_type === 'full'}
                      className={`${fieldClass} pl-9 font-bold`}
                      placeholder="Contoh: 500.000"
                      value={paymentConfirmDraft.pay_type === 'full' ? formatPrice(Number(paymentConfirmBooking.estimated_price) || 0) : paymentConfirmDraft.amount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '')
                        setPaymentConfirmDraft((d) => ({
                          ...d,
                          amount: val ? parseInt(val, 10).toLocaleString('id-ID') : '',
                        }))
                      }}
                    />
                  </div>
                </div>

                {/* Real-time Calculation Summary Banner */}
                {(() => {
                  const est = Number(paymentConfirmBooking.estimated_price) || 0
                  const dpNum = paymentConfirmDraft.pay_type === 'full'
                    ? est
                    : (parseInt(String(paymentConfirmDraft.amount || '0').replace(/\D/g, ''), 10) || 0)
                  const sisa = Math.max(0, est - dpNum)

                  if (paymentConfirmDraft.pay_type === 'full') {
                    return (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-[.74rem] flex items-center justify-between text-emerald-900">
                        <div>
                          <span className="block font-bold">Pembayaran Lunas Penuh (100%)</span>
                          <span className="text-[.68rem] text-emerald-700">Total sewa dibayar lunas sekaligus. Sisa tagihan Rp 0.</span>
                        </div>
                        <strong className="text-[.92rem] font-black text-emerald-800">
                          Rp {formatPrice(est)}
                        </strong>
                      </div>
                    )
                  }
                  return (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[.74rem] space-y-1.5">
                      <div className="flex items-center justify-between text-muted text-[.7rem]">
                        <span>Total Tagihan Sewa:</span>
                        <span className="font-semibold text-ink">Rp {formatPrice(est)}</span>
                      </div>
                      <div className="flex items-center justify-between text-amber-900 font-medium">
                        <span>Nominal DP Diterima:</span>
                        <span className="font-bold">Rp {formatPrice(dpNum)}</span>
                      </div>
                      <div className="border-t border-amber-200/80 pt-1.5 flex items-center justify-between font-bold text-amber-900">
                        <span className="flex items-center gap-1">
                          <span>⏳ Sisa yang Harus Dilunasi Nanti:</span>
                        </span>
                        <strong className="text-[.88rem] font-black text-amber-800">
                          Rp {formatPrice(sisa)}
                        </strong>
                      </div>
                      <p className="m-0 text-[.64rem] text-amber-800/80 pt-0.5">
                        * Sisa tagihan dapat dicatat saat pelunasan di pool atau transfer sebelum unit jalan.
                      </p>
                    </div>
                  )
                })()}

                {/* 4. Upload Bukti Pembayaran / Struk Transfer */}
                <div className="grid gap-1.5">
                  <span className="text-[.74rem] font-bold text-ink flex items-center gap-1">
                    Upload Bukti {paymentConfirmDraft.pay_type === 'full' ? 'Lunas' : 'DP'} / Resi Transfer <span className="text-red-500">*</span>
                  </span>

                  {/* Jika sudah ada file dipilih atau preview */}
                  {(paymentConfirmDraft.file || paymentConfirmDraft.file_preview) ? (
                    <div className="rounded-xl border border-line bg-slate-ice/40 p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {paymentConfirmDraft.file_preview && !paymentConfirmDraft.file_preview.toLowerCase().endsWith('.pdf') ? (
                          <img
                            src={paymentConfirmDraft.file_preview}
                            alt="Bukti Transfer"
                            className="size-14 rounded-lg border border-line object-cover shrink-0 cursor-pointer"
                            onClick={() => setLightboxUrl(paymentConfirmDraft.file_preview)}
                            title="Klik untuk memperbesar"
                          />
                        ) : (
                          <div className="grid size-14 shrink-0 place-items-center rounded-lg border border-line bg-white text-red-500">
                            <FileText size={24} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="m-0 truncate text-[.76rem] font-bold text-ink">
                            {paymentConfirmDraft.file ? paymentConfirmDraft.file.name : 'Bukti Transfer Tersimpan'}
                          </p>
                          <p className="mb-0 mt-0.5 text-[.66rem] font-medium text-emerald-700">
                            {paymentConfirmDraft.file
                              ? `${formatFileSize(paymentConfirmDraft.file.size)} · Siap diunggah`
                              : 'Format file valid'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentConfirmDraft((d) => ({ ...d, file: null, file_preview: null }))
                        }}
                        className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[.7rem] font-bold text-rose-600 hover:bg-rose-50"
                      >
                        Ganti / Hapus
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-slate-ice/30 p-5 text-center transition-colors hover:border-cyan hover:bg-cyan/5">
                      <UploadCloud size={28} className="text-cyan mb-1.5" />
                      <span className="text-[.76rem] font-bold text-ink">
                        Klik atau Tarik Foto Bukti Transfer ke Sini
                      </span>
                      <span className="mt-0.5 text-[.66rem] text-muted">
                        Format: JPG, PNG, WEBP (Otomatis Dioptimasi), atau PDF (Maksimal 4.5 MB)
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
                          if (!allowed.includes(file.type)) {
                            setPaymentConfirmError('Format file tidak didukung. Harap pilih gambar (JPG, PNG, WEBP) atau dokumen PDF.')
                            e.target.value = ''
                            return
                          }
                          const isPdf = file.type === 'application/pdf'
                          if (isPdf && file.size > 4.5 * 1024 * 1024) {
                            setPaymentConfirmError(`Ukuran file PDF terlalu besar (${formatFileSize(file.size)}). Batas maksimal dokumen adalah 4.5 MB.`)
                            e.target.value = ''
                            return
                          }
                          if (file.size > 25 * 1024 * 1024) {
                            setPaymentConfirmError(`Ukuran foto terlalu besar (${formatFileSize(file.size)}). Maksimal ukuran file adalah 25 MB sebelum kompresi.`)
                            e.target.value = ''
                            return
                          }
                          setPaymentConfirmError('')
                          let processed = file
                          if (file.type.startsWith('image/') && file.size > 500 * 1024) {
                            try {
                              processed = await compressImageFile(file, { maxWidthOrHeight: 1920, quality: 0.82 })
                            } catch (compErr) {
                              console.warn('Auto kompresi gagal:', compErr)
                            }
                          }
                          if (processed.size > 4.5 * 1024 * 1024) {
                            setPaymentConfirmError(`Ukuran file bukti transfer terlalu besar (${formatFileSize(processed.size)}). Batas maksimal server adalah 4.5 MB. Harap gunakan foto dengan resolusi lebih kecil.`)
                            e.target.value = ''
                            return
                          }
                          const preview = processed.type.startsWith('image/') ? URL.createObjectURL(processed) : null
                          setPaymentConfirmDraft((d) => ({
                            ...d,
                            file: processed,
                            file_preview: preview,
                          }))
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* 5. Catatan Tambahan (Opsional) */}
                <label className="grid gap-1">
                  <span className="text-[.74rem] font-bold text-ink">Catatan Pembayaran (Opsional)</span>
                  <input
                    type="text"
                    className={fieldClass}
                    placeholder="Contoh: DP 50%, sisa dilunasi saat serah terima unit di pool"
                    value={paymentConfirmDraft.notes}
                    onChange={(e) => setPaymentConfirmDraft((d) => ({ ...d, notes: e.target.value }))}
                  />
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-slate-ice/40 px-5 py-3.5">
              <button
                className="h-10 rounded-xl border border-line bg-white px-4 text-[.76rem] font-bold text-muted hover:bg-slate-ice disabled:opacity-50"
                type="button"
                disabled={paymentConfirmSubmitting}
                onClick={() => {
                  setPaymentConfirmModalOpen(false)
                  setPaymentConfirmBooking(null)
                }}
              >
                Batal
              </button>
              <button
                className="h-10 rounded-xl bg-crimson px-5 text-[.76rem] font-bold text-white hover:bg-crimson-deep disabled:opacity-60 transition-colors shadow-sm"
                type="submit"
                disabled={paymentConfirmSubmitting}
              >
                {paymentConfirmSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Menyimpan & Mengonfirmasi...
                  </span>
                ) : (
                  'Konfirmasi & Kunci Pesanan'
                )}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Modal Input Bukti Pelunasan */}
      {settlementModalOpen && settlementBooking && (
        <div
          className="admin-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 backdrop-blur-[4px] sm:items-center sm:p-4 max-[520px]:items-center max-[520px]:p-3 animate-fadeIn"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !settlementSubmitting) {
              setSettlementModalOpen(false)
              setSettlementBooking(null)
            }
          }}
        >
          <form
            onSubmit={handleSaveSettlement}
            className="admin-modal-panel flex max-h-[92vh] w-full max-w-[540px] flex-col rounded-t-2xl bg-white shadow-2xl sm:max-h-[min(820px,92vh)] sm:rounded-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settlement-modal-title"
          >
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b border-line bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <Receipt size={18} />
                </div>
                <div>
                  <h2 className="m-0 font-display text-[1.05rem] font-bold text-ink" id="settlement-modal-title">
                    Input Bukti Pelunasan
                  </h2>
                  <p className="mb-0 mt-0.5 text-[.72rem] text-muted">
                    Selesaikan sisa kewajiban pembayaran booking ini menjadi Lunas (100%).
                  </p>
                </div>
              </div>
              <button
                className="grid size-9 place-items-center rounded-xl text-muted hover:bg-slate-ice hover:text-ink disabled:opacity-50"
                type="button"
                disabled={settlementSubmitting}
                aria-label="Tutup form pelunasan"
                onClick={() => {
                  setSettlementModalOpen(false)
                  setSettlementBooking(null)
                }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            {/* Error Notification */}
            {settlementError && (
              <div className="shrink-0 bg-red-50 border-b border-red-200 px-5 py-2.5 flex items-start gap-2.5 text-[.74rem] text-red-700 animate-fadeIn" role="alert">
                <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1 font-semibold">{settlementError}</div>
              </div>
            )}

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Ringkasan Keuangan Booking */}
              {(() => {
                const pInfo = getBookingPaymentInfo(settlementBooking)
                const total = Number(settlementBooking.estimated_price) || 0
                const dp = pInfo?.dp_amount || pInfo?.amount || 0
                const sisa = pInfo?.remaining_amount || Math.max(0, total - dp)
                return (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-[.76rem] space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="block text-[.66rem] font-bold uppercase tracking-wider text-emerald-800">
                          Data Pemesan
                        </span>
                        <strong className="text-[.88rem] text-ink">{settlementBooking.customer_name}</strong>
                        <div className="text-[.72rem] text-muted">{settlementBooking.customer_phone}</div>
                      </div>
                      <div className="text-right">
                        <span className="block text-[.66rem] font-bold uppercase tracking-wider text-muted">
                          Total Sewa
                        </span>
                        <strong className="text-[.92rem] font-black text-ink">
                          Rp {formatPrice(total)}
                        </strong>
                      </div>
                    </div>

                    <div className="border-t border-emerald-200/80 pt-2 grid grid-cols-2 gap-2 text-[.74rem]">
                      <div>
                        <span className="text-muted block text-[.66rem]">DP Telah Masuk:</span>
                        <strong className="text-ink">Rp {formatPrice(dp)}</strong>
                        <div className="text-[.64rem] text-muted truncate">via {pInfo?.dp_method || pInfo?.method}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-800 font-bold block text-[.66rem]">Kewajiban Pelunasan:</span>
                        <strong className="text-[.94rem] font-black text-emerald-700">Rp {formatPrice(sisa)}</strong>
                      </div>
                    </div>
                  </div>
                )
              })()}

              <div className="space-y-3.5">
                {/* Metode Pelunasan */}
                <label className="grid gap-1">
                  <span className="text-[.74rem] font-bold text-ink flex items-center gap-1">
                    Metode Pelunasan <span className="text-red-500">*</span>
                  </span>
                  <select
                    className={fieldClass}
                    required
                    value={settlementDraft.method}
                    onChange={(e) => setSettlementDraft((d) => ({ ...d, method: e.target.value }))}
                  >
                    {paymentMethodOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <span className="text-[.63rem] text-muted">Pilih transfer bank atau Tunai / Cash di Pool jika dibayar langsung saat ambil mobil.</span>
                </label>

                {/* Nama Pembayar / Pemilik Rekening */}
                <label className="grid gap-1">
                  <span className="text-[.74rem] font-bold text-ink flex items-center gap-1">
                    Nama Pemilik Rekening / Pembayar <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    required
                    className={fieldClass}
                    placeholder="Contoh: Bpk Handoko"
                    value={settlementDraft.sender_name}
                    onChange={(e) => setSettlementDraft((d) => ({ ...d, sender_name: e.target.value }))}
                  />
                  <span className="text-[.63rem] text-muted">Nama yang tertera pada mutasi bank atau nama pihak yang melunasi.</span>
                </label>

                {/* Nominal Pelunasan */}
                <div className="grid gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[.74rem] font-bold text-ink flex items-center gap-1">
                      Nominal Pelunasan (Rp) <span className="text-red-500">*</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const pInfo = getBookingPaymentInfo(settlementBooking)
                        const total = Number(settlementBooking.estimated_price) || 0
                        const dp = pInfo?.dp_amount || pInfo?.amount || 0
                        const sisa = pInfo?.remaining_amount || Math.max(0, total - dp)
                        setSettlementDraft((d) => ({ ...d, amount: formatPrice(sisa) }))
                      }}
                      className="text-[.64rem] font-semibold text-emerald-700 hover:underline"
                    >
                      Sesuai Sisa Tagihan
                    </button>
                  </div>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-2.5 text-[.78rem] font-bold text-muted">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      className={`${fieldClass} pl-9 font-bold`}
                      placeholder="Contoh: 1.300.000"
                      value={settlementDraft.amount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '')
                        setSettlementDraft((d) => ({
                          ...d,
                          amount: val ? parseInt(val, 10).toLocaleString('id-ID') : '',
                        }))
                      }}
                    />
                  </div>
                </div>

                {/* Upload Bukti Pelunasan */}
                <div className="grid gap-1.5">
                  <span className="text-[.74rem] font-bold text-ink flex items-center gap-1">
                    Upload Bukti Pelunasan / Resi Struk <span className="text-red-500">*</span>
                  </span>

                  {(settlementDraft.file || settlementDraft.file_preview) ? (
                    <div className="rounded-xl border border-line bg-slate-ice/40 p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {settlementDraft.file_preview && !settlementDraft.file_preview.toLowerCase().endsWith('.pdf') ? (
                          <img
                            src={settlementDraft.file_preview}
                            alt="Bukti Pelunasan"
                            className="size-14 rounded-lg border border-line object-cover shrink-0 cursor-pointer"
                            onClick={() => setLightboxUrl(settlementDraft.file_preview)}
                            title="Klik untuk memperbesar"
                          />
                        ) : (
                          <div className="grid size-14 shrink-0 place-items-center rounded-lg border border-line bg-white text-emerald-600">
                            <FileText size={24} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="m-0 truncate text-[.76rem] font-bold text-ink">
                            {settlementDraft.file ? settlementDraft.file.name : 'Bukti Pelunasan'}
                          </p>
                          <p className="mb-0 mt-0.5 text-[.66rem] font-medium text-emerald-700">
                            {settlementDraft.file
                              ? `${formatFileSize(settlementDraft.file.size)} · Siap diunggah`
                              : 'Format valid'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettlementDraft((d) => ({ ...d, file: null, file_preview: null }))}
                        className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[.7rem] font-bold text-rose-600 hover:bg-rose-50"
                      >
                        Ganti / Hapus
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/30 p-5 text-center transition-colors hover:border-emerald-500 hover:bg-emerald-50/60">
                      <UploadCloud size={28} className="text-emerald-600 mb-1.5" />
                      <span className="text-[.76rem] font-bold text-ink">
                        Klik atau Tarik Foto Bukti Pelunasan ke Sini
                      </span>
                      <span className="mt-0.5 text-[.66rem] text-muted">
                        Format: JPG, PNG, WEBP (Otomatis Dioptimasi) atau PDF (Maksimal 4.5 MB)
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
                          if (!allowed.includes(file.type)) {
                            setSettlementError('Format file tidak didukung. Harap pilih gambar (JPG, PNG, WEBP) atau dokumen PDF.')
                            e.target.value = ''
                            return
                          }
                          const isPdf = file.type === 'application/pdf'
                          if (isPdf && file.size > 4.5 * 1024 * 1024) {
                            setSettlementError(`Ukuran file PDF terlalu besar (${formatFileSize(file.size)}). Batas maksimal dokumen adalah 4.5 MB.`)
                            e.target.value = ''
                            return
                          }
                          if (file.size > 25 * 1024 * 1024) {
                            setSettlementError(`Ukuran file terlalu besar (${formatFileSize(file.size)}). Maksimal ukuran file adalah 25 MB sebelum kompresi.`)
                            e.target.value = ''
                            return
                          }
                          setSettlementError('')
                          let processed = file
                          if (file.type.startsWith('image/') && file.size > 500 * 1024) {
                            try {
                              processed = await compressImageFile(file, { maxWidthOrHeight: 1920, quality: 0.82 })
                            } catch (compErr) {
                              console.warn('Auto kompresi gagal:', compErr)
                            }
                          }
                          if (processed.size > 4.5 * 1024 * 1024) {
                            setSettlementError(`Ukuran file bukti pelunasan terlalu besar (${formatFileSize(processed.size)}). Batas maksimal server adalah 4.5 MB. Harap gunakan foto dengan resolusi lebih kecil.`)
                            e.target.value = ''
                            return
                          }
                          const preview = processed.type.startsWith('image/') ? URL.createObjectURL(processed) : null
                          setSettlementDraft((d) => ({
                            ...d,
                            file: processed,
                            file_preview: preview,
                          }))
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Catatan Pelunasan */}
                <label className="grid gap-1">
                  <span className="text-[.74rem] font-bold text-ink">Catatan Pelunasan (Opsional)</span>
                  <input
                    type="text"
                    className={fieldClass}
                    placeholder="Contoh: Dilunasi tunai saat penyerahan kunci armada di pool"
                    value={settlementDraft.notes}
                    onChange={(e) => setSettlementDraft((d) => ({ ...d, notes: e.target.value }))}
                  />
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-slate-ice/40 px-5 py-3.5">
              <button
                className="h-10 rounded-xl border border-line bg-white px-4 text-[.76rem] font-bold text-muted hover:bg-slate-ice disabled:opacity-50"
                type="button"
                disabled={settlementSubmitting}
                onClick={() => {
                  setSettlementModalOpen(false)
                  setSettlementBooking(null)
                }}
              >
                Batal
              </button>
              <button
                className="h-10 rounded-xl bg-emerald-600 px-5 text-[.76rem] font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
                type="submit"
                disabled={settlementSubmitting}
              >
                {settlementSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Menyimpan Pelunasan...
                  </span>
                ) : (
                  'Simpan Pelunasan & Tandai Lunas'
                )}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Lightbox / Zoom Bukti Transfer */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-h-[92vh] max-w-[90vw] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-line bg-slate-ice/50 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-cyan" />
                <span className="text-[.82rem] font-bold text-ink">Bukti Pembayaran / Struk Transfer</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-[.72rem] font-semibold text-cyan hover:bg-slate-ice"
                >
                  <ExternalLink size={13} /> Buka Tab Baru
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxUrl(null)}
                  className="grid size-7 place-items-center rounded-lg text-muted hover:bg-slate-ice hover:text-ink cursor-pointer"
                  aria-label="Tutup preview bukti"
                >
                  <X size={16} />
                </button>
              </div>
            </header>
            <div className="overflow-auto p-3 bg-slate-900/5 max-h-[82vh] flex items-center justify-center">
              <img
                src={lightboxUrl}
                alt="Bukti Transfer"
                className="max-h-[76vh] max-w-full rounded-lg object-contain shadow"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
