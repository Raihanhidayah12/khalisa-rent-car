import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Eye, EyeOff, Fuel, LockKeyhole, Mail, Minus, Plus, Search, Settings2, UserRoundCheck, UsersRound, X } from 'lucide-react'
import logo from './assets/Logo-cropped.png'
import waLogo from './assets/Wa.png'
import heroBackground from './assets/Latar.png'
import landingBackground from './assets/kami.jpg'
import AdminDashboard from './AdminDashboard'
import BookingTracker from './BookingTracker'
import LegalPage from './LegalPage'
import { supabase } from './supabaseClient'
import { formatPrice, isVehicleReady, parsePrice } from './vehicleUtils'
import { formatJakartaDateTime, generateBookingCode, toJakartaISOString } from './bookingUtils'

function getVehiclesByCategory(vehicles, category) {
  return category === 'Semua armada'
    ? vehicles
    : vehicles.filter((vehicle) => vehicle.category === category)
}
function getTransmissionLabel(transmissionType) {
  if (transmissionType === 'automatic') return 'Matic'
  if (transmissionType === 'manual') return 'Manual'
  return ''
}

function getPowertrainLabel(powertrainType) {
  return { gasoline: 'Bensin', hybrid: 'Hybrid', ev_phev: 'EV / PHEV' }[powertrainType] ?? ''
}

function getVehicleVariantLabel(vehicle, transmissionType) {
  return [getTransmissionLabel(transmissionType), getPowertrainLabel(vehicle.powertrain_type)].filter(Boolean).join(' · ') || 'Unit'
}

function getAllocatedTransmissionOptions(vehicle) {
  return (vehicle.transmission_options ?? []).filter((type) => Number(vehicle.transmission_stock?.[type]) > 0)
}

function getVehicleModelKey(vehicle) {
  return String(vehicle.name ?? '').trim().toLowerCase()
}

function groupVehiclesByName(vehicles) {
  const groups = new Map()
  for (const vehicle of vehicles) {
    const key = getVehicleModelKey(vehicle)
    const group = groups.get(key) ?? { key, name: vehicle.name, variants: [] }
    group.variants.push(vehicle)
    groups.set(key, group)
  }
  return [...groups.values()]
}

function getVehicleTransmissionStock(vehicle, transmissionType) {
  if (!transmissionType) return Math.max(0, Number(vehicle.stock) || 0)
  return Math.max(0, Number(vehicle.transmission_stock?.[transmissionType]) || 0)
}

function getWindowRemaining(availability, vehicle, transmissionType) {
  if (!availability) return null
  const entry = availability[vehicle.id]
  if (!entry) return 0
  const totalRemaining = Math.max(0, (Number(entry.stock) || 0) - (Number(entry.booked) || 0))
  const assignedStock = Object.values(vehicle.transmission_stock ?? {}).reduce((total, count) => total + (Number(count) || 0), 0)
  const totalBooked = Number(entry.booked) || 0
  const typedBooked = Object.values(entry.transmission_availability ?? {}).reduce((total, typeAvailability) => total + (Number(typeAvailability.booked) || 0), 0)
  const inconsistentTypedBookings = typedBooked > totalBooked
  if (transmissionType) {
    const typedAvailability = entry.transmission_availability?.[transmissionType]
    const typedRemaining = typedAvailability?.remaining
    const typedBooked = Number(typedAvailability?.booked) || 0
    const contradictoryNoBooking = totalBooked === 0 && typedBooked > 0
    if (inconsistentTypedBookings) {
      const typeStock = Number(vehicle.transmission_stock?.[transmissionType]) || 0
      return Math.min(typeStock, totalRemaining)
    }
    if (Number(vehicle.transmission_stock?.[transmissionType]) > 0 && typedRemaining !== undefined && typedRemaining !== null && !contradictoryNoBooking) {
      return Math.max(0, Number(typedRemaining) || 0)
    }

    return 0
  }
  if ((vehicle.transmission_options ?? []).length === 0) {
    return totalRemaining
  }
  if (inconsistentTypedBookings) return totalRemaining
  if (assignedStock < (Number(entry.stock) || 0)) return totalRemaining
  return (vehicle.transmission_options ?? []).reduce((total, type) => total + getWindowRemaining(availability, vehicle, type), 0)
}

function getBookableVehicleVariants(vehicle, availability) {
  const allocatedOptions = getAllocatedTransmissionOptions(vehicle)
  if (allocatedOptions.length > 0) {
    return allocatedOptions.map((transmissionType) => ({
      vehicle,
      transmissionType,
      available: availability ? getWindowRemaining(availability, vehicle, transmissionType) ?? 0 : getVehicleTransmissionStock(vehicle, transmissionType),
    })).filter((variant) => variant.available > 0)
  }

  if ((vehicle.transmission_options ?? []).length === 0) {
    const available = availability ? getWindowRemaining(availability, vehicle) ?? 0 : getVehicleTransmissionStock(vehicle)
    return available > 0 ? [{ vehicle, transmissionType: null, available }] : []
  }

  return []
}

function getUnallocatedVehicleUnits(vehicle, availability) {
  const available = availability ? getWindowRemaining(availability, vehicle) ?? 0 : getVehicleTransmissionStock(vehicle)
  const allocated = getAllocatedTransmissionOptions(vehicle).reduce((total, transmissionType) => total + (
    availability ? getWindowRemaining(availability, vehicle, transmissionType) ?? 0 : getVehicleTransmissionStock(vehicle, transmissionType)
  ), 0)
  return Math.max(0, available - allocated)
}

function isVehicleReadyForWindow(vehicle, availability) {
  if (!availability || ['maintenance', 'perawatan'].includes(String(vehicle.status ?? '').trim().toLowerCase())) return false
  const remaining = getWindowRemaining(availability, vehicle)
  return remaining > 0
}

function countWindowReadyUnits(vehicles, availability, vehicleName) {
  return vehicles
    .filter((vehicle) => vehicle.name === vehicleName && isVehicleReadyForWindow(vehicle, availability))
    .reduce((total, vehicle) => total + (getWindowRemaining(availability, vehicle) ?? 0), 0)
}

async function fetchActiveVehicles() {
  await supabase.rpc('expire_pending_booking_holds')
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data.map((vehicle) => ({ ...vehicle, image: vehicle.image_url ?? null }))
}

const durasiLabel = {
  1: '12 jam',
  2: '24 jam',
  14: '7 hari',
  60: '30 hari',
}

function hitungMultiplier(mode, durasi) {
  // Base price = per 12 jam
  const d = Math.max(mode.min, durasi)
  switch (mode.unit) {
    case 'jam':   return d / 12           // 12 jam = ×1, 24 jam = ×2, dst
    case 'hari':  return d * 2            // 1 hari (24 jam) = ×2
    case 'bulan': return d * 30 * 2      // 1 bulan = 30 hari = ×60
    default:      return 1
  }
}

function getEndDateTime(date, time, mode, durasi) {
  const hoursPerUnit = mode.unit === 'jam' ? 1 : mode.unit === 'hari' ? 24 : 30 * 24
  const start = new Date(toJakartaISOString(date, time))
  const end = new Date(start.getTime() + durasi * hoursPerUnit * 60 * 60 * 1000)

  return {
    date: formatJakartaDateTime(end, { day: 'numeric', month: 'long', year: 'numeric' }),
    time: formatJakartaDateTime(end, { hour: '2-digit', minute: '2-digit', hour12: false }),
    timestamp: end.toISOString(),
  }
}

const bookingModes = [
  { label: 'Sewa mobil + Supir', unit: 'jam',   min: 12, step: 12 },
  { label: 'Sewa mobil harian',  unit: 'jam',   min: 12, step: 12 },
  { label: 'Sewa mobil mingguan', unit: 'hari', min: 1,  step: 1  },
  { label: 'Sewa mobil bulanan', unit: 'bulan', min: 1,  step: 1  },
]
const navigationLinks = [
  { label: 'Beranda', href: '#beranda' },
  { label: 'Armada', href: '#armada' },
  { label: 'Tentang kami', href: '#tentang' },
  { label: 'Layanan', href: '#layanan' },
]

const benefits = [
  { number: '01', title: 'Harga jelas', description: 'Biaya sewa diinformasikan di awal, tanpa kejutan saat perjalanan.' },
  { number: '02', title: 'Armada terawat', description: 'Kendaraan bersih dan dicek sebelum berangkat.' },
  { number: '03', title: 'Dengan atau tanpa driver', description: 'Fleksibel sesuai kebutuhan — bawa pengemudi atau kemudi sendiri.' },
  { number: '04', title: 'Respons cepat', description: 'Tim PT Khalisa Sumber Rezeki siap membantu proses pemesanan dan perjalanan.' },
]

const scrollRevealClasses = 'translate-y-10 opacity-0 scale-[0.98] transition-[opacity,transform] duration-[900ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] data-[reveal=visible]:translate-y-0 data-[reveal=visible]:opacity-100 data-[reveal=visible]:scale-100 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:scale-100 motion-reduce:transition-none'
const geoapifyApiKey = import.meta.env.VITE_GEOAPIFY_API_KEY

function usePopoverDismiss(ref, onDismiss) {
  useEffect(() => {
    const dismissOutside = (event) => {
      if (!ref.current?.contains(event.target)) onDismiss()
    }
    const dismissOnEscape = (event) => {
      if (event.key === 'Escape') onDismiss()
    }

    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('keydown', dismissOnEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('keydown', dismissOnEscape)
    }
  }, [onDismiss, ref])
}

function useAnimatedPopover() {
  const [open, setOpenState] = useState(false)
  const [mounted, setMounted] = useState(false)
  const closeTimer = useRef(null)
  const openFrame = useRef(null)

  const setOpen = (nextValue) => {
    const nextOpen = typeof nextValue === 'function' ? nextValue(open) : nextValue
    window.clearTimeout(closeTimer.current)
    if (openFrame.current) window.cancelAnimationFrame(openFrame.current)

    if (nextOpen) {
      setMounted(true)
      openFrame.current = window.requestAnimationFrame(() => {
        setOpenState(true)
        openFrame.current = null
      })
    } else {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      setOpenState(false)
    }
  }

  useEffect(() => {
    if (!open && mounted) {
      closeTimer.current = window.setTimeout(() => setMounted(false), 320)
    }
    return () => window.clearTimeout(closeTimer.current)
  }, [open, mounted])

  useEffect(() => () => {
    window.clearTimeout(closeTimer.current)
    if (openFrame.current) window.cancelAnimationFrame(openFrame.current)
  }, [])

  return [open, setOpen, mounted]
}

function DatePicker({ onDateChange }) {
  const [open, setOpen, mounted] = useAnimatedPopover()
  const [value, setValue] = useState('')
  const [month, setMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const pickerRef = useRef(null)
  const dismiss = () => setOpen(false)
  usePopoverDismiss(pickerRef, dismiss)

  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstWeekday = new Date(year, monthIndex, 1).getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const selectedDay = value ? Number(value.slice(-2)) : null
  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth()
  const todayDate = today.getDate()

  // Bulan sebelumnya tidak bisa diklik
  const isPastMonth = year < todayYear || (year === todayYear && monthIndex < todayMonth)
  const isCurrentMonth = year === todayYear && monthIndex === todayMonth

  const formattedValue = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Pilih tanggal'

  return (
    <div className="relative" ref={pickerRef}>
      <input name="start" type="hidden" value={value} />
      <button className="flex w-full items-center justify-between gap-2 border-0 bg-transparent p-0 text-left text-[.79rem] text-muted outline-none max-[600px]:text-[.7rem]" type="button" aria-label="Pilih tanggal mulai" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span className={value ? '' : 'text-[#94a3b8]'}>{formattedValue}</span><CalendarDays className="shrink-0 text-[#64748b]" size={15} aria-hidden="true" />
      </button>
      {mounted && <div className="picker-popover absolute left-1/2 top-[calc(100%+14px)] z-40 w-[min(310px,calc(100vw-24px))] rounded-2xl border border-line bg-white p-3 text-ink shadow-[0_18px_50px_rgba(15,23,42,.18)]" data-open={open} inert={!open} role="dialog" aria-label="Pilih tanggal mulai">
        <div className="mb-3 flex items-center justify-between">
          <button
            className={`grid size-9 place-items-center rounded-lg border border-line bg-white transition ${isPastMonth ? 'cursor-not-allowed opacity-30' : 'text-muted hover:bg-slate-ice'}`}
            type="button"
            aria-label="Bulan sebelumnya"
            disabled={isPastMonth}
            onClick={() => !isPastMonth && setMonth(new Date(year, monthIndex - 1, 1))}
          ><ChevronLeft size={17} /></button>
          <strong className="font-display text-[.92rem] font-bold">{month.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</strong>
          <button className="grid size-9 place-items-center rounded-lg border border-line bg-white text-muted transition hover:bg-slate-ice" type="button" aria-label="Bulan berikutnya" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ChevronRight size={17} /></button>
        </div>
        <div className="grid grid-cols-7 text-center text-[.7rem] font-semibold text-[#64748b]">{['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => <span className="py-2" key={day}>{day}</span>)}</div>
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1
            const dayValue = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isSelected = selectedDay === day && value.startsWith(`${year}-${String(monthIndex + 1).padStart(2, '0')}`)
            const isToday = isCurrentMonth && day === todayDate
            const isPast = isPastMonth || (isCurrentMonth && day < todayDate)
            return (
              <button
                className={`mx-auto grid size-9 place-items-center rounded-lg text-[.78rem] transition
                  ${isPast ? 'cursor-not-allowed text-[#cbd5e1] line-through' : ''}
                  ${!isPast && isSelected ? 'bg-crimson font-bold text-white hover:bg-crimson-deep' : ''}
                  ${!isPast && isToday && !isSelected ? 'font-bold text-crimson ring-1 ring-crimson/30' : ''}
                  ${!isPast && !isSelected ? 'hover:bg-crimson/10 hover:text-crimson' : ''}
                  ${!isPast ? 'text-ink' : ''}
                `}
                type="button"
                key={dayValue}
                disabled={isPast}
                aria-pressed={isSelected}
                onClick={() => { if (!isPast) { setValue(dayValue); onDateChange?.(dayValue); setOpen(false) } }}
              >{day}</button>
            )
          })}
        </div>
        <div className="mt-3 flex justify-end border-t border-line pt-3"><button className="text-[.76rem] font-semibold text-crimson hover:text-crimson-deep" type="button" onClick={() => { setValue(''); onDateChange?.(''); setOpen(false) }}>Hapus tanggal</button></div>
      </div>}
    </div>
  )
}

function TimePicker({ selectedDate, value, onTimeChange }) {
  const [open, setOpen, mounted] = useAnimatedPopover()
  const [draftValue, setDraftValue] = useState('09:00')
  const setValue = (next) => { setDraftValue(next); onTimeChange?.(next) }
  const pickerRef = useRef(null)
  const dismiss = () => setOpen(false)
  usePopoverDismiss(pickerRef, dismiss)
  const [hour, minute] = (value || draftValue).split(':')

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const isToday = selectedDate === todayStr
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  function isHourDisabled(h) {
    if (!isToday) return false
    return parseInt(h) < currentHour
  }

  function isMinuteDisabled(h, m) {
    if (!isToday) return false
    const hNum = parseInt(h)
    const mNum = parseInt(m)
    if (hNum < currentHour) return true
    if (hNum === currentHour && mNum <= currentMinute) return true
    return false
  }

  return (
    <div className="relative" ref={pickerRef}>
      <input name="time" type="hidden" value={value} />
      <button className="flex w-full items-center justify-between gap-2 border-0 bg-transparent p-0 text-left text-[.79rem] text-muted outline-none disabled:cursor-not-allowed disabled:text-[#94a3b8] max-[600px]:text-[.7rem]" type="button" disabled={!selectedDate} aria-label="Pilih waktu" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span>{value || (selectedDate ? 'Pilih waktu' : 'Pilih tanggal dulu')}</span><Clock3 className="shrink-0 text-[#64748b]" size={15} aria-hidden="true" />
      </button>
      {mounted && <div className="picker-popover absolute left-1/2 top-[calc(100%+14px)] z-40 w-[min(290px,calc(100vw-24px))] rounded-2xl border border-line bg-white p-4 text-ink shadow-[0_18px_50px_rgba(15,23,42,.18)] max-h-[70vh] overflow-y-auto" data-open={open} inert={!open} role="dialog" aria-label="Pilih waktu">
        <div className="mb-3 flex items-center justify-between border-b border-line pb-3"><div><span className="block text-[.62rem] font-bold uppercase tracking-[.12em] text-[#64748b]">Waktu mulai</span><strong className="mt-1 block font-display text-lg">{value}</strong></div><Clock3 size={19} className="text-crimson" aria-hidden="true" /></div>
        <div className="grid grid-cols-[1.15fr_.85fr] gap-3">
          <div><span className="mb-2 block text-[.68rem] font-semibold text-muted">Jam</span>
            <div className="grid grid-cols-4 gap-1" role="group" aria-label="Pilih jam">
              {Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0')).map((option) => {
                const disabled = isHourDisabled(option)
                return (
                  <button
                    className={`rounded-md py-1.5 text-[.72rem] transition-colors
                      ${disabled ? 'cursor-not-allowed text-[#cbd5e1] line-through' : ''}
                      ${!disabled && hour === option ? 'bg-crimson text-white shadow-sm' : ''}
                      ${!disabled && hour !== option ? 'text-muted hover:bg-slate-ice hover:text-crimson' : ''}
                    `}
                    type="button"
                    key={option}
                    disabled={disabled}
                    aria-pressed={hour === option}
                    onClick={() => !disabled && setValue(`${option}:${minute}`)}
                  >{option}</button>
                )
              })}
            </div>
          </div>
          <div className="border-l border-line pl-3"><span className="mb-2 block text-[.68rem] font-semibold text-muted">Menit</span>
            <div className="grid grid-cols-3 gap-1" role="group" aria-label="Pilih menit">
              {Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0')).map((option) => {
                const disabled = isMinuteDisabled(hour, option)
                return (
                  <button
                    className={`rounded-md py-1.5 text-[.72rem] transition-colors
                      ${disabled ? 'cursor-not-allowed text-[#cbd5e1] line-through' : ''}
                      ${!disabled && minute === option ? 'bg-crimson text-white shadow-sm' : ''}
                      ${!disabled && minute !== option ? 'text-muted hover:bg-slate-ice hover:text-crimson' : ''}
                    `}
                    type="button"
                    key={option}
                    disabled={disabled}
                    aria-pressed={minute === option}
                    onClick={() => { if (!disabled) { setValue(`${hour}:${option}`); setOpen(false) } }}
                  >{option}</button>
                )
              })}
            </div>
          </div>
        </div>
      </div>}
    </div>
  )
}

function BookingTabs({ bookingMode, setBookingMode, hasAvailableDriver, loadingDriverAvailability }) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const tabRefs = useRef({})

  useEffect(() => {
    const el = tabRefs.current[bookingMode.label]
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth })
    }
  }, [bookingMode])

  return (
    <div className="relative flex min-h-[62px] items-center gap-6 overflow-x-auto border-b border-line scrollbar-none max-[600px]:min-h-[49px] max-[600px]:gap-4" role="tablist" aria-label="Jenis layanan">
      {bookingModes.map((mode) => {
        const isDriverMode = mode.label === 'Sewa mobil + Supir'
        const isDisabled = isDriverMode && !loadingDriverAvailability && !hasAvailableDriver
        return (
          <div key={mode.label} className="relative shrink-0 group">
            <button
              ref={(el) => { tabRefs.current[mode.label] = el }}
              type="button"
              role="tab"
              aria-selected={bookingMode.label === mode.label}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              className={`relative h-[62px] border-0 bg-transparent px-0.5 text-[.8rem] font-bold transition-colors duration-300 max-[600px]:h-[49px] max-[600px]:text-[.68rem] ${
                isDisabled
                  ? 'cursor-not-allowed text-[#b0bec5]'
                  : bookingMode.label === mode.label
                    ? 'text-crimson'
                    : 'text-[#74807c] hover:text-ink'
              }`}
              onClick={() => {
                if (!isDisabled) { setBookingMode(mode); setDurasi(mode.min) }
              }}
            >
              {mode.label}
              {isDisabled && (
                <span className="ml-1 inline-flex size-3.5 items-center justify-center rounded-full bg-slate-300 text-[9px] font-extrabold text-slate-600" aria-hidden="true">!</span>
              )}
            </button>
            {isDisabled && (
              <div
                className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 hidden w-max max-w-[220px] rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[.69rem] font-medium leading-snug text-amber-900 shadow-md group-hover:block"
                role="tooltip"
              >
                ⚠️ Supir sedang tidak tersedia.<br />Silakan pilih layanan sewa tanpa supir.
              </div>
            )}
          </div>
        )
      })}
      {/* Indicator geser smooth */}
      <span
        className="absolute bottom-[-1px] h-0.5 rounded-full bg-crimson transition-all duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
        aria-hidden="true"
      />
    </div>
  )
}

function CategorySelect({ value, onChange, className, id, ariaLabel }) {
  const [open, setOpen, mounted] = useAnimatedPopover()
  const pickerRef = useRef(null)
  const dismiss = () => setOpen(false)
  usePopoverDismiss(pickerRef, dismiss)
  const options = ['Semua armada', 'MPV', 'Premium', 'Rombongan']

  return (
    <div className="relative min-w-0" ref={pickerRef}>
      <button className={`group flex w-full items-center justify-between gap-3 text-left ${className}`} type="button" role="combobox" aria-label={ariaLabel} aria-expanded={open} aria-controls={id} aria-haspopup="listbox" onClick={() => setOpen((current) => !current)}>
        <span className="truncate">{value}</span><span className={`grid size-[30px] shrink-0 place-items-center rounded-full bg-slate-ice text-[#64748b] transition-[background-color,color,transform] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-hover:bg-cyan/10 group-hover:text-cyan ${open ? 'rotate-180 bg-cyan/10 text-cyan' : ''}`}><ChevronDown size={15} aria-hidden="true" /></span>
      </button>
      {mounted && <div className="picker-popover absolute left-0 top-[calc(100%+9px)] z-40 w-[min(210px,calc(100vw-40px))] overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,.16)]" id={id} data-open={open} inert={!open} role="listbox" aria-label={ariaLabel} style={{ '--picker-tx': 'translateX(0)' }}>
        {options.map((option) => <button className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[.8rem] transition-colors ${value === option ? 'bg-crimson/10 font-semibold text-crimson' : 'text-muted hover:bg-slate-ice hover:text-ink'}`} type="button" role="option" aria-selected={value === option} key={option} onClick={() => { onChange(option); setOpen(false) }}>{option}{value === option && <Check size={15} aria-hidden="true" />}</button>)}
      </div>}
    </div>
  )
}

function PhoneCountrySelect({ value, countries, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const pickerRef = useRef(null)
  const searchRef = useRef(null)
  const dismiss = () => setOpen(false)
  usePopoverDismiss(pickerRef, dismiss)

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  const selectedCountry = countries.find((country) => country.code === value)
  const query = search.trim().toLowerCase()
  const filteredCountries = countries.filter((country) => `${country.code} ${country.name} ${country.callingCode}`.toLowerCase().includes(query))

  return (
    <div className="relative shrink-0" ref={pickerRef}>
      <button
        className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-2 text-[.72rem] font-bold text-ink transition-colors hover:border-cyan/50"
        type="button"
        role="combobox"
        aria-label="Pilih kode negara nomor WhatsApp"
        aria-expanded={open}
        aria-controls="phone-country-options"
        aria-haspopup="listbox"
        onClick={() => { setSearch(''); setOpen((current) => !current) }}
      >
        <span>{selectedCountry?.code ?? value}</span>
        <span className="text-muted">+{selectedCountry?.callingCode ?? ''}</span>
        <ChevronDown className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} size={13} aria-hidden="true" />
      </button>
      {open && <div className="picker-popover absolute left-0 top-[calc(100%+8px)] z-50 w-[min(250px,calc(100vw-48px))] overflow-hidden rounded-lg border border-line bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,.18)]" id="phone-country-options" data-open={open} role="listbox" aria-label="Kode negara">
        <label className="mb-1.5 flex h-9 items-center gap-2 rounded-md border border-line px-2.5 focus-within:border-cyan">
          <Search className="shrink-0 text-muted" size={14} aria-hidden="true" />
          <input ref={searchRef} className="min-w-0 flex-1 border-0 bg-transparent text-[.74rem] outline-none placeholder:text-[#94a3b8]" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari negara atau kode" aria-label="Cari kode negara" />
        </label>
        <div className="max-h-52 overflow-y-auto" role="presentation">
          {filteredCountries.length ? filteredCountries.map((country) => (
            <button className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[.74rem] transition-colors ${country.code === value ? 'bg-crimson/10 font-bold text-crimson' : 'text-ink hover:bg-slate-ice'}`} type="button" role="option" aria-selected={country.code === value} key={country.code} onClick={() => { onChange(country.code); setOpen(false); setSearch('') }}>
              <span>{country.name} <span className="text-muted">· {country.code} +{country.callingCode}</span></span>
            </button>
          )) : <p className="m-0 px-2.5 py-3 text-[.72rem] text-muted" role="status">Negara tidak ditemukan.</p>}
        </div>
      </div>}
    </div>
  )
}

function LocationAutocomplete({ value, onChange, onSelect, inputRef, hasError }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const containerRef = useRef(null)
  const skipNextLookup = useRef(false)

  useEffect(() => {
    if (skipNextLookup.current) {
      skipNextLookup.current = false
      return undefined
    }

    const query = value.trim()
    if (query.length < 3 || !geoapifyApiKey) return undefined

    const controller = new AbortController()

    const timeout = window.setTimeout(async () => {
      setLoading(true)
      const params = new URLSearchParams({
        text: query,
        lang: 'id',
        limit: '6',
        format: 'json',
        filter: 'circle:106.8456,-6.2088,50000',
        bias: 'proximity:106.8456,-6.2088',
        apiKey: geoapifyApiKey,
      })

      try {
        const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Pencarian lokasi gagal.')

        const data = await response.json()
        const results = Array.isArray(data.results)
          ? data.results
          : (data.features ?? []).map((feature) => feature.properties)
        const locations = results.filter((location) => location?.formatted && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lon)))

        setSuggestions(locations)
        if (locations.length === 0) setMessage('Lokasi tidak ditemukan di Jakarta dan sekitarnya.')
      } catch (error) {
        if (error.name !== 'AbortError') setMessage('Pencarian lokasi gagal. Coba lagi.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 300)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [value])

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  function selectLocation(location) {
    skipNextLookup.current = true
    onChange(location.formatted)
    onSelect({ formatted: location.formatted, lat: location.lat, lon: location.lon })
    setSuggestions([])
    setOpen(false)
    setLoading(false)
    setMessage('')
  }

  function handleInputChange(nextValue) {
    setSuggestions([])
    setOpen(nextValue.trim().length >= 3)
    setLoading(false)
    setMessage('')
    onChange(nextValue)
  }

  const displayMessage = !geoapifyApiKey && value.trim().length >= 3
    ? 'Tambahkan VITE_GEOAPIFY_API_KEY di .env.local untuk mencari lokasi.'
    : message

  return (
    <div className="relative min-w-0" ref={containerRef}>
      <input
        ref={inputRef}
        className="w-full min-w-0 border-0 bg-transparent p-0 text-[.79rem] text-muted outline-none placeholder:text-[#64748b] max-[600px]:text-[.7rem]"
        name="pickup"
        value={value}
        placeholder="Ketik alamat atau tempat"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="pickup-suggestions"
        aria-invalid={hasError}
        onFocus={() => { if (value.trim().length >= 3) setOpen(true) }}
        onChange={(event) => handleInputChange(event.target.value)}
      />
      {open && <div className="absolute left-0 top-[calc(100%+14px)] z-50 max-h-[min(320px,55vh)] w-[min(420px,calc(100vw-40px))] overflow-y-auto rounded-xl border border-line bg-white p-1.5 text-left shadow-[0_18px_50px_rgba(15,23,42,.18)]" id="pickup-suggestions" role="listbox" aria-label="Saran lokasi Jakarta dan sekitarnya">
        {loading ? <p className="px-3 py-2.5 text-[.76rem] text-muted" role="status">Mencari lokasi...</p> : displayMessage ? <p className="px-3 py-2.5 text-[.72rem] leading-5 text-muted" role="status">{displayMessage}</p> : suggestions.map((location, index) => (
          <button
            className="block w-full rounded-lg px-3 py-2.5 text-left text-[.76rem] leading-5 text-muted transition-colors hover:bg-slate-ice hover:text-ink focus:bg-slate-ice focus:outline-none"
            type="button"
            role="option"
            aria-selected="false"
            key={`${location.place_id ?? location.formatted}-${index}`}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => selectLocation(location)}
          >{location.formatted}</button>
        ))}
      </div>}
    </div>
  )
}

function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true
    let settled = false
    const sessionCheckTimeout = window.setTimeout(() => {
      if (!active || settled) return
      settled = true
      setErrorMessage('Pemeriksaan sesi terlalu lama. Silakan masuk kembali.')
      setCheckingSession(false)
    }, 6000)

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || settled) return
      settled = true
      window.clearTimeout(sessionCheckTimeout)
      if (error) {
        setErrorMessage('Sesi tidak dapat diperiksa. Silakan masuk kembali.')
        setCheckingSession(false)
        return
      }
      const user = data.session?.user
      if (user?.app_metadata?.role === 'admin') {
        window.location.replace('/admin')
        return
      }
      setCheckingSession(false)
    }).catch(() => {
      if (!active || settled) return
      settled = true
      window.clearTimeout(sessionCheckTimeout)
      setErrorMessage('Sesi tidak dapat diperiksa. Silakan masuk kembali.')
      setCheckingSession(false)
    })

    return () => {
      active = false
      window.clearTimeout(sessionCheckTimeout)
    }
  }, [])

  async function handleLogin(event) {
    event.preventDefault()
    setErrorMessage('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        setErrorMessage('Email atau kata sandi tidak valid.')
        return
      }

      const { error: refreshError } = await supabase.auth.refreshSession()
      if (refreshError) {
        await supabase.auth.signOut()
        setErrorMessage('Sesi login gagal diperbarui. Coba lagi.')
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) {
        await supabase.auth.signOut()
        setErrorMessage('Sesi login gagal diverifikasi. Coba lagi.')
        return
      }

      const authenticatedUser = userData.user ?? data.user
      if (authenticatedUser?.app_metadata?.role !== 'admin') {
        await supabase.auth.signOut()
        setErrorMessage('Akun ini tidak memiliki akses administrator.')
        return
      }

      window.location.assign('/admin')
    } catch {
      setErrorMessage('Email atau kata sandi tidak valid.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-slate-ice text-ink lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-ink lg:flex">
        <img className="absolute inset-0 size-full object-cover opacity-70" src={heroBackground} alt="" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,.9),rgba(15,23,42,.42)_58%,rgba(15,23,42,.82))]" />
        <div className="relative flex w-full flex-col justify-between px-[clamp(36px,7vw,108px)] py-12 text-white">
          <a className="inline-flex w-fit items-center gap-3" href="/" aria-label="Kembali ke halaman utama">
            <span className="grid h-11 w-[58px] place-items-center overflow-hidden rounded-md bg-white p-1"><img className="size-full object-contain" src={logo} alt="" /></span>
            <span className="grid gap-1"><strong className="font-display text-[.88rem] font-extrabold tracking-[.08em]">PT KHALISA</strong><small className="text-[.58rem] font-semibold tracking-[.14em] text-cyan">SUMBER REZEKI</small></span>
          </a>
          <div className="max-w-[540px] pb-8">
            <span className="mb-5 inline-flex items-center gap-2 text-[.68rem] font-bold tracking-[.16em] text-cyan"><span className="h-px w-8 bg-cyan" />PORTAL ADMINISTRATOR</span>
            <h1 className="m-0 font-display text-[clamp(2.4rem,4.6vw,4.2rem)] font-extrabold leading-[1.08]">Kelola armada dengan tenang.</h1>
            <p className="mb-0 mt-5 max-w-[410px] text-[.9rem] leading-7 text-white/75">Akses khusus untuk tim administrator PT Khalisa Sumber Rezeki.</p>
          </div>
          <span className="text-[.68rem] text-white/55">© 2026 PT Khalisa Sumber Rezeki</span>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-slate-ice px-8 py-12 max-[600px]:px-5 max-[600px]:py-8">
        <div className="w-full max-w-[460px]">
          <a className="mb-10 inline-flex items-center gap-3 lg:hidden" href="/" aria-label="Kembali ke halaman utama">
            <span className="grid h-10 w-[54px] place-items-center rounded-md bg-white p-1 shadow-sm"><img className="size-full object-contain" src={logo} alt="" /></span>
            <span className="grid gap-1"><strong className="font-display text-[.8rem] font-extrabold tracking-[.08em]">PT KHALISA</strong><small className="text-[.55rem] font-semibold tracking-[.14em] text-cyan">SUMBER REZEKI</small></span>
          </a>

          {checkingSession ? (
            <div className="py-16 text-center text-[.85rem] text-muted" role="status">Memeriksa sesi administrator...</div>
          ) : (
            <>
              <div className="mb-6">
                <span className="mb-3 inline-flex items-center gap-2 text-[.65rem] font-extrabold tracking-[.15em] text-crimson"><span className="h-px w-6 bg-crimson" />AKSES TERBATAS</span>
                <h1 className="m-0 font-display text-[2.1rem] font-extrabold leading-[1.12] max-[420px]:text-[1.8rem]">Masuk sebagai admin</h1>
                <p className="mb-0 mt-3 text-[.84rem] leading-6 text-muted">Gunakan akun administrator yang terdaftar.</p>
              </div>

              <form className="grid gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,.07)] sm:gap-5 sm:p-7" onSubmit={handleLogin}>
                <label className="grid min-w-0 gap-2">
                  <span className="text-[.72rem] font-bold text-ink">Email</span>
                  <span className="flex h-12 min-w-0 items-center gap-3 rounded-lg border border-line bg-white px-3.5 transition-[border-color,box-shadow] focus-within:border-cyan focus-within:ring-4 focus-within:ring-cyan/10">
                    <Mail className="shrink-0 text-[#64748b]" size={17} aria-hidden="true" />
                    <input className="h-full min-w-0 flex-1 border-0 bg-transparent text-[.84rem] outline-none placeholder:text-[#94a3b8]" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@perusahaan.com" />
                  </span>
                </label>

                <label className="grid min-w-0 gap-2">
                  <span className="text-[.72rem] font-bold text-ink">Kata sandi</span>
                  <span className="flex h-12 min-w-0 items-center gap-3 rounded-lg border border-line bg-white px-3.5 transition-[border-color,box-shadow] focus-within:border-cyan focus-within:ring-4 focus-within:ring-cyan/10">
                    <LockKeyhole className="shrink-0 text-[#64748b]" size={17} aria-hidden="true" />
                    <input className="h-full min-w-0 flex-1 border-0 bg-transparent text-[.84rem] outline-none placeholder:text-[#94a3b8]" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan kata sandi" />
                    <button className="grid size-9 shrink-0 place-items-center rounded-md text-[#64748b] transition-colors hover:bg-slate-ice hover:text-ink" type="button" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button>
                  </span>
                </label>

                {errorMessage && <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[.76rem] leading-5 text-red-700" role="alert">{errorMessage}</p>}

                <button className="mt-1 flex h-12 items-center justify-center gap-2 rounded-lg bg-crimson px-5 text-[.82rem] font-bold text-white shadow-[0_6px_18px_rgba(225,29,72,.18)] transition-[background-color,box-shadow] hover:bg-crimson-deep hover:shadow-[0_9px_24px_rgba(225,29,72,.24)] disabled:cursor-wait disabled:opacity-70" type="submit" disabled={loading}>
                  {loading ? 'Memverifikasi...' : 'Masuk'}
                  {!loading && <ArrowRight size={16} aria-hidden="true" />}
                </button>
              </form>

              <a className="mt-6 inline-flex min-h-10 items-center gap-2 text-[.76rem] font-semibold text-muted transition-colors hover:text-crimson" href="/">Kembali ke halaman utama <ArrowUpRight size={14} aria-hidden="true" /></a>
            </>
          )}
        </div>
      </section>
    </main>
  )
}

function RentalHome() {
  const [bookingMode, setBookingMode] = useState(bookingModes[0])
  const [durasi, setDurasi] = useState(bookingModes[0].min)
  const [selectedVehicleModelKeys, setSelectedVehicleModelKeys] = useState([])
  const [vehicleDetailGroup, setVehicleDetailGroup] = useState(null)
  const [selectedVehicles, setSelectedVehicles] = useState([])
  const [formErrors, setFormErrors] = useState({})
  const [bookingConfirmation, setBookingConfirmation] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availabilityRefresh, setAvailabilityRefresh] = useState(0)
  const [availabilityResult, setAvailabilityResult] = useState({ key: '', status: 'idle', data: null })
  const [phoneCountry, setPhoneCountry] = useState('ID')
  const [phoneCountries, setPhoneCountries] = useState([])
  const [phoneNumberParser, setPhoneNumberParser] = useState(null)
  const [pickupLocation, setPickupLocation] = useState('')
  const [selectedPickup, setSelectedPickup] = useState(null)
  const formRef = useRef(null)
  const pickupRef = useRef(null)
  const [category, setCategory] = useState('Semua armada')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileMenuMounted, setMobileMenuMounted] = useState(false)
  const [activeSection, setActiveSection] = useState('#beranda')
  const [allVehicles, setAllVehicles] = useState([])
  const [displayedVehicles, setDisplayedVehicles] = useState([])
  const [vehiclesLoading, setVehiclesLoading] = useState(true)
  const [vehiclesError, setVehiclesError] = useState(null)
  const availabilityKey = `${selectedDate}|${selectedTime}|${bookingMode.label}|${durasi}|${availabilityRefresh}`
  const currentAvailability = availabilityResult.key === availabilityKey ? availabilityResult : null
  const windowAvailability = currentAvailability?.data ?? null
  const availabilityStatus = !selectedDate || !selectedTime ? 'idle' : currentAvailability?.status ?? 'loading'
  const [vehicleTransition, setVehicleTransition] = useState('idle')
  const [hasAvailableDriver, setHasAvailableDriver] = useState(true)
  const [loadingDriverAvailability, setLoadingDriverAvailability] = useState(true)
  const categoryInitialized = useRef(false)

  useEffect(() => {
    let active = true

    import('libphonenumber-js').then(({ getCountries, getCountryCallingCode, parsePhoneNumber }) => {
      if (!active) return
      const regionNames = new Intl.DisplayNames(['id'], { type: 'region' })
      const countries = getCountries()
        .map((country) => ({ code: country, name: regionNames.of(country) ?? country, callingCode: getCountryCallingCode(country) }))
        .sort((first, second) => first.name.localeCompare(second.name, 'id'))
      setPhoneCountries(countries)
      setPhoneNumberParser(() => parsePhoneNumber)
    }).catch(() => {
      if (active) setPhoneCountries([])
      if (active) setPhoneNumberParser(null)
    })

    return () => { active = false }
  }, [])

  // Fetch ketersediaan supir — lewat RPC boolean karena tabel `drivers`
  // tidak dibuka ke anon (RLS). Query langsung ke tabel selalu mengembalikan
  // count 0 sehingga opsi "+ Supir" ikut terkunci.
  useEffect(() => {
    let active = true

    async function checkDriverAvailability() {
      try {
        const { data, error } = await supabase.rpc('driver_availability')

        if (!active) return

        if (error) {
          // RPC belum dibuat di database — tetap aktifkan opsi supir (fail-safe)
          setHasAvailableDriver(true)
        } else {
          setHasAvailableDriver(data !== false)
        }
      } catch {
        if (active) setHasAvailableDriver(true)
      } finally {
        if (active) setLoadingDriverAvailability(false)
      }
    }

    checkDriverAvailability()
    // Refresh setiap 60 detik agar sinkron dengan perubahan admin di dashboard
    const timer = window.setInterval(checkDriverAvailability, 60_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Kalau mode "+ Supir" sedang aktif lalu semua supir habis, geser ke mode
  // berikutnya supaya user tidak terjebak di tab yang non-interaktif.
  useEffect(() => {
    if (loadingDriverAvailability || hasAvailableDriver) return
    if (bookingMode.label !== 'Sewa mobil + Supir') return
    setBookingMode(bookingModes[1])
    setDurasi(bookingModes[1].min)
  }, [loadingDriverAvailability, hasAvailableDriver, bookingMode, setBookingMode])

  // Fetch data kendaraan dari Supabase
  useEffect(() => {
    let active = true

    async function fetchVehicles() {
      try {
        const mapped = await fetchActiveVehicles()

        if (active) setAllVehicles(mapped)
      } catch (err) {
        if (active) setVehiclesError(err.message)
      } finally {
        if (active) setVehiclesLoading(false)
      }
    }

    fetchVehicles()
    const refreshTimer = window.setInterval(fetchVehicles, 60_000)
    return () => {
      active = false
      window.clearInterval(refreshTimer)
    }
  }, [])

  useEffect(() => {
    if (!categoryInitialized.current) {
      categoryInitialized.current = true
      return undefined
    }

    setVehicleTransition('exit')
    const enterTimer = window.setTimeout(() => {
      setDisplayedVehicles(getVehiclesByCategory(allVehicles, category))
      setVehicleTransition('enter')
    }, 170)
    const resetTimer = window.setTimeout(() => setVehicleTransition('idle'), 760)
    return () => {
      window.clearTimeout(enterTimer)
      window.clearTimeout(resetTimer)
    }
  }, [category, allVehicles])

  useEffect(() => {
    const sections = navigationLinks
      .map((link) => document.querySelector(link.href))
      .filter(Boolean)
    let animationFrame = 0

    const updateActiveSection = () => {
      if (animationFrame) return

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0
        const activationLine = window.innerHeight * 0.65
        const reachedPageEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
        const currentSection = reachedPageEnd
          ? sections[sections.length - 1]
          : sections.filter((section) => section.getBoundingClientRect().top <= activationLine).pop() || sections[0]

        if (currentSection) setActiveSection(`#${currentSection.id}`)
      })
    }

    window.addEventListener('scroll', updateActiveSection, { passive: true })
    window.addEventListener('resize', updateActiveSection)
    updateActiveSection()

    return () => {
      window.removeEventListener('scroll', updateActiveSection)
      window.removeEventListener('resize', updateActiveSection)
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  useEffect(() => {
    const revealTargets = document.querySelectorAll('[data-scroll-reveal]')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.dataset.reveal = 'visible'
        }
      })
    }, {
      threshold: 0,
      rootMargin: '0px 0px -6% 0px',
    })

    revealTargets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (mobileMenuOpen || !mobileMenuMounted) return undefined

    const closeTimer = window.setTimeout(() => setMobileMenuMounted(false), 360)
    return () => window.clearTimeout(closeTimer)
  }, [mobileMenuOpen, mobileMenuMounted])

  useEffect(() => {
    if (!mobileMenuOpen) return undefined

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    if (!vehicleDetailGroup) return undefined

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setVehicleDetailGroup(null)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [vehicleDetailGroup])

  useEffect(() => {
    let active = true
    if (!selectedDate || !selectedTime) return undefined
    const queryKey = `${selectedDate}|${selectedTime}|${bookingMode.label}|${durasi}|${availabilityRefresh}`
    const startTs = toJakartaISOString(selectedDate, selectedTime)
    const endTs = getEndDateTime(selectedDate, selectedTime, bookingMode, durasi).timestamp

    async function loadAvailability() {
      try {
        const { data, error } = await supabase.rpc('vehicle_availability', { start_ts: startTs, end_ts: endTs })
        if (!active) return
        if (error || !Array.isArray(data)) {
          setAvailabilityResult({ key: queryKey, status: 'error', data: null })
          return
        }
        const map = {}
        for (const row of data) map[row.vehicle_id] = row
        setAvailabilityResult({ key: queryKey, status: 'ready', data: map })
        setSelectedVehicles((current) => current.filter((vehicle) => getWindowRemaining(map, vehicle, vehicle.transmission_type) >= vehicle.quantity))
      } catch {
        if (!active) return
        setAvailabilityResult({ key: queryKey, status: 'error', data: null })
      }
    }

    loadAvailability()

    return () => { active = false }
  }, [selectedDate, selectedTime, bookingMode, durasi, availabilityRefresh])

  async function handleSearch(event) {
    event.preventDefault()
    const form = event.currentTarget
    const pickup = form.pickup?.value?.trim()
    const customerName = form.customer_name?.value?.trim()
    const customerPhone = form.customer_phone?.value?.trim()
    const date = form.start?.value
    const time = form.time?.value
    let normalizedPhone = ''
    try {
      const parsedPhone = phoneNumberParser?.(customerPhone ?? '', phoneCountry, { extract: false })
      if (parsedPhone?.isValid()) normalizedPhone = parsedPhone.number
      else if (/^\+\d{8,15}$/.test((customerPhone ?? '').trim())) normalizedPhone = (customerPhone ?? '').trim()
    } catch {
      normalizedPhone = ''
    }

    // Validasi semua field wajib
    const errors = {}
    if (!customerName || customerName.length < 2) errors.customerName = 'Isi nama pemesan'
    if (!normalizedPhone) errors.customerPhone = 'Nomor tidak valid. Pilih negara atau masukkan kode negara, misalnya +62.'
    if (!pickup || !selectedPickup) errors.pickup = 'Pilih lokasi dari saran di Jakarta dan sekitarnya'
    if (!date) errors.date = 'Pilih tanggal'
    if (!time) errors.time = 'Pilih waktu'
    if (selectedVehicleModelKeys.length === 0) errors.vehicles = 'Pilih minimal 1 kendaraan dari daftar armada'
    else if (selectedVehicles.length === 0) errors.vehicles = 'Pilih tipe transmisi dan jumlah unit di kartu pesanan.'
    else if (date && availabilityStatus === 'error') errors.vehicles = 'Ketersediaan unit belum bisa diperiksa. Coba ubah jadwal atau muat ulang halaman.'
    else if (date && availabilityStatus !== 'ready') errors.vehicles = 'Tunggu sampai pemeriksaan ketersediaan unit selesai.'
    else if (date && selectedVehicles.some((vehicle) => getWindowRemaining(windowAvailability, vehicle, vehicle.transmission_type) < vehicle.quantity)) errors.vehicles = 'Ada tipe unit yang sudah tidak tersedia pada jadwal ini. Sesuaikan jumlah kendaraan.'
    if (!form.privacy_consent?.checked) errors.privacy = 'Persetujuan pemrosesan data diperlukan'

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      // Scroll ke field pertama yang error
      if (errors.customerName) form.customer_name?.focus()
      else if (errors.customerPhone) form.customer_phone?.focus()
      else if (errors.pickup) pickupRef.current?.focus()
      else if (errors.vehicles) document.querySelector('#armada')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    setFormErrors({})
    const tanggalFormatted = formatJakartaDateTime(toJakartaISOString(date, '00:00'), { day: 'numeric', month: 'long', year: 'numeric' })
    const selesai = getEndDateTime(date, time, bookingMode, durasi)
    const estimatedPrice = selectedVehicles.reduce((total, vehicle) => total + Math.round(parsePrice(vehicle.price) * hitungMultiplier(bookingMode, durasi) * vehicle.quantity), 0)
    let bookingCode = generateBookingCode()
    const bookingRequest = {
      customer_name: customerName,
      customer_phone: normalizedPhone,
      pickup_address: selectedPickup.formatted,
      pickup_lat: Number(selectedPickup.lat),
      pickup_lon: Number(selectedPickup.lon),
      start_at: toJakartaISOString(date, time),
      end_at: selesai.timestamp,
      booking_mode: bookingMode.label,
      duration: durasi,
      duration_unit: bookingMode.unit,
      vehicle_ids: [...new Set(selectedVehicles.map((vehicle) => vehicle.id))],
      vehicle_snapshot: selectedVehicles.map((vehicle) => ({
        id: vehicle.id,
        name: vehicle.name,
        transmission_type: vehicle.transmission_type,
        powertrain_type: vehicle.powertrain_type,
        price: Math.round(parsePrice(vehicle.price) * hitungMultiplier(bookingMode, durasi) * vehicle.quantity),
        quantity: vehicle.quantity,
      })),
      estimated_price: estimatedPrice,
      privacy_consent: true,
      booking_code: bookingCode,
    }

    const whatsappWindow = window.open('about:blank', '_blank')
    if (whatsappWindow) whatsappWindow.opener = null

    let { error: bookingError } = await supabase
      .from('booking_requests')
      .insert(bookingRequest)

    // Kode booking bentrok (sangat jarang) — buat ulang sekali lalu coba lagi.
    if (bookingError?.code === '23505' && bookingError.message?.includes('booking_code')) {
      bookingCode = generateBookingCode()
      ;({ error: bookingError } = await supabase
        .from('booking_requests')
        .insert({ ...bookingRequest, booking_code: bookingCode }))
    }

    // Kolom booking_code belum ada (migrasi belum dijalankan) atau permission insert booking_code belum di-grant ke role anon (42501/401) — simpan tanpa kode.
    const isBookingCodeIssue = Boolean(
      bookingError && (
        bookingError.code === '42501' ||
        bookingError.code === '42703' ||
        /booking_code|permission denied/i.test(bookingError.message ?? '') ||
        /booking_code/i.test(bookingError.details ?? '') ||
        /booking_code/i.test(bookingError.hint ?? '')
      )
    )

    if (isBookingCodeIssue) {
      bookingCode = null
      const { booking_code: _omit, ...withoutCode } = bookingRequest
      ;({ error: bookingError } = await supabase
        .from('booking_requests')
        .insert(withoutCode))
    }

    if (bookingError) {
      whatsappWindow?.close()
      if (bookingError.code === 'P0001' && bookingError.message?.includes('VEHICLE_UNAVAILABLE')) {
        setAvailabilityRefresh((current) => current + 1)
        try {
          const latestVehicles = await fetchActiveVehicles()
          setAllVehicles(latestVehicles)
          setDisplayedVehicles(getVehiclesByCategory(latestVehicles, category))
          setSelectedVehicles((prev) => prev.filter((vehicle) => latestVehicles.some((latest) => latest.id === vehicle.id && getVehicleTransmissionStock(latest, vehicle.transmission_type) >= vehicle.quantity)))
        } catch {
          // Preserve the booking conflict message if availability refresh also fails.
        }
      }
      setFormErrors({ booking: bookingError.code === 'P0001' && bookingError.message?.includes('VEHICLE_UNAVAILABLE')
        ? 'Maaf, slot kendaraan baru saja diambil. Muat ulang armada lalu pilih unit lain.'
        : 'Permintaan belum tersimpan. Coba lagi atau hubungi admin melalui WhatsApp.' })
      return
    }

    try {
      const latestVehicles = await fetchActiveVehicles()
      setAllVehicles(latestVehicles)
      setDisplayedVehicles(getVehiclesByCategory(latestVehicles, category))
    } catch {
      // The booking is saved; keep its confirmation visible if availability refresh fails.
    }

    const totalSelectedUnits = selectedVehicles.reduce((total, vehicle) => total + vehicle.quantity, 0)
    const kendaraanLines = selectedVehicles.map((vehicle, index) =>
      `${index + 1}. ${vehicle.name} (${getVehicleVariantLabel(vehicle, vehicle.transmission_type)}) x ${vehicle.quantity}\n   Estimasi biaya: Rp ${formatPrice(vehicle.price)} / ${durasi} ${bookingMode.unit}`
    ).join('\n')

    const lines = [
      'PERMINTAAN PEMESANAN KENDARAAN',
      '',
      ...(bookingCode ? [`Kode booking: ${bookingCode}`, ''] : []),
      'Halo, saya ingin mengajukan pemesanan dengan rincian berikut:',
      '',
      `Nama pemesan: ${customerName}`,
      `Nomor WhatsApp: ${normalizedPhone}`,
      `Jenis layanan: ${bookingMode.label}`,
      `Durasi sewa: ${durasi} ${bookingMode.unit}`,
      '',
      'Lokasi penjemputan:',
      selectedPickup.formatted,
      `Google Maps: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPickup.formatted)}`,
      '',
      'Jadwal:',
      `Tanggal mulai: ${tanggalFormatted}`,
      `Waktu mulai: ${time} WIB`,
      `Tanggal selesai: ${selesai.date}`,
      `Waktu selesai: ${selesai.time} WIB`,
      '',
      `Kendaraan (${totalSelectedUnits} unit):`,
      kendaraanLines,
      '',
      'Mohon konfirmasi ketersediaan kendaraan dan total biaya. Terima kasih.',
    ].join('\n')

    const waUrl = `https://wa.me/6281380835156?text=${encodeURIComponent(lines)}`
    setBookingConfirmation({ waUrl, bookingCode })
    if (whatsappWindow) whatsappWindow.location.href = waUrl
  }

  function handleSelectVehicle(vehicleGroup) {
    const alreadySelected = selectedVehicleModelKeys.includes(vehicleGroup.key)
    if (alreadySelected) {
      const variantIds = new Set(vehicleGroup.variants.map((variant) => variant.id))
      setSelectedVehicleModelKeys((previous) => previous.filter((key) => key !== vehicleGroup.key))
      setSelectedVehicles((previous) => previous.filter((item) => !variantIds.has(item.id)))
      return
    }

    setSelectedVehicleModelKeys((previous) => [...previous, vehicleGroup.key])
    if (selectedVehicleModelKeys.length === 0) {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
    }
  }

  function handleVehicleCardClick(event, vehicleGroup) {
    if (event.target.closest('button, a')) return
    setVehicleDetailGroup(vehicleGroup)
  }

  function setVehicleTransmissionQuantity(vehicle, transmissionType, quantity) {
    setSelectedVehicles((previous) => {
      const existing = previous.find((item) => item.id === vehicle.id && item.transmission_type === transmissionType)
      const next = previous.filter((item) => item.id !== vehicle.id || item.transmission_type !== transmissionType)
      if (quantity > 0) next.push({ ...vehicle, transmission_type: transmissionType, quantity })
      return next
    })
  }

  function removeSelectedVehicle(vehicleGroup) {
    const variantIds = new Set(vehicleGroup.variants.map((variant) => variant.id))
    setSelectedVehicleModelKeys((previous) => previous.filter((key) => key !== vehicleGroup.key))
    setSelectedVehicles((previous) => previous.filter((item) => !variantIds.has(item.id)))
  }

  function handleBrandClick(event) {
    if (!window.matchMedia('(max-width: 980px)').matches) return

    event.preventDefault()
    setMobileMenuMounted(true)
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setMobileMenuOpen(true)))
  }

  const windowVehicles = availabilityStatus === 'ready' && windowAvailability
    ? displayedVehicles.filter((vehicle) => isVehicleReadyForWindow(vehicle, windowAvailability))
    : []
  const hasSelectedSchedule = Boolean(selectedDate && selectedTime)
  const visibleVehicles = hasSelectedSchedule
    ? availabilityStatus === 'ready' ? windowVehicles : []
    : displayedVehicles
  const allVehicleGroups = groupVehiclesByName(allVehicles)
  const selectedVehicleModels = selectedVehicleModelKeys
    .map((key) => allVehicleGroups.find((group) => group.key === key))
    .filter(Boolean)
  const visibleVehicleGroups = groupVehiclesByName(visibleVehicles)
  const detailVariants = vehicleDetailGroup?.variants.flatMap((vehicle) => {
    const availability = hasSelectedSchedule && availabilityStatus === 'ready' ? windowAvailability : null
    const bookableVariants = getBookableVehicleVariants(vehicle, availability)
    if (bookableVariants.length > 0) return bookableVariants.map((variant) => ({ ...variant, unallocated: false }))
    const unallocated = getUnallocatedVehicleUnits(vehicle, availability)
    return unallocated > 0 ? [{ vehicle, transmissionType: null, available: unallocated, unallocated: true }] : []
  }) ?? []
  const vehicleDetailIsSelected = vehicleDetailGroup ? selectedVehicleModelKeys.includes(vehicleDetailGroup.key) : false
  const canChooseVehicleDetail = hasSelectedSchedule
    && availabilityStatus === 'ready'
    && !vehicleDetailIsSelected
    && detailVariants.some((variant) => !variant.unallocated && variant.available > 0)
  const vehicleDetailBadge = vehicleDetailGroup?.variants.find((variant) => variant.badge)?.badge
  const vehicleDetailStatuses = [...new Set((vehicleDetailGroup?.variants ?? []).map((variant) => {
    const status = String(variant.status ?? '').trim().toLowerCase()
    if (['maintenance', 'perawatan'].includes(status)) return 'Perawatan'
    if (['booking', 'booked', 'reserved'].includes(status)) return 'Booking'
    return 'Ready'
  }))]

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-white text-ink [&_a]:no-underline">
      <div className="hidden">
        <span>Rental terpercaya untuk setiap perjalanan</span>
        <div><span>Setiap hari, 24 jam</span><a href="tel:081380835156">0813 8083 5156</a></div>
      </div>

      <header className="public-site-header sticky top-[14px] z-30 mx-auto -mb-[100px] mt-[14px] flex min-h-[76px] w-[min(1320px,calc(100%-48px))] items-center justify-between gap-7 rounded-[12px] border border-white/15 bg-ink/90 px-7 shadow-[0_14px_40px_rgba(15,23,42,.28)] backdrop-blur-xl max-[900px]:px-[4%] max-[760px]:w-[calc(100%-32px)] max-[760px]:flex-nowrap max-[760px]:gap-x-4 max-[760px]:px-4 max-[760px]:py-3 max-[600px]:mt-3 max-[600px]:w-[calc(100%-24px)] max-[600px]:gap-2 max-[600px]:rounded-[10px] max-[600px]:py-[10px] max-[360px]:w-[calc(100%-16px)] max-[360px]:gap-x-2 max-[360px]:px-3">
        <a className="inline-flex shrink-0 items-center gap-3 max-[760px]:gap-2" href="#beranda" aria-label="PT Khalisa Sumber Rezeki, beranda" aria-expanded={mobileMenuOpen} aria-controls="mobile-nav-panel" onClick={handleBrandClick}>
          <span className="grid h-11 w-[58px] shrink-0 place-items-center overflow-hidden rounded-md bg-white p-0.5"><img className="h-full w-full object-contain" src={logo} alt="" /></span>
          <span className="grid gap-1 max-[600px]:gap-0.5"><strong className="font-display text-[.91rem] font-extrabold tracking-[.08em] text-white max-[760px]:text-[.82rem] max-[600px]:text-[.74rem] max-[360px]:text-[.68rem]">PT KHALISA</strong><small className="text-[.6rem] font-semibold tracking-[.14em] text-cyan max-[760px]:text-[.55rem] max-[600px]:text-[.5rem] max-[360px]:text-[.46rem]">SUMBER REZEKI</small></span>
        </a>
        <nav className="flex items-center gap-[clamp(18px,3.1vw,46px)] max-[980px]:hidden" aria-label="Navigasi utama">
          {navigationLinks.map((link) => <a className={`relative px-1.5 py-3 text-[.9rem] font-bold transition-colors duration-200 hover:text-cyan after:absolute after:bottom-[3px] after:left-1.5 after:right-1.5 after:h-0.5 after:origin-left after:bg-cyan after:transition-transform after:duration-[180ms] after:content-[''] focus-visible:after:scale-x-100 ${activeSection === link.href ? 'text-cyan after:scale-x-100' : 'text-white after:scale-x-0 hover:after:scale-x-100'}`} href={link.href} key={link.href} aria-current={activeSection === link.href ? 'location' : undefined}>{link.label}</a>)}
        </nav>
        <a className="inline-flex shrink-0 items-center gap-2 rounded-[5px] bg-crimson px-6 py-[14px] text-[.83rem] font-bold text-white shadow-[0_5px_14px_rgba(225,29,72,.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-crimson-deep hover:shadow-[0_8px_18px_rgba(225,29,72,.28)] max-[980px]:px-4 max-[980px]:py-3 max-[600px]:gap-1 max-[600px]:px-3 max-[600px]:py-2.5 max-[600px]:text-[.7rem] max-[360px]:px-2" href="/cek-booking">Cek booking <ArrowUpRight aria-hidden="true" size={15} /></a>
      </header>

      {mobileMenuMounted && (
        <div className={`fixed inset-0 z-50 transition-opacity duration-[350ms] ease-out ${mobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          <button className="absolute inset-0 size-full border-0 bg-ink/65 backdrop-blur-[2px]" type="button" aria-label="Tutup menu" tabIndex={mobileMenuOpen ? 0 : -1} onClick={() => setMobileMenuOpen(false)} />
          <aside className="mobile-sidebar absolute bottom-0 left-0 top-0 flex h-dvh w-[min(390px,88vw)] flex-col overflow-y-auto border-r border-white/10 bg-ink p-6 text-white shadow-[20px_0_60px_rgba(15,23,42,.35)]" data-open={mobileMenuOpen} id="mobile-nav-panel" role="dialog" aria-modal="true" aria-label="Menu navigasi" aria-hidden={!mobileMenuOpen}>
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
              <a className="inline-flex shrink-0 items-center gap-3 rounded-lg bg-white p-2" href="#beranda" aria-label="PT Khalisa Sumber Rezeki, beranda" onClick={() => setMobileMenuOpen(false)}>
                <span className="grid h-11 w-[58px] shrink-0 place-items-center overflow-hidden rounded-md bg-white p-0.5"><img className="h-full w-full object-contain" src={logo} alt="" /></span>
                <span className="grid gap-1"><strong className="font-display text-[.91rem] font-extrabold tracking-[.08em] text-ink">PT KHALISA</strong><small className="text-[.6rem] font-semibold tracking-[.14em] text-cyan">SUMBER REZEKI</small></span>
              </a>
              <button className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10" type="button" aria-label="Tutup menu" onClick={() => setMobileMenuOpen(false)}><X aria-hidden="true" size={19} /></button>
            </div>
            <nav className="mt-5 grid gap-2" aria-label="Navigasi mobile">
              {navigationLinks.map((link, index) => <a className={`group flex items-center gap-4 rounded-xl border px-4 py-[15px] transition-all duration-200 ${activeSection === link.href ? 'border-cyan/30 bg-cyan/10' : 'border-white/[.08] bg-white/[.035] hover:border-white/20 hover:bg-white/[.07]'}`} href={link.href} key={link.href} onClick={() => setMobileMenuOpen(false)} aria-current={activeSection === link.href ? 'location' : undefined}><span className={`w-6 text-[.62rem] font-bold ${activeSection === link.href ? 'text-cyan' : 'text-white/40'}`}>0{index + 1}</span><span className={`flex-1 font-display text-[.96rem] font-bold ${activeSection === link.href ? 'text-white' : 'text-white/80'}`}>{link.label}</span><ArrowRight className={`${activeSection === link.href ? 'text-cyan' : 'text-white/40'} transition-transform duration-200 group-hover:translate-x-1 group-hover:text-cyan`} aria-hidden="true" size={16} /></a>)}
            </nav>
            <div className="mt-auto grid gap-4 pt-8">
              <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[.035] p-4"><a className="text-[.92rem] font-semibold text-white transition-colors hover:text-cyan" href="tel:081380835156">0813 8083 5156</a></div>
            </div>
          </aside>
        </div>
      )}

      <main>
        <section className="relative h-[min(680px,66vw)] min-h-[540px] overflow-hidden bg-ink text-white max-[900px]:min-h-[560px] max-[760px]:h-[620px] max-[760px]:min-h-[620px] max-[600px]:h-[640px] max-[600px]:min-h-[640px]" id="beranda">
          <img className="absolute inset-0 size-full object-cover object-[center_57%] max-[760px]:object-[center_57%] max-[600px]:object-[0%_center]" src={landingBackground} alt="Latar mobil untuk perjalanan" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,.88)_0%,rgba(15,23,42,.60)_39%,rgba(15,23,42,.06)_76%),linear-gradient(0deg,rgba(15,23,42,.4),transparent_32%)] max-[760px]:bg-[linear-gradient(90deg,rgba(15,23,42,.84),rgba(15,23,42,.32)),linear-gradient(0deg,rgba(15,23,42,.38),transparent_55%)]" />
          <div className="absolute left-[9%] top-1/2 w-[min(760px,60%)] -translate-y-1/2 max-[900px]:left-[6%] max-[900px]:w-[min(680px,68%)] max-[760px]:left-[7%] max-[760px]:top-[53%] max-[760px]:w-[86%] max-[760px]:max-w-none max-[600px]:top-[53%]">
            <span className="mb-1 inline-flex items-center gap-[9px] rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[.72rem] font-semibold text-white/90 shadow-sm backdrop-blur-md max-[760px]:border-white/20 max-[760px]:bg-white/10 max-[760px]:text-white/90"><i className="size-2 rounded-full bg-cyan shadow-[0_0_0_5px_rgba(14,165,233,.2)]" /> Rental mobil pilihan di Jakarta & sekitarnya</span>
            <h1 className="my-7 font-display text-[clamp(3rem,5.2vw,4.8rem)] font-extrabold leading-[1.08] text-white max-[900px]:text-[clamp(2.35rem,5vw,3.5rem)] max-[760px]:text-[clamp(2.35rem,7vw,3.2rem)] max-[760px]:text-white max-[600px]:my-[17px] max-[600px]:text-[clamp(2.4rem,10vw,3.2rem)] max-[360px]:text-[2.25rem]">Perjalanan nyaman,<br /><em className="not-italic text-cyan">cerita lebih berkesan.</em></h1>
            <p className="m-0 max-w-[500px] text-base leading-[1.85] text-white/85 max-[760px]:max-w-[460px] max-[760px]:text-[.92rem] max-[760px]:text-white/85 max-[600px]:max-w-[340px] max-[600px]:text-[.88rem] max-[360px]:text-[.82rem]">Temukan kendaraan yang pas untuk liburan, perjalanan bisnis, dan momen penting bersama PT Khalisa Sumber Rezeki.</p>
            <div className="mt-9 flex flex-wrap items-center gap-5 max-[600px]:mt-7">
              <a className="inline-flex items-center gap-2 px-1 py-3 text-[.82rem] font-bold text-white/90 transition-colors hover:text-cyan" href="#armada">Jelajahi armada <ArrowDown className="text-cyan" aria-hidden="true" size={16} /></a>
            </div>
          </div>
          <div className="absolute bottom-[70px] left-[6.4%] right-[6.4%] flex justify-end text-[.65rem] font-bold tracking-[.13em] text-white/80 max-[760px]:left-[7%] max-[760px]:right-[7%] max-[760px]:text-white/80 max-[600px]:bottom-[62px] max-[600px]:text-[.54rem]"><span>KENYAMANAN DI SETIAP PERJALANAN</span></div>
        </section>

        <section ref={formRef} className={`relative z-10 mx-auto -mt-[32px] w-[min(1240px,87.2%)] rounded-[10px] border border-line bg-white px-8 pb-6 shadow-[0_18px_48px_rgba(15,23,42,.1)] max-[900px]:w-[92%] max-[600px]:-mt-[27px] max-[600px]:w-[calc(100%-28px)] max-[600px]:px-[15px] max-[600px]:pb-[15px] ${scrollRevealClasses}`} aria-label="Pencarian kendaraan" data-scroll-reveal data-reveal="hidden">
          <BookingTabs bookingMode={bookingMode} setBookingMode={setBookingMode} hasAvailableDriver={hasAvailableDriver} loadingDriverAvailability={loadingDriverAvailability} />
          {/* Input durasi */}
          <div className="flex flex-wrap items-center gap-3 border-b border-line py-3 max-[600px]:gap-x-2 max-[600px]:gap-y-1.5">
            <span className="text-[.72rem] font-bold text-crimson">{bookingMode.label}</span>
            <span className="text-[.72rem] text-muted">·</span>
            <span className="text-[.72rem] text-muted">Durasi:</span>
            <div className="flex items-center gap-1.5">
              <button type="button" className="grid size-6 place-items-center rounded-full border border-line text-[.8rem] font-bold text-muted transition hover:border-crimson hover:text-crimson" onClick={() => setDurasi((d) => Math.max(bookingMode.min, d - bookingMode.step))}>−</button>
              <input
                type="number"
                min={bookingMode.min}
                step={bookingMode.step}
                value={durasi}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || bookingMode.min
                  const snapped = Math.max(bookingMode.min, Math.round(val / bookingMode.step) * bookingMode.step)
                  setDurasi(snapped)
                }}
                className="w-10 border-0 bg-transparent p-0 text-center text-[.8rem] font-bold text-ink outline-none"
              />
              <button type="button" className="grid size-6 place-items-center rounded-full border border-line text-[.8rem] font-bold text-muted transition hover:border-crimson hover:text-crimson" onClick={() => setDurasi((d) => d + bookingMode.step)}>+</button>
            </div>
            <span className="text-[.72rem] font-semibold text-muted">{bookingMode.unit}</span>
          </div>
          <form id="booking-request-form" className="booking-request-form grid grid-cols-6 items-start gap-x-4 gap-y-4 py-6 max-[900px]:grid-cols-3 max-[600px]:grid-cols-1 max-[600px]:gap-x-3 max-[600px]:gap-y-3 max-[600px]:py-4" onSubmit={handleSearch}>
            <label className="col-span-2 grid min-w-0 gap-1.5 max-[900px]:col-span-1">
              <span className={`text-[.7rem] font-bold max-[600px]:text-[.64rem] ${formErrors.customerName ? 'text-red-500' : 'text-crimson'}`}>Nama pemesan</span>
              <input className="h-10 min-w-0 border-b border-line bg-transparent px-0 text-[.79rem] text-muted outline-none placeholder:text-[#94a3b8] focus:border-cyan" type="text" name="customer_name" autoComplete="name" maxLength={120} required placeholder="Nama lengkap" aria-invalid={Boolean(formErrors.customerName)} />
              {formErrors.customerName && <span className="text-[.62rem] text-red-500">{formErrors.customerName}</span>}
            </label>
            <label className="col-span-2 grid min-w-0 gap-1.5 max-[900px]:col-span-1">
              <span className={`text-[.7rem] font-bold max-[600px]:text-[.64rem] ${formErrors.customerPhone ? 'text-red-500' : 'text-crimson'}`}>Nomor WhatsApp</span>
              <span className="flex h-10 min-w-0 items-center gap-2 border-b border-line focus-within:border-cyan">
                <PhoneCountrySelect value={phoneCountry} countries={phoneCountries} onChange={setPhoneCountry} />
                <input className="h-full min-w-0 flex-1 border-0 bg-transparent px-0 text-[.79rem] text-muted outline-none placeholder:text-[#94a3b8]" type="tel" name="customer_phone" autoComplete="tel" maxLength={32} required placeholder="0812... atau +447..." aria-invalid={Boolean(formErrors.customerPhone)} />
              </span>
              {formErrors.customerPhone && <span className="text-[.62rem] text-red-500">{formErrors.customerPhone}</span>}
              {!formErrors.customerPhone && <span className="text-[.61rem] text-[#64748b]">Pilih negara lalu masukkan nomor WhatsApp sesuai format negara yang dipilih.</span>}
            </label>
            <label className="col-span-2 grid min-w-0 gap-1.5 max-[900px]:col-span-1 max-[600px]:col-span-1">
              <span className={`text-[.7rem] font-bold max-[600px]:text-[.64rem] ${formErrors.pickup ? 'text-red-500' : 'text-crimson'}`}>Lokasi penjemputan</span>
              <LocationAutocomplete
                value={pickupLocation}
                inputRef={pickupRef}
                hasError={Boolean(formErrors.pickup)}
                onChange={(value) => {
                  setPickupLocation(value)
                  setSelectedPickup(null)
                  setFormErrors((errors) => ({ ...errors, pickup: undefined }))
                }}
                onSelect={(location) => {
                  setSelectedPickup(location)
                  setFormErrors((errors) => ({ ...errors, pickup: undefined }))
                }}
              />
              {formErrors.pickup && <span className="text-[.62rem] text-red-500">{formErrors.pickup}</span>}
            </label>
            <div className="col-span-2 grid min-w-0 gap-1.5 max-[900px]:col-span-1 max-[600px]:col-span-1"><span className={`text-[.7rem] font-bold max-[600px]:text-[.64rem] ${formErrors.date ? 'text-red-500' : 'text-crimson'}`}>Tanggal mulai</span><DatePicker onDateChange={(date) => { setSelectedDate(date); setSelectedTime(''); if (!date) { setSelectedVehicleModelKeys([]); setSelectedVehicles([]) } setFormErrors((errors) => ({ ...errors, date: undefined, time: undefined })) }} />{formErrors.date && <span className="text-[.62rem] text-red-500">{formErrors.date}</span>}</div>
            <div className="col-span-1 grid min-w-0 gap-1.5"><span className={`text-[.7rem] font-bold max-[600px]:text-[.64rem] ${formErrors.time ? 'text-red-500' : 'text-crimson'} max-[600px]:text-[.64rem]`}>Waktu</span><TimePicker selectedDate={selectedDate} value={selectedTime} onTimeChange={(time) => { setSelectedTime(time); setFormErrors((errors) => ({ ...errors, time: undefined })) }} />{formErrors.time && <span className="text-[.62rem] text-red-500">{formErrors.time}</span>}</div>
            <div className="col-span-2 grid min-w-0 gap-1.5 max-[900px]:col-span-1 max-[600px]:col-span-1">
              <span className={`text-[.7rem] font-bold max-[600px]:text-[.64rem] ${formErrors.vehicles ? 'text-red-500' : 'text-crimson'}`}>Kendaraan</span>
              {selectedVehicleModels.length > 0 ? (
                <div className="grid gap-2">
                  {selectedVehicleModels.map((vehicleGroup) => {
                    const availableVariants = hasSelectedSchedule && availabilityStatus === 'ready'
                      ? vehicleGroup.variants.flatMap((vehicle) => {
                        const transmissionTypes = vehicle.transmission_options?.length ? getAllocatedTransmissionOptions(vehicle) : [null]
                        return transmissionTypes.map((transmissionType) => ({
                          vehicle,
                          transmissionType,
                          available: getWindowRemaining(windowAvailability, vehicle, transmissionType) ?? 0,
                          unitPrice: Math.round(parsePrice(vehicle.price) * hitungMultiplier(bookingMode, durasi)),
                        })).filter((variant) => variant.available > 0)
                      })
                      : []
                    const unallocatedUnits = vehicleGroup.variants.reduce((total, vehicle) => {
                      const totalAvailable = getWindowRemaining(windowAvailability, vehicle) ?? 0
                      const allocatedAvailable = getAllocatedTransmissionOptions(vehicle).reduce((subtotal, transmissionType) => subtotal + (getWindowRemaining(windowAvailability, vehicle, transmissionType) ?? 0), 0)
                      return total + Math.max(0, totalAvailable - allocatedAvailable)
                    }, 0)
                    return (
                      <div className="grid gap-2 rounded-lg border border-line bg-white p-3" key={vehicleGroup.key}>
                        <div className="flex items-center justify-between gap-2"><strong className="text-[.8rem] text-ink">{vehicleGroup.name}</strong><button type="button" className="grid size-8 place-items-center rounded-md text-slate-600 hover:bg-slate-ice" aria-label={`Hapus ${vehicleGroup.name}`} onClick={() => removeSelectedVehicle(vehicleGroup)}><X size={15} aria-hidden="true" /></button></div>
                        {availabilityStatus === 'ready' ? availableVariants.length > 0 ? availableVariants.map(({ vehicle, transmissionType, available, unitPrice }) => {
                          const quantity = selectedVehicles.find((item) => item.id === vehicle.id && item.transmission_type === transmissionType)?.quantity ?? 0
                          const selectedForVariant = selectedVehicles.filter((item) => item.id === vehicle.id).reduce((total, item) => total + item.quantity, 0)
                          const totalAvailableForVariant = getWindowRemaining(windowAvailability, vehicle) ?? 0
                          const typeLabel = getVehicleVariantLabel(vehicle, transmissionType)
                          return (
                            <div className="flex items-center justify-between gap-3 rounded-md bg-slate-ice px-3 py-2" key={`${vehicle.id}-${transmissionType ?? 'default'}`}>
                              <span className="grid min-w-0 gap-0.5"><strong className="text-[.74rem] text-ink">{typeLabel}</strong><small className="text-[.68rem] font-medium text-slate-700">{available} unit · Rp {formatPrice(unitPrice)} / unit</small>{quantity > 0 && <small className="text-[.68rem] font-semibold text-crimson">Subtotal Rp {formatPrice(unitPrice * quantity)}</small>}</span>
                              <div className="flex items-center gap-2">
                                <button className="grid size-8 place-items-center rounded-md border border-line bg-white text-muted disabled:cursor-not-allowed disabled:opacity-40" type="button" aria-label={`Kurangi ${vehicleGroup.name} ${typeLabel}`} disabled={quantity === 0} onClick={() => setVehicleTransmissionQuantity(vehicle, transmissionType, quantity - 1)}><Minus size={14} aria-hidden="true" /></button>
                                <output className="min-w-5 text-center text-[.78rem] font-bold text-ink" aria-label={`Jumlah ${typeLabel}`}>{quantity}</output>
                                <button className="grid size-8 place-items-center rounded-md border border-line bg-white text-muted disabled:cursor-not-allowed disabled:opacity-40" type="button" aria-label={`Tambah ${vehicleGroup.name} ${typeLabel}`} disabled={quantity >= available || selectedForVariant >= totalAvailableForVariant} onClick={() => setVehicleTransmissionQuantity(vehicle, transmissionType, quantity + 1)}><Plus size={14} aria-hidden="true" /></button>
                              </div>
                            </div>
                          )
                        }) : unallocatedUnits > 0 ? <span className="text-[.72rem] font-medium text-amber-800">{unallocatedUnits} unit tersedia, tetapi tipenya belum dialokasikan admin.</span> : <span className="text-[.72rem] font-medium text-slate-700">Tidak ada tipe unit yang tersedia pada jadwal ini.</span> : <span className="text-[.72rem] font-medium text-slate-700">Memeriksa tipe unit untuk jadwal ini...</span>}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <span className="text-[.79rem] text-[#94a3b8]">Pilih dari armada ↓</span>
              )}
              {formErrors.vehicles && <span className="text-[.62rem] text-red-500">{formErrors.vehicles}</span>}
            </div>

            <label className="col-span-6 flex items-start gap-2.5 text-[.7rem] leading-5 text-muted max-[900px]:col-span-3 max-[600px]:col-span-1">
              <input className="mt-1 size-4 shrink-0 accent-crimson" type="checkbox" name="privacy_consent" required />
              <span>Saya setuju data kontak dan perjalanan digunakan untuk memproses permintaan sewa ini sesuai <a className="font-semibold text-crimson underline" href="/syarat-ketentuan">syarat & kebijakan privasi</a>.</span>
            </label>

            {formErrors.booking && <p className="col-span-6 m-0 rounded-md bg-red-50 px-3 py-2.5 text-[.72rem] text-red-700 max-[900px]:col-span-3 max-[600px]:col-span-1" role="alert">{formErrors.booking}</p>}

            <button
              className="col-span-1 flex min-w-[137px] items-center justify-center gap-2 rounded-[5px] bg-crimson px-[18px] py-[14px] text-[.8rem] font-bold text-white transition-colors duration-200 hover:bg-crimson-deep max-[900px]:col-span-3 max-[600px]:col-span-1 max-[600px]:w-full"
              type={selectedVehicles.length > 0 ? 'submit' : 'button'}
              onClick={selectedVehicles.length > 0 ? undefined : () => selectedVehicleModels.length > 0 ? setFormErrors((errors) => ({ ...errors, vehicles: 'Pilih tipe transmisi dan jumlah unit.' })) : document.querySelector('#armada')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Search aria-hidden="true" size={17} />
              {selectedVehicles.length > 0 ? `Kirim ${selectedVehicles.reduce((total, vehicle) => total + vehicle.quantity, 0)} kendaraan` : selectedVehicleModels.length > 0 ? 'Pilih jumlah unit' : 'Pilih kendaraan'}
            </button>
          </form>
          {bookingConfirmation && <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-[.74rem] text-emerald-800" role="status">
            {bookingConfirmation.bookingCode && <p className="m-0 mb-1.5">Kode booking kamu: <strong className="select-all font-display text-[.9rem] tracking-wide text-emerald-900">{bookingConfirmation.bookingCode}</strong><span className="ml-1 text-[.68rem] text-emerald-700">(simpan untuk cek status)</span></p>}
            <div className="flex flex-wrap items-center justify-between gap-3"><span>Permintaan booking berhasil disimpan. <a className="font-bold underline" href="/cek-booking">Cek status booking</a> kapan saja.</span><a className="font-bold underline" href={bookingConfirmation.waUrl} target="_blank" rel="noreferrer">Lanjutkan ke WhatsApp</a></div>
          </div>}
          <div className="flex items-center gap-[7px] text-[.68rem] text-[#64748b] max-[600px]:items-start max-[600px]:text-[.62rem] max-[600px]:leading-[1.45]"><Check className="shrink-0 text-cyan" aria-hidden="true" size={14} /> Jadwal dan ketersediaan dikonfirmasi oleh admin setelah pemesanan.</div>
        </section>

        <section className={`mx-auto mt-[84px] w-full bg-slate-ice px-[6.4%] py-16 max-[900px]:px-[4%] max-[600px]:mt-[55px] max-[600px]:px-[18px] max-[600px]:py-[35px] ${scrollRevealClasses}`} id="armada" data-scroll-reveal data-reveal="hidden">
          <div className="flex items-end justify-between gap-[25px] max-[600px]:flex-col max-[600px]:items-start max-[600px]:gap-[17px]">
            <div><h2 className="m-0 font-display text-[clamp(1.8rem,3.2vw,2.8rem)] font-bold leading-[1.16] max-[600px]:text-[1.85rem]">Pilih kendaraan untuk perjalananmu</h2><p className="mt-[10px] text-[.88rem] text-muted max-[600px]:text-[.8rem]">Armada tersedia untuk perjalanan harian, keluarga, dan rombongan.</p></div>
            <div className="flex shrink-0 items-center max-[600px]:w-full"><CategorySelect id="fleet-category-options" ariaLabel="Filter kategori kendaraan" className="min-w-[190px] rounded-xl border border-line bg-white px-3.5 py-2.5 text-[.8rem] font-medium text-ink shadow-[0_4px_14px_rgba(15,23,42,.045)] outline-none transition-[border-color,box-shadow] duration-300 hover:border-cyan/50 hover:shadow-[0_6px_18px_rgba(15,23,42,.08)] focus:border-cyan focus:ring-4 focus:ring-cyan/10 max-[600px]:min-w-0 max-[600px]:flex-1" value={category} onChange={setCategory} /></div>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-x-9 gap-y-12 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1 max-[600px]:gap-[14px]" data-vehicle-transition={vehicleTransition}>
            {(!selectedDate || !selectedTime) && (
              <div className="col-span-3 rounded-lg border border-line bg-white px-5 py-8 text-center max-[900px]:col-span-2 max-[600px]:col-span-1" role="status">
                <p className="m-0 text-[.84rem] font-semibold text-ink">Pilih tanggal dan jam terlebih dahulu</p>
                <p className="mb-0 mt-1 text-[.76rem] text-muted">Armada yang tersedia akan ditampilkan sesuai jadwal sewa.</p>
              </div>
            )}
            {selectedDate && selectedTime && availabilityStatus === 'loading' && (
              <div className="col-span-3 flex items-center justify-center py-12 text-[.8rem] text-muted max-[900px]:col-span-2 max-[600px]:col-span-1" role="status">Memeriksa ketersediaan armada untuk jadwal ini...</div>
            )}
            {selectedDate && selectedTime && availabilityStatus === 'error' && (
              <div className="col-span-3 rounded-md bg-amber-50 px-5 py-8 text-center text-[.78rem] text-amber-800 max-[900px]:col-span-2 max-[600px]:col-span-1" role="alert">Ketersediaan jadwal belum bisa diperiksa. Ubah jadwal atau muat ulang halaman untuk mencoba lagi.</div>
            )}
            {vehiclesLoading && (
              <div className="col-span-3 flex items-center justify-center py-24 max-[900px]:col-span-2 max-[600px]:col-span-1">
                <div className="flex flex-col items-center gap-3">
                  <div className="size-8 animate-spin rounded-full border-2 border-line border-t-crimson" />
                  <span className="text-[.8rem] text-muted">Memuat armada...</span>
                </div>
              </div>
            )}
            {vehiclesError && (
              <div className="col-span-3 flex items-center justify-center py-24 max-[900px]:col-span-2 max-[600px]:col-span-1">
                <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-center">
                  <p className="text-[.85rem] font-semibold text-red-600">Gagal memuat data armada</p>
                  <p className="mt-1 text-[.75rem] text-red-400">{vehiclesError}</p>
                </div>
              </div>
            )}
            {selectedDate && selectedTime && availabilityStatus === 'ready' && !vehiclesLoading && !vehiclesError && windowVehicles.length === 0 && (
              <div className="col-span-3 rounded-lg border border-line bg-white px-5 py-8 text-center max-[900px]:col-span-2 max-[600px]:col-span-1" role="status">
                <p className="m-0 text-[.84rem] font-semibold text-ink">Belum ada armada yang tersedia</p>
                <p className="mb-0 mt-1 text-[.76rem] text-muted">Coba pilih jam atau tanggal sewa yang lain.</p>
              </div>
            )}
            {!vehiclesLoading && !vehiclesError && (!hasSelectedSchedule || availabilityStatus === 'ready') && visibleVehicleGroups.map((vehicleGroup, index) => {
              const vehicle = vehicleGroup.variants[0]
              const variants = vehicleGroup.variants
              const image = variants.find((variant) => variant.image)?.image
              const badge = variants.find((variant) => variant.badge)?.badge
              const allocatedVariants = variants.flatMap((variant) => getAllocatedTransmissionOptions(variant).map((transmissionType) => ({ vehicle: variant, transmissionType })))
              const variantLabels = [...new Set(allocatedVariants.map(({ vehicle: variant, transmissionType }) => getVehicleVariantLabel(variant, transmissionType)))]
              const transmissionDetails = [...new Set(allocatedVariants.map(({ vehicle: variant, transmissionType }) => variant.transmission_details ? `${getVehicleVariantLabel(variant, transmissionType)}: ${variant.transmission_details}` : '').filter(Boolean))]
              const unallocatedUnits = variants.reduce((total, variant) => {
                const totalAvailable = hasSelectedSchedule && availabilityStatus === 'ready'
                  ? getWindowRemaining(windowAvailability, variant) ?? 0
                  : Math.max(0, Number(variant.stock) || 0)
                const allocatedAvailable = getAllocatedTransmissionOptions(variant).reduce((subtotal, transmissionType) => subtotal + (
                  hasSelectedSchedule && availabilityStatus === 'ready'
                    ? getWindowRemaining(windowAvailability, variant, transmissionType) ?? 0
                    : Number(variant.transmission_stock?.[transmissionType]) || 0
                ), 0)
                return total + Math.max(0, totalAvailable - allocatedAvailable)
              }, 0)
              const modelPrice = Math.min(...variants.map((variant) => Math.round(parsePrice(variant.price) * hitungMultiplier(bookingMode, durasi))))
              const isSelected = selectedVehicleModelKeys.includes(vehicleGroup.key)
              const readyForWindow = hasSelectedSchedule && availabilityStatus === 'ready' && variants.some((variant) => isVehicleReadyForWindow(variant, windowAvailability))
              const canSelect = readyForWindow || isSelected
              return (
              <article className={`group min-w-0 cursor-pointer overflow-hidden border-b border-line bg-transparent pb-5 transition duration-200 hover:-translate-y-1 hover:border-crimson/40 ${isSelected ? 'border-crimson/60 ring-2 ring-crimson/20' : ''}`} style={{ '--vehicle-delay': `${Math.min(index * 100, 700)}ms` }} key={`${vehicleTransition === 'enter' ? 'enter' : 'stable'}-${vehicleGroup.key}`} onClick={(event) => handleVehicleCardClick(event, vehicleGroup)}>
                <div className="relative block h-[242px] overflow-hidden bg-transparent max-[600px]:h-[205px]">
                  {badge && (
                    <span className="absolute left-2 top-2 z-10 rounded-full bg-crimson px-2.5 py-1 text-[.6rem] font-bold uppercase tracking-[.07em] text-white shadow-sm">
                      {badge}
                    </span>
                  )}
                  {isSelected && (
                    <span className="absolute right-2 top-2 z-10 rounded-full bg-cyan px-2.5 py-1 text-[.6rem] font-bold text-white shadow-sm">✓ Dipilih</span>
                  )}
                  {image && <img className="size-full object-contain mix-blend-multiply" src={image} alt={vehicleGroup.name} loading="lazy" />}
                </div>
                <div className="px-1 pt-4">
                  <div className="flex items-center justify-between gap-3"><h3 className="m-0 font-display text-[1.18rem] font-bold text-ink">{vehicleGroup.name}</h3><span className="rounded-full bg-cyan/10 px-2.5 py-1 text-[.62rem] font-bold uppercase tracking-[.06em] text-[#0369a1]">{vehicle.category}</span></div>
                  <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[.65rem] font-semibold ${hasSelectedSchedule ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    <span className={`size-1.5 rounded-full ${hasSelectedSchedule ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />
                    {hasSelectedSchedule ? 'Tersedia di jadwal ini' : 'Pilih tanggal & jam untuk cek'}
                  </span>
                  <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 max-[600px]:gap-x-3">
                    <div className="flex min-w-0 items-center gap-[10px]"><UsersRound className="box-content shrink-0 rounded-[5px] bg-cyan/10 p-[5px] text-cyan" aria-hidden="true" size={17} /><span className="grid min-w-0 gap-[2px]"><small className="text-[.56rem] font-semibold tracking-[.03em] text-[#64748b]">TEMPAT DUDUK</small><strong className="truncate text-[.63rem] font-semibold text-muted">{vehicle.seats}</strong></span></div>
                    {variantLabels.length > 0 && <div className="flex min-w-0 items-center gap-[10px]"><Settings2 className="box-content shrink-0 rounded-[5px] bg-cyan/10 p-[5px] text-cyan" aria-hidden="true" size={17} /><span className="grid min-w-0 gap-[2px]"><small className="text-[.56rem] font-semibold tracking-[.03em] text-[#64748b]">VARIAN TERSEDIA</small><strong className="truncate text-[.63rem] font-semibold text-muted">{variantLabels.join(', ')}</strong>{transmissionDetails.length > 0 && <small className="truncate text-[.56rem] text-[#64748b]">{transmissionDetails.join(' · ')}</small>}</span></div>}
                    {unallocatedUnits > 0 && <div className="flex min-w-0 items-center gap-[10px]"><Fuel className="box-content shrink-0 rounded-[5px] bg-amber-100 p-[5px] text-amber-800" aria-hidden="true" size={17} /><span className="grid min-w-0 gap-[2px]"><small className="text-[.56rem] font-semibold tracking-[.03em] text-[#64748b]">TIPE UNIT</small><strong className="truncate text-[.63rem] font-semibold text-amber-900">Belum dialokasikan</strong><small className="text-[.56rem] text-slate-600">{unallocatedUnits} unit ready</small></span></div>}
                    <div className="flex min-w-0 items-center gap-[10px]"><Clock3 className="box-content shrink-0 rounded-[5px] bg-cyan/10 p-[5px] text-cyan" aria-hidden="true" size={17} /><span className="grid min-w-0 gap-[2px]"><small className="text-[.56rem] font-semibold tracking-[.03em] text-[#64748b]">DURASI SEWA</small><strong className="truncate text-[.63rem] font-semibold text-muted">{durasi} {bookingMode.unit}</strong></span></div>
                    <div className="flex min-w-0 items-center gap-[10px]"><UserRoundCheck className="box-content shrink-0 rounded-[5px] bg-cyan/10 p-[5px] text-cyan" aria-hidden="true" size={17} /><span className="grid min-w-0 gap-[2px]"><small className="text-[.56rem] font-semibold tracking-[.03em] text-[#64748b]">LAYANAN</small><strong className="truncate text-[.63rem] font-semibold text-muted">Supir tersedia</strong></span></div>
                    <div className="flex min-w-0 items-center gap-[10px]"><UsersRound className="box-content shrink-0 rounded-[5px] bg-cyan/10 p-[5px] text-cyan" aria-hidden="true" size={17} /><span className="grid min-w-0 gap-[2px]"><small className="text-[.56rem] font-semibold tracking-[.03em] text-[#64748b]">UNIT DI JADWAL INI</small><strong className="truncate text-[.63rem] font-semibold text-muted">{countWindowReadyUnits(allVehicles, availabilityStatus === 'ready' ? windowAvailability : null, vehicleGroup.name)} unit</strong></span></div>
                  </div>
                  <div className="mt-[17px] flex items-end justify-between gap-2 border-t border-line pt-[11px]">
                    <div>
                      <span className="text-[.68rem] text-[#64748b]">{variants.length > 1 ? 'Harga mulai' : 'Harga per unit'}</span>
                      <strong className="block text-[.89rem] text-crimson">Rp {formatPrice(modelPrice)}<small className="text-[.67rem] font-medium text-[#64748b]"> / {durasi} {bookingMode.unit}</small></strong>
                    </div>
                    <button className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-muted transition-colors hover:border-cyan/50 hover:text-cyan" type="button" title={`Detail ${vehicleGroup.name}`} aria-label={`Detail ${vehicleGroup.name}`} onClick={(event) => { event.stopPropagation(); setVehicleDetailGroup(vehicleGroup) }}><Eye size={16} aria-hidden="true" /></button>
                    <button type="button" disabled={!canSelect} onClick={(event) => { event.stopPropagation(); handleSelectVehicle(vehicleGroup) }} className={`shrink-0 rounded-lg px-4 py-2 text-[.75rem] font-bold transition-colors duration-200 ${!canSelect ? 'cursor-not-allowed bg-slate-100 text-slate-400' : isSelected ? 'bg-cyan text-white' : 'bg-crimson/10 text-crimson hover:bg-crimson hover:text-white'}`}>
                      {isSelected ? 'Batalkan' : 'Pilih mobil'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
          </div>
        </section>

        <section className={`mx-auto my-[88px] grid w-[min(1240px,87.2%)] grid-cols-[1fr_.92fr] items-center gap-14 max-[900px]:w-[92%] max-[900px]:gap-9 max-[700px]:grid-cols-1 max-[600px]:my-[58px] max-[600px]:gap-7 ${scrollRevealClasses}`} id="tentang" data-scroll-reveal data-reveal="hidden">
          <div className="py-4 max-[700px]:order-2">
            <span className="mb-3 inline-flex items-center gap-2 text-[.67rem] font-extrabold tracking-[.15em] text-crimson"><span className="h-px w-7 bg-crimson" />TENTANG KAMI</span>
            <h2 className="m-0 max-w-[600px] font-display text-[clamp(2rem,3.6vw,3.1rem)] font-bold leading-[1.1] tracking-[-.035em] max-[600px]:text-[1.9rem]">Partner perjalanan, bukan sekadar kendaraan.</h2>
            <p className="mt-5 max-w-[590px] text-[.88rem] leading-[1.8] text-muted">PT Khalisa Sumber Rezeki menyediakan layanan rental mobil untuk liburan, perjalanan bisnis, antar-jemput, dan rombongan — dengan pilihan pakai pengemudi atau lepas kunci sesuai kebutuhanmu.</p>
            <div className="mt-7 grid max-w-[540px] grid-cols-2 gap-3 max-[400px]:grid-cols-1"><div className="rounded-lg border border-line px-4 py-3.5"><span className="text-[.61rem] font-extrabold tracking-[.12em] text-cyan">01 / FLEKSIBEL</span><p className="mb-0 mt-1.5 text-[.75rem] leading-5 text-muted">Harian, antar jemput, hingga perjalanan panjang.</p></div><div className="rounded-lg border border-line px-4 py-3.5"><span className="text-[.61rem] font-extrabold tracking-[.12em] text-cyan">02 / PILIHAN LAYANAN</span><p className="mb-0 mt-1.5 text-[.75rem] leading-5 text-muted">Dengan pengemudi atau lepas kunci.</p></div></div>
          </div>
          <figure className="group relative m-0 min-h-[470px] overflow-hidden rounded-2xl bg-ink max-[700px]:order-1 max-[700px]:min-h-[360px] max-[600px]:min-h-[290px]">
            <img className="absolute inset-0 size-full object-cover object-[62%_center] transition-transform duration-700 group-hover:scale-[1.03]" src={heroBackground} alt="Armada PT Khalisa Sumber Rezeki di kawasan perkotaan" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220]/85 via-[#0b1220]/10 to-[#0b1220]/5" />
            <span className="absolute right-5 top-5 rounded-full border border-white/20 bg-[#0b1220]/55 px-3.5 py-2 text-[.65rem] font-semibold text-white backdrop-blur-sm">Jakarta Barat & sekitarnya</span>
            <figcaption className="absolute bottom-6 left-6 right-6 text-white max-[600px]:bottom-5 max-[600px]:left-5"><span className="text-[.62rem] font-extrabold tracking-[.15em] text-cyan">PT KHALISA SUMBER REZEKI</span><p className="mb-0 mt-2 font-display text-[1.35rem] font-bold">Siap menemani perjalananmu.</p></figcaption>
          </figure>
        </section>

        <section className={`mx-auto mb-[78px] mt-[88px] w-[min(1240px,87.2%)] max-[900px]:w-[92%] max-[600px]:mb-[54px] max-[600px]:mt-[58px] ${scrollRevealClasses}`} id="layanan" data-scroll-reveal data-reveal="hidden">
          <div className="mb-8 flex items-end justify-between gap-8 max-[700px]:mb-6 max-[700px]:block"><div><span className="mb-[10px] block text-[.67rem] font-extrabold tracking-[.15em] text-crimson">LAYANAN PT KHALISA SUMBER REZEKI</span><h2 className="m-0 max-w-[630px] font-display text-[clamp(1.8rem,3.2vw,2.65rem)] font-bold leading-[1.14] tracking-[-.025em] max-[600px]:text-[1.8rem]">Perjalanan terasa mudah sejak awal</h2></div><p className="mb-1 max-w-[330px] text-[.82rem] leading-6 text-muted max-[700px]:mt-3">Dukungan yang membuat setiap tahap perjalanan lebih nyaman dan jelas.</p></div>
          <div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[600px]:gap-3">{benefits.map((benefit) => <article className="group relative flex min-h-[205px] flex-col rounded-xl border border-line bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-cyan/50 hover:shadow-[0_16px_40px_rgba(15,23,42,.07)] max-[600px]:min-h-[190px] max-[600px]:p-4" key={benefit.number}><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-lg bg-cyan/10 font-display text-[.78rem] font-extrabold text-cyan">{benefit.number}</span><ArrowUpRight className="text-[#9aa6b5] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan" aria-hidden="true" size={17} /></div><h3 className="mb-2 mt-6 font-display text-[.98rem] font-bold text-ink max-[600px]:mt-5 max-[600px]:text-[.89rem]">{benefit.title}</h3><p className="m-0 text-[.76rem] leading-[1.7] text-muted max-[600px]:text-[.71rem]">{benefit.description}</p></article>)}</div>
        </section>

        <section className={`relative overflow-hidden bg-slate-ice px-[max(6.4%,calc((100%-1240px)/2))] py-[80px] max-[600px]:px-[18px] max-[600px]:py-[56px] ${scrollRevealClasses}`} id="kontak" data-scroll-reveal data-reveal="hidden">
          <div className="relative mx-auto max-w-[1240px]">
            <div className="grid grid-cols-[1fr_auto] items-center gap-12 max-[800px]:grid-cols-1 max-[800px]:gap-8">

              {/* Kiri — teks + tombol */}
              <div>
                <span className="mb-4 block text-[.68rem] font-extrabold tracking-[.15em] text-crimson">MULAI PERJALANANMU</span>
                <h2 className="m-0 font-display text-[clamp(1.9rem,3.8vw,2.8rem)] font-bold leading-[1.12] text-ink max-[600px]:text-[1.8rem]">Siap berangkat ke<br />tujuan berikutnya?</h2>
                <p className="mt-4 max-w-[480px] text-[.88rem] leading-[1.75] text-muted max-[600px]:text-[.82rem]">Ceritakan kebutuhan perjalananmu. Admin kami siap membantu memilihkan unit yang tepat.</p>
                <a className="mt-7 inline-flex items-center gap-2.5 rounded-lg bg-crimson px-7 py-[15px] text-[.84rem] font-bold text-white shadow-[0_8px_24px_rgba(225,29,72,.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-crimson-deep hover:shadow-[0_12px_28px_rgba(225,29,72,.32)] max-[600px]:w-full max-[600px]:justify-center" href="https://wa.me/6281380835156" target="_blank" rel="noreferrer">
                  Hubungi via WhatsApp
                  <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              </div>

              {/* Kanan — stats */}
              <div className="grid grid-cols-2 gap-3 max-[800px]:grid-cols-4 max-[500px]:grid-cols-2">
                {[
                  { value: '9+', label: 'Armada' },
                  { value: '24/7', label: 'Siap melayani' },
                  { value: 'Jakarta', label: '& sekitarnya' },
                  { value: '100%', label: 'Harga transparan' },
                ].map((stat) => (
                  <div className="rounded-xl border border-line bg-white px-4 py-5 text-center shadow-[0_2px_12px_rgba(15,23,42,.06)]" key={stat.label}>
                    <strong className="block font-display text-[1.5rem] font-extrabold text-ink">{stat.value}</strong>
                    <span className="mt-1 block text-[.64rem] font-semibold text-muted">{stat.label}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>
      </main>

      {vehicleDetailGroup && <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/65 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setVehicleDetailGroup(null) }}>
        <section className="max-h-[92dvh] w-full max-w-[900px] overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-[600px]:max-h-[90dvh]" role="dialog" aria-modal="true" aria-labelledby="vehicle-detail-title">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-4 max-[600px]:px-4 max-[600px]:py-3">
            <div><span className="text-[.64rem] font-bold uppercase text-muted">Detail armada</span><h2 className="m-0 mt-1 font-display text-[1.08rem] font-bold text-ink" id="vehicle-detail-title">{vehicleDetailGroup.name}</h2></div>
            <button className="grid size-9 place-items-center rounded-lg text-muted hover:bg-slate-ice" type="button" aria-label="Tutup detail kendaraan" onClick={() => setVehicleDetailGroup(null)}><X size={18} aria-hidden="true" /></button>
          </header>
          <div className="grid gap-5 p-5 sm:grid-cols-[.95fr_1.05fr] max-[600px]:gap-4 max-[600px]:p-4">
            <div className="grid content-start gap-3">
              <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-xl bg-slate-ice p-3">
                {vehicleDetailGroup.variants.find((variant) => variant.image)?.image
                  ? <img className="size-full object-contain" src={vehicleDetailGroup.variants.find((variant) => variant.image).image} alt={vehicleDetailGroup.name} />
                  : <CarFront className="text-slate-400" size={56} aria-hidden="true" />}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[.76rem]">
                <span className="rounded-lg bg-slate-ice px-3 py-2 text-slate-700">Kategori <strong className="ml-1 text-ink">{vehicleDetailGroup.variants[0].category}</strong></span>
                <span className="rounded-lg bg-slate-ice px-3 py-2 text-slate-700">Kursi <strong className="ml-1 text-ink">{vehicleDetailGroup.variants[0].seats}</strong></span>
                <span className="rounded-lg bg-slate-ice px-3 py-2 text-slate-700">Status <strong className="ml-1 text-ink">{vehicleDetailStatuses.join(' · ')}</strong></span>
                <span className="rounded-lg bg-slate-ice px-3 py-2 text-slate-700">Layanan <strong className="ml-1 text-ink">Supir</strong></span>
                {vehicleDetailBadge && <span className="col-span-2 rounded-lg bg-crimson/10 px-3 py-2 font-semibold text-crimson">{vehicleDetailBadge}</span>}
              </div>
            </div>
            <div className="grid content-start gap-4">
              <div className="flex items-start justify-between gap-3 border-b border-line pb-3"><div><span className="text-[.68rem] text-muted">Harga mulai</span><strong className="mt-1 block font-display text-[1.25rem] text-crimson">Rp {formatPrice(Math.min(...vehicleDetailGroup.variants.map((variant) => Math.round(parsePrice(variant.price) * hitungMultiplier(bookingMode, durasi)))))}<small className="text-[.72rem] font-medium text-muted"> / {durasi} {bookingMode.unit}</small></strong></div><span className="rounded-full bg-cyan/10 px-2.5 py-1 text-[.64rem] font-bold uppercase text-[#0369a1]">{vehicleDetailGroup.variants[0].category}</span></div>
              <div className="grid gap-2">
                <h3 className="m-0 font-display text-[.88rem] font-bold text-ink">Pilihan unit</h3>
                {detailVariants.map(({ vehicle, transmissionType, available, unallocated }) => {
                  const label = unallocated ? 'Tipe belum dialokasikan' : getVehicleVariantLabel(vehicle, transmissionType)
                  const unitPrice = Math.round(parsePrice(vehicle.price) * hitungMultiplier(bookingMode, durasi))
                  return <article className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5" key={`${vehicle.id}-${transmissionType ?? 'unallocated'}`}><div className="grid min-w-0 gap-1"><strong className={`text-[.76rem] ${unallocated ? 'text-amber-900' : 'text-ink'}`}>{label}</strong>{vehicle.transmission_details && <span className="truncate text-[.68rem] text-muted">{vehicle.transmission_details}</span>}<span className="text-[.68rem] text-slate-700">{hasSelectedSchedule && availabilityStatus === 'ready' ? `${available} unit tersedia di jadwal ini` : `${available} unit terdaftar`}</span></div><strong className="shrink-0 text-right text-[.76rem] text-crimson">Rp {formatPrice(unitPrice)}<small className="block text-[.64rem] font-medium text-muted">per unit</small></strong></article>
                })}
                {detailVariants.length === 0 && <p className="m-0 rounded-lg bg-slate-ice px-3 py-3 text-[.74rem] text-slate-700">Tidak ada unit untuk jadwal ini.</p>}
              </div>
            </div>
          </div>
          <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-white px-5 py-4 max-[600px]:px-4 max-[600px]:py-3">
            <button className="h-10 rounded-lg border border-line px-4 text-[.76rem] font-bold text-muted hover:bg-slate-ice" type="button" onClick={() => setVehicleDetailGroup(null)}>Kembali</button>
            <button className="h-10 rounded-lg bg-crimson px-4 text-[.76rem] font-bold text-white hover:bg-crimson-deep disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-700" type="button" disabled={!canChooseVehicleDetail} onClick={() => { handleSelectVehicle(vehicleDetailGroup); setVehicleDetailGroup(null) }}>{vehicleDetailIsSelected ? 'Sudah dipilih' : hasSelectedSchedule && availabilityStatus === 'ready' ? 'Pilih mobil' : 'Pilih jadwal dulu'}</button>
          </footer>
        </section>
      </div>}

      <footer className="public-site-footer bg-ink px-[max(6.4%,calc((100%-1240px)/2))] text-[#dce4e0]">
        <div className="grid grid-cols-[1.35fr_1fr_1fr_1.1fr] gap-10 border-b border-white/10 py-14 max-[900px]:grid-cols-2 max-[600px]:gap-8 max-[600px]:py-10">
          <div>
            <a className="inline-flex items-center gap-3" href="#beranda" aria-label="PT Khalisa Sumber Rezeki, kembali ke beranda">
              <span className="grid h-11 w-[58px] shrink-0 place-items-center overflow-hidden rounded-md bg-white p-0.5"><img className="h-full w-full object-contain" src={logo} alt="" /></span>
              <span className="grid gap-1"><strong className="font-display text-[.91rem] font-extrabold tracking-[.08em] text-white">PT KHALISA</strong><small className="text-[.6rem] font-semibold tracking-[.14em] text-cyan">SUMBER REZEKI</small></span>
            </a>
            <p className="mb-0 mt-4 max-w-[260px] text-[.76rem] leading-[1.8] text-[#aeb9c8]">Rental mobil terpercaya untuk perjalanan nyaman di Jakarta dan sekitarnya.</p>
          </div>

          <div className="grid content-start gap-3">
            <h2 className="m-0 mb-2 text-[.65rem] font-extrabold tracking-[.15em] text-white/40">JELAJAHI</h2>
            {navigationLinks.map((link) => (
              <a className="w-fit text-[.77rem] text-[#aeb9c8] transition-colors hover:text-cyan" href={link.href} key={`footer-${link.href}`}>
                {link.label}
              </a>
            ))}
          </div>

          <div className="grid content-start gap-3">
            <h2 className="m-0 mb-2 text-[.65rem] font-extrabold tracking-[.15em] text-white/40">HUBUNGI KAMI</h2>
            <a className="w-fit text-[.77rem] text-[#aeb9c8] transition-colors hover:text-cyan" href="tel:081380835156">0813 8083 5156</a>
            <a className="w-fit text-[.77rem] text-[#aeb9c8] transition-colors hover:text-cyan" href="tel:081277772320">0812 7777 2320</a>
            <span className="text-[.74rem] text-[#aeb9c8]/60">Setiap hari, 24 jam</span>
          </div>

          <div className="grid content-start gap-3">
            <h2 className="m-0 mb-2 text-[.65rem] font-extrabold tracking-[.15em] text-white/40">ALAMAT</h2>
            <p className="m-0 max-w-[230px] text-[.77rem] leading-[1.75] text-[#aeb9c8]">Jl. Gili Sampeng No.26, RT.9/RW.3, Kb. Jeruk, Kec. Kb. Jeruk, Kota Jakarta Barat, DKI Jakarta 11530</p>
            <a className="inline-flex w-fit items-center gap-1.5 text-[.72rem] font-medium text-cyan/70 transition-colors hover:text-cyan" href="https://maps.google.com/?q=Jl.+Gili+Sampeng+No.26+RT.9+RW.3+Kb.+Jeruk+Kec.+Kb.+Jeruk+Kota+Jakarta+Barat+DKI+Jakarta+11530" target="_blank" rel="noreferrer">
              Lihat di Google Maps <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="flex min-h-[56px] flex-wrap items-center justify-between gap-4 py-4 text-[.68rem] text-[#8290a3] max-[600px]:flex-col max-[600px]:items-start max-[600px]:gap-2">
          <span>© 2026 PT Khalisa Sumber Rezeki</span>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-1" aria-label="Tautan informasi">
            <a className="transition-colors hover:text-white" href="/cek-booking">Cek status booking</a>
            <a className="transition-colors hover:text-white" href="/syarat-ketentuan">Syarat & ketentuan</a>
          </nav>
          <a className="transition-colors hover:text-white" href="#beranda">Kembali ke atas ↑</a>
        </div>
      </footer>
      <a className="fixed bottom-[22px] right-[22px] z-20 grid size-16 place-items-center rounded-full transition-transform duration-200 hover:scale-110 focus-visible:outline focus-visible:outline-4 focus-visible:outline-cyan/50 max-[600px]:bottom-[14px] max-[600px]:right-[14px] max-[600px]:size-14" href="https://wa.me/6281380835156" target="_blank" rel="noreferrer" aria-label="Chat PT Khalisa Sumber Rezeki melalui WhatsApp"><img className="size-full object-contain drop-shadow-[0_5px_14px_rgba(34,197,94,.48)]" src={waLogo} alt="" /></a>
    </div>
  )
}

const pageTitles = {
  '/': 'PT Khalisa Sumber Rezeki | Rental Mobil Jakarta',
  '/cek-booking': 'Cek Status Booking | PT Khalisa Sumber Rezeki',
  '/syarat-ketentuan': 'Syarat & Ketentuan | PT Khalisa Sumber Rezeki',
  '/admin': 'Dashboard Admin | PT Khalisa Sumber Rezeki',
  '/adminlogin': 'Masuk Admin | PT Khalisa Sumber Rezeki',
}

function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'

  useEffect(() => {
    document.title = pageTitles[pathname] ?? pageTitles['/']
  }, [pathname])

  if (pathname === '/adminlogin') return <AdminLogin />
  if (pathname === '/admin') return <AdminDashboard />
  if (pathname === '/cek-booking') return <BookingTracker />
  if (pathname === '/syarat-ketentuan') return <LegalPage />
  return <RentalHome />
}

export default App
