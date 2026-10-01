import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, CalendarDays, CarFront, Check, Clock3, Download, LayoutDashboard, LogOut, MapPin, MessageSquare, Phone, Plus, RefreshCw, Search, ShieldCheck, Trash2, UserCheck, UserRound, Wallet, X } from 'lucide-react'
import logo from './assets/Logo-cropped.png'
import { adminReloadSessionStorageKey, supabase, supabaseAuthStorageKey } from './supabaseClient'
import { formatJakartaDateTime } from './bookingUtils'
import { formatPrice, getAvailableVehicleStock, getVehicleStock, isVehicleReady, parsePrice } from './vehicleUtils'

const emptyVehicleDraft = {
  name: '',
  price: '',
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
    if (otherBooking.id === booking.id || otherBooking.driver_id !== driverId || !['pending', 'confirmed'].includes(otherBooking.status)) return false
    const otherStartAt = Date.parse(otherBooking.start_at)
    const otherEndAt = Date.parse(otherBooking.end_at)
    return !Number.isFinite(otherStartAt) || !Number.isFinite(otherEndAt) || (otherStartAt < endAt && otherEndAt > startAt)
  })
}

const promoBadgeOptions = ['', 'Promo', 'Favorit', 'Terlaris', 'Unit baru', 'Harga spesial']
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
  drivers: { kicker: 'TIM PENGEMUDI', title: 'Kelola supir', description: 'Pantau ketersediaan, penugasan, dan status supir operasional.' },
  fleet: { kicker: 'KATALOG UNIT', title: 'Armada', description: 'Ikhtisar dan kelola armada aktif PT Khalisa Sumber Rezeki.' },
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

function StatCard({ label, value, tone = 'neutral' }) {
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

  return (
    <article className={`relative min-w-0 overflow-hidden rounded-2xl border border-line bg-white p-4 pl-5 shadow-[0_8px_24px_rgba(15,23,42,.04)] transition-shadow hover:shadow-[0_10px_28px_rgba(15,23,42,.08)] before:absolute before:inset-y-0 before:left-0 before:w-1 sm:p-5 sm:pl-6 ${barTone[tone]}`}>
      <span className={`block text-[.68rem] font-semibold ${labelTone[tone]}`}>{label}</span>
      <strong className={`mt-2 block break-words font-display text-[1.25rem] font-extrabold tracking-tight max-[520px]:text-[1.15rem] sm:text-[1.65rem] ${valueTone[tone]}`}>{value}</strong>
    </article>
  )
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

const fieldClass = 'h-10 rounded-xl border border-line bg-white px-3 text-[.8rem] text-ink outline-none transition-colors focus:border-cyan'
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

function BookingStatusSelect({ booking, onChange }) {
  const isActive = ['pending', 'confirmed'].includes(booking.status)
  const canComplete = booking.status === 'confirmed'

  return (
    <select
      className="h-9 w-full min-w-[148px] rounded-lg border border-line bg-white px-2.5 text-[.72rem] font-semibold text-ink outline-none focus:border-cyan"
      value={booking.status}
      disabled={!isActive}
      aria-label={`Status booking ${booking.customer_name}`}
      onChange={(event) => onChange(booking.id, event.target.value)}
    >
      <option value="pending" disabled={booking.status !== 'pending'}>Menunggu</option>
      <option value="confirmed" disabled={booking.status !== 'pending'}>Dikonfirmasi</option>
      <option value="rejected" disabled={!isActive}>Ditolak</option>
      <option value="completed" disabled={!canComplete}>Selesai</option>
      <option value="cancelled" disabled={!isActive}>Dibatalkan</option>
    </select>
  )
}

function CustomerContact({ booking }) {
  const waNumber = cleanPhone(booking.customer_phone)
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {waNumber && (
        <a className="inline-flex items-center gap-1 text-[.72rem] font-semibold text-emerald-700 hover:underline" href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">
          <MessageSquare size={12} aria-hidden="true" />
          WA
        </a>
      )}
      <a className="inline-flex items-center gap-1 text-[.72rem] text-muted hover:text-cyan" href={`tel:${booking.customer_phone}`}>
        <Phone size={12} aria-hidden="true" />
        {booking.customer_phone}
      </a>
    </div>
  )
}

function DriverAssignControls({ booking, bookings, drivers, onAssign }) {
  const assignedDriver = drivers.find((driver) => driver.id === booking.driver_id)
  const isWithDriver = booking.booking_mode?.toLowerCase().includes('supir')
  const isClosed = ['cancelled', 'rejected', 'completed'].includes(booking.status)

  let badgeTone = 'border-slate-200 bg-slate-100 text-slate-600'
  let dotTone = 'bg-slate-400'
  let badgeLabel = 'Lepas kunci'

  if (assignedDriver) {
    badgeTone = 'border-blue-200 bg-blue-50 text-blue-700'
    dotTone = 'bg-blue-500'
    badgeLabel = assignedDriver.name
  } else if (isClosed) {
    badgeTone = 'border-slate-200 bg-slate-100 text-slate-500'
    dotTone = 'bg-slate-400'
    badgeLabel = booking.status === 'cancelled' ? 'Dibatalkan' : booking.status === 'rejected' ? 'Ditolak' : 'Selesai'
  } else if (isWithDriver) {
    badgeTone = 'border-amber-200 bg-amber-50 text-amber-800'
    dotTone = 'bg-amber-500'
    badgeLabel = 'Perlu supir'
  }

  return (
    <div className="grid gap-1.5">
      <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[.65rem] font-bold ${badgeTone}`}>
        <span className={`size-1.5 rounded-full ${dotTone}`} />
        {badgeLabel}
      </span>
      <select
        className={`h-8 w-full rounded-lg border border-line px-2 text-[.72rem] outline-none focus:border-cyan ${
          isClosed ? 'cursor-not-allowed bg-slate-ice text-muted opacity-60' : 'bg-white text-ink'
        }`}
        value={booking.driver_id ?? ''}
        disabled={isClosed}
        aria-label={`Penugasan supir untuk ${booking.customer_name}`}
        onChange={(event) => onAssign(booking.id, event.target.value)}
      >
        <option value="">{assignedDriver ? '-- Lepas supir --' : isClosed ? '-- Tidak ditugaskan --' : '-- Pilih supir --'}</option>
        {drivers.map((driver) => (
          <option
            key={driver.id}
            value={driver.id}
            disabled={driver.id !== booking.driver_id && (!['available', 'on_duty'].includes(driver.status) || isDriverBookedForWindow(driver.id, booking, bookings))}
          >
            {driver.name} ({driverStatusLabels[driver.status] ?? driver.status})
          </option>
        ))}
      </select>
      {assignedDriver && !['cancelled', 'rejected'].includes(booking.status) && (
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
          <MessageSquare size={12} aria-hidden="true" />
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
              return (
                <article className="flex min-w-0 flex-col justify-between gap-3 rounded-lg border border-line px-4 py-3 sm:flex-row sm:items-center" key={admin.id}>
                  <div className="min-w-0">
                    <strong className="block break-all text-[.78rem] text-ink">{admin.email}</strong>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[.66rem] text-muted">
                      <span>{admin.is_primary ? 'Akun utama' : admin.is_current_user ? 'Sedang digunakan' : 'Admin'}</span>
                      <span aria-hidden="true">·</span>
                      <span>Dibuat {formatJakartaDateTime(admin.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <button className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-line px-3 text-[.72rem] font-bold text-muted transition-colors hover:border-red-200 hover:text-crimson disabled:cursor-not-allowed disabled:opacity-45" type="button" disabled={protectedAccount || deletingAdminId === admin.id} onClick={() => handleDeleteAdmin(admin)} aria-label={`Hapus akun ${admin.email}`}>
                    <Trash2 size={14} aria-hidden="true" />{deletingAdminId === admin.id ? 'Menghapus...' : protectedAccount ? 'Dilindungi' : 'Hapus'}
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
  const [activeTab, setActiveTab] = useState('finance')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches)
  const sidebarRef = useRef(null)
  const mobileLogoButtonRef = useRef(null)
  const [financePeriod, setFinancePeriod] = useState('month')
  const [financeStartDate, setFinanceStartDate] = useState('')
  const [financeEndDate, setFinanceEndDate] = useState('')
  const [financeTodayKey, setFinanceTodayKey] = useState('')
  const [financeMonthKey, setFinanceMonthKey] = useState('')
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [bookingSearch, setBookingSearch] = useState('')
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all')
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

  useEffect(() => () => {
    if (vehicleImage?.previewUrl) URL.revokeObjectURL(vehicleImage.previewUrl)
  }, [vehicleImage])

  useEffect(() => {
    const overlayOpen = mobileNavOpen || vehicleFormOpen || driverFormOpen
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      setMobileNavOpen(false)
      setVehicleFormOpen(false)
      setDriverFormOpen(false)
    }
    if (overlayOpen) document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [mobileNavOpen, vehicleFormOpen, driverFormOpen])

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
    const clearAdminSessionOnExit = () => {
      const session = window.localStorage.getItem(supabaseAuthStorageKey)
      if (session) window.sessionStorage.setItem(adminReloadSessionStorageKey, session)
      window.localStorage.removeItem(supabaseAuthStorageKey)
      window.localStorage.removeItem(`${supabaseAuthStorageKey}-code-verifier`)
    }
    const redirectIfRestoredAfterExit = (event) => {
      if (event.persisted && !window.localStorage.getItem(supabaseAuthStorageKey)) {
        window.location.replace('/adminlogin')
      }
    }

    window.addEventListener('pagehide', clearAdminSessionOnExit)
    window.addEventListener('pageshow', redirectIfRestoredAfterExit)
    return () => {
      window.removeEventListener('pagehide', clearAdminSessionOnExit)
      window.removeEventListener('pageshow', redirectIfRestoredAfterExit)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      try {
        if (import.meta.env.DEV && window.location.hash === '#ui-preview') {
          if (active) {
            const currentDate = new Date()
            setFinanceTodayKey(toDateKey(currentDate))
            setFinanceMonthKey(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`)
            setCheckingSession(false)
            setLoadingVehicles(false)
            setLoadingBookings(false)
            setLoadingDrivers(false)
            setCanManageAdmins(true)
          }
          return
        }

        const { error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) throw refreshError

        const { data, error } = await supabase.auth.getUser()
        if (error || data.user?.app_metadata?.role !== 'admin') {
          await supabase.auth.signOut()
          window.location.replace('/adminlogin')
          return
        }

        if (active) setCanManageAdmins(data.user.email?.trim().toLowerCase() === primaryAdminEmail)

        await supabase.rpc('expire_pending_booking_holds')

        const currentDate = new Date()
        const currentDateKey = toDateKey(currentDate)
        const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
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
        if (active && !requestsError) setBookings(requests ?? [])

        const { data: driverList, error: driversErrorRes } = await supabase
          .from('drivers')
          .select('*')
          .order('name', { ascending: true })

        if (active && driversErrorRes) setDriversError(driversErrorRes.message)
        if (active && !driversErrorRes) setDrivers(driverList ?? [])
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
      if (!requestsError) setBookings(requests ?? [])
      if (!driversLoadError) setDrivers(driverList ?? [])
    }

    loadDashboard()
    const refreshTimer = window.setInterval(refreshDashboardData, 60_000)
    return () => {
      active = false
      window.clearInterval(refreshTimer)
    }
  }, [])

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
    if (vehicleImage && !fileExtensions[vehicleImage.file.type]) {
      setVehicleFormError('Gunakan foto JPG, PNG, atau WebP.')
      return
    }
    if (vehicleImage && vehicleImage.file.size > 5 * 1024 * 1024) {
      setVehicleFormError('Ukuran foto maksimal 5 MB.')
      return
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
        const supabaseHost = new URL(import.meta.env.VITE_SUPABASE_URL).hostname
        if (imageHost !== supabaseHost) throw new Error('Foto kendaraan harus menggunakan URL Storage Supabase.')
      } catch (error) {
        setVehicleFormError(error.message || 'URL foto tidak valid.')
        return
      }
    }

    const transmissionStock = Object.fromEntries(vehicleDraft.transmission_options.map((type) => [type, Number(vehicleDraft.transmission_stock[type])]))
    const availableTransmissionOptions = vehicleDraft.transmission_options.filter((type) => transmissionStock[type] > 0)
    const payload = {
      name: vehicleDraft.name.trim(),
      price: vehicleDraft.price.trim(),
      category: vehicleDraft.category,
      transmission_options: availableTransmissionOptions,
      transmission_stock: transmissionStock,
      stock: Object.values(transmissionStock).reduce((total, quantity) => total + quantity, 0),
      transmission_details: vehicleDraft.transmission_details.trim() || null,
      powertrain_type: vehicleDraft.powertrain_type || null,
      seats: vehicleDraft.seats.trim(),
      badge: vehicleDraft.badge.trim() || null,
      image_url: imageUrl || null,
      status: vehicleDraft.status,
      sort_order: Number(vehicleDraft.sort_order),
      is_active: vehicleDraft.is_active,
    }

    setSavingVehicle(true)
    try {
      if (vehicleImage) {
        uploadedPath = `vehicles/${crypto.randomUUID()}.${fileExtensions[vehicleImage.file.type]}`
        const { error: uploadError } = await supabase.storage
          .from('vehicle-images')
          .upload(uploadedPath, vehicleImage.file, {
            cacheControl: '3600',
            contentType: vehicleImage.file.type,
          })
        if (uploadError) throw uploadError
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

  async function handleBookingStatusChange(bookingId, status) {
    setBookingActionError('')
    const currentBooking = bookings.find((booking) => booking.id === bookingId)
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

    const { data, error } = await supabase.rpc('update_booking_status', {
      p_booking_id: String(bookingId),
      p_status: status,
    })

    if (error) {
      if (error.message?.includes('TERMINAL_BOOKING')) {
        setBookingActionError('Booking yang sudah dibatalkan atau ditolak tidak dapat diaktifkan kembali.')
      } else if (error.message?.includes('BOOKING_RETURN_NOT_DUE')) {
        setBookingActionError('Booking hanya bisa diselesaikan setelah jadwal pengembalian lewat dan kendaraan diterima.')
      } else if (error.message?.includes('BOOKING_MUST_BE_CONFIRMED')) {
        setBookingActionError('Booking harus dikonfirmasi sebelum dapat diselesaikan.')
      } else if (status === 'confirmed' && error.code === 'P0001' && error.message?.includes('VEHICLE_UNAVAILABLE')) {
        setBookingActionError('Unit pada booking ini sudah dipakai booking confirmed lain di jadwal yang sama. Booking tetap menunggu; hubungi pemesan untuk memilih varian atau jadwal lain.')
      } else if (error.code === '42501' || error.message?.includes('permission denied')) {
        setBookingActionError('Izin update status belum aktif. Jalankan migration workflow booking di Supabase.')
      } else {
        setBookingActionError(`Gagal memperbarui status: ${error.message}`)
      }
      return
    }

    setBookings((current) => current.map((booking) => booking.id === bookingId ? data : booking))
    const { data: driverList, error: driversError } = await supabase.from('drivers').select('*').order('name', { ascending: true })
    if (driversError) setBookingActionError('Status booking tersimpan, tetapi daftar supir gagal diperbarui. Muat ulang dashboard.')
    else setDrivers(driverList ?? [])
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
    if (editingDriverId && driverDraft.status === 'available' && bookings.some(
      (booking) => booking.driver_id === editingDriverId && ['pending', 'confirmed'].includes(booking.status)
    )) {
      setDriverFormError('Supir masih memiliki booking aktif dan belum bisa ditandai tersedia.')
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
    if (newStatus === 'available' && bookings.some(
      (booking) => booking.driver_id === driverId && ['pending', 'confirmed'].includes(booking.status)
    )) {
      alert('Supir masih memiliki booking aktif dan belum bisa ditandai tersedia.')
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

  async function handleAssignDriver(bookingId, driverId) {
    setBookingActionError('')
    const targetDriverId = driverId || null
    const currentBooking = bookings.find((booking) => booking.id === bookingId)
    if (!currentBooking || !['pending', 'confirmed'].includes(currentBooking.status)) {
      setBookingActionError('Supir hanya dapat ditugaskan pada booking yang menunggu atau dikonfirmasi.')
      return
    }

    const { data, error } = await supabase.rpc('assign_booking_driver', {
      p_booking_id: String(bookingId),
      p_driver_id: targetDriverId,
    })

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

    setBookings((current) => current.map((booking) => (booking.id === bookingId ? data : booking)))
    const { data: driverList, error: driversError } = await supabase.from('drivers').select('*').order('name', { ascending: true })
    if (driversError) setBookingActionError('Supir berhasil ditugaskan, tetapi daftar supir gagal diperbarui. Muat ulang dashboard.')
    else setDrivers(driverList ?? [])
  }

  function handleExportBookingsCsv() {
    const header = ['ID Booking', 'Kode Booking', 'Dibuat', 'Pemesan', 'Telepon', 'Mulai', 'Selesai', 'Kendaraan', 'Layanan', 'Durasi', 'Status', 'Supir', 'Estimasi (Rp)']
    const escapeCell = (value) => {
      const text = String(value ?? '')
      return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
    }
    const rows = filteredBookings.map((booking) => [
      booking.id,
      booking.booking_code ?? '-',
      formatJakartaDateTime(booking.created_at),
      booking.customer_name,
      booking.customer_phone,
      formatJakartaDateTime(booking.start_at),
      formatJakartaDateTime(booking.end_at),
      (booking.vehicle_snapshot ?? []).map(formatBookedVehicle).join(' + '),
      booking.booking_mode,
      `${booking.duration} ${booking.duration_unit}`,
      bookingStatusLabels[booking.status] ?? booking.status,
      drivers.find((driver) => driver.id === booking.driver_id)?.name ?? '-',
      Number(booking.estimated_price) || 0,
    ])
    const csv = `﻿${[header, ...rows].map((row) => row.map(escapeCell).join(';')).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `booking-khalisa-${toDateKey(new Date())}.csv`
    link.click()
    URL.revokeObjectURL(url)
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
  const filteredBookings = bookings.filter((booking) => {
    const matchesStatus = bookingStatusFilter === 'all' || booking.status === bookingStatusFilter
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
    const startDate = booking.start_at?.slice(0, 10)
    return Boolean(startDate && financeDateRange.start && financeDateRange.end && financeDateRange.start <= financeDateRange.end && startDate >= financeDateRange.start && startDate <= financeDateRange.end)
  })
  const financeSummary = financialBookings.reduce((summary, booking) => {
    const amount = Number(booking.estimated_price)
    const estimate = Number.isFinite(amount) ? amount : 0
    if (['pending', 'confirmed', 'completed'].includes(booking.status)) summary.total += estimate
    if (booking.status in summary) summary[booking.status] += estimate
    return summary
  }, { total: 0, pending: 0, confirmed: 0, completed: 0 })
  const pendingBookings = bookings.filter((booking) => booking.status === 'pending').length
  const confirmedBookings = bookings.filter((booking) => booking.status === 'confirmed').length
  const completedBookings = bookings.filter((booking) => booking.status === 'completed').length
  const availableDrivers = drivers.filter((driver) => driver.status === 'available').length
  const bookingFilterCounts = {
    all: bookings.length,
    pending: pendingBookings,
    confirmed: confirmedBookings,
    completed: completedBookings,
    rejected: bookings.filter((booking) => booking.status === 'rejected').length,
    cancelled: bookings.filter((booking) => booking.status === 'cancelled').length,
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
              <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white p-1"><img className="size-full object-contain" src={logo} alt="" /></span>
              <span className="grid gap-1"><strong className="font-display text-[.8rem] font-extrabold tracking-[.08em]">PT KHALISA</strong><small className="text-[.55rem] font-semibold tracking-[.14em] text-cyan">ADMIN DASHBOARD</small></span>
            </a>
            <button className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/15 text-white/70 transition-colors hover:bg-white/10 hover:text-white md:hidden" type="button" onClick={() => setMobileNavOpen(false)} aria-label="Tutup sidebar"><X size={17} aria-hidden="true" /></button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Navigasi admin">
            <span className="mb-2 px-3 text-[.62rem] font-extrabold tracking-[.16em] text-white/35">MENU</span>
            <AdminNavButton active={activeTab === 'finance'} icon={<LayoutDashboard size={16} aria-hidden="true" />} label="Ikhtisar" onClick={() => { setActiveTab('finance'); setMobileNavOpen(false) }} />
            <AdminNavButton active={activeTab === 'bookings'} icon={<CalendarDays size={16} aria-hidden="true" />} label="Booking" count={bookings.length} alert={pendingBookings} onClick={() => { setActiveTab('bookings'); setMobileNavOpen(false) }} />
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
            <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white p-1"><img className="size-full object-contain" src={logo} alt="" /></span>
            <span className="grid min-w-0 gap-1"><strong className="truncate font-display text-[.72rem] font-extrabold tracking-[.06em]">PT KHALISA</strong><small className="truncate text-[.56rem] font-semibold tracking-[.12em] text-cyan">ADMIN</small></span>
          </button>
        </div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-6">
          <div className="min-w-0 flex-1">
            <span className="inline-block rounded-full bg-crimson/10 px-2.5 py-1 text-[.6rem] font-extrabold tracking-[.15em] text-crimson">{page.kicker}</span>
            <h1 className="mb-0 mt-2 font-display text-[1.7rem] font-extrabold tracking-tight max-[600px]:text-[1.4rem]">{page.title}</h1>
            <p className="mb-0 mt-1.5 max-w-[640px] text-[.84rem] leading-6 text-muted max-[600px]:text-[.78rem] max-[600px]:leading-[1.55]">{activeTab === 'finance' ? `${page.description} ${financeRangeLabel}.` : page.description}</p>
          </div>
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

        {activeTab === 'finance' && (
          <>
            <section className="mb-4 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1" aria-label="Ringkasan keuangan">
              <StatCard label="Total estimasi aktif" value={loadingBookings ? '—' : `Rp ${formatPrice(financeSummary.total)}`} tone="accent" />
              <StatCard label="Booking selesai" value={loadingBookings ? '—' : `Rp ${formatPrice(financeSummary.completed)}`} tone="success" />
              <StatCard label="Dikonfirmasi" value={loadingBookings ? '—' : `Rp ${formatPrice(financeSummary.confirmed)}`} tone="info" />
              <StatCard label="Menunggu konfirmasi" value={loadingBookings ? '—' : `Rp ${formatPrice(financeSummary.pending)}`} tone="warn" />
            </section>
            <section className="mb-6 grid grid-cols-3 gap-3 max-[900px]:grid-cols-2 max-[620px]:grid-cols-1" aria-label="Pintasan operasional">
              <QuickJump icon={<CalendarDays size={16} aria-hidden="true" />} label="Booking menunggu" value={loadingBookings ? '—' : `${pendingBookings} permintaan`} tone={pendingBookings > 0 ? 'warn' : 'neutral'} onClick={() => setActiveTab('bookings')} />
              <QuickJump icon={<CarFront size={16} aria-hidden="true" />} label="Unit ready" value={loadingVehicles ? '—' : `${readyUnits} / ${totalUnits} unit`} tone={readyUnits > 0 ? 'success' : 'neutral'} onClick={() => setActiveTab('fleet')} />
              <QuickJump icon={<UserCheck size={16} aria-hidden="true" />} label="Supir tersedia" value={loadingDrivers ? '—' : `${availableDrivers} orang`} tone={availableDrivers > 0 ? 'info' : 'neutral'} onClick={() => setActiveTab('drivers')} />
            </section>
          </>
        )}

        {activeTab === 'fleet' && <section className="mb-6 grid grid-cols-3 gap-3 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1" aria-label="Ringkasan armada">
          <StatCard label="Model kendaraan" value={loadingVehicles ? '—' : modelCount} />
          <StatCard label="Total unit aktif" value={loadingVehicles ? '—' : totalUnits} />
          <StatCard label="Unit ready" value={loadingVehicles ? '—' : readyUnits} tone="success" />
        </section>}

        {activeTab === 'bookings' && (
          <section className="mb-6 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[500px]:grid-cols-1" aria-label="Ringkasan booking">
            <StatCard label="Total permintaan" value={loadingBookings ? '—' : bookings.length} />
            <StatCard label="Menunggu" value={loadingBookings ? '—' : pendingBookings} tone="warn" />
            <StatCard label="Dikonfirmasi" value={loadingBookings ? '—' : confirmedBookings} tone="info" />
            <StatCard label="Selesai" value={loadingBookings ? '—' : completedBookings} tone="success" />
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
                  <table className="w-full min-w-[850px] border-collapse text-left">
                    <thead><tr className="bg-slate-ice text-[.65rem] font-bold uppercase tracking-[.07em] text-muted"><th className="px-5 py-3">Kendaraan</th><th className="px-5 py-3">Kategori</th><th className="px-5 py-3">Ready / total</th><th className="px-5 py-3">Ketersediaan</th><th className="px-5 py-3">Publikasi</th><th className="px-5 py-3 text-right">Harga / 12 jam</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead>
                    <tbody>
                      {filteredVehicles.map((vehicle) => (
                        <tr className="border-t border-line text-[.78rem] transition-colors hover:bg-slate-ice/80" key={vehicle.id}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              {vehicle.image_url ? <img className="size-11 shrink-0 rounded-lg border border-line object-cover" src={vehicle.image_url} alt="" /> : <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-slate-ice text-muted"><CarFront size={16} aria-hidden="true" /></span>}
                              <span className="grid min-w-0"><strong className="font-semibold text-ink">{vehicle.name}</strong>{formatVehicleTransmissionStock(vehicle) && <small className="text-[.64rem] text-muted">{formatVehicleTransmissionStock(vehicle)}</small>}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-muted">{vehicle.category}</td>
                          <td className="px-5 py-3.5 text-muted">{getAvailableVehicleStock(vehicle)} / {getVehicleStock(vehicle)} unit</td>
                          <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[.65rem] font-bold ${vehicle.status === 'maintenance' ? 'bg-slate-100 text-slate-600' : isVehicleReady(vehicle) ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}><span className={`size-1.5 rounded-full ${vehicle.status === 'maintenance' ? 'bg-slate-400' : isVehicleReady(vehicle) ? 'bg-emerald-500' : 'bg-amber-500'}`} />{vehicle.status === 'maintenance' ? 'Perawatan' : isVehicleReady(vehicle) ? 'Ready' : 'Booking'}</span></td>
                          <td className="px-5 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[.65rem] font-bold ${vehicle.is_active ? 'bg-cyan/10 text-[#0369a1]' : 'bg-slate-100 text-slate-500'}`}>{vehicle.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                          <td className="px-5 py-3.5 text-right font-semibold text-ink">Rp {formatPrice(parsePrice(vehicle.price))}</td>
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
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                        <strong className="text-[.82rem]">Rp {formatPrice(parsePrice(vehicle.price))}</strong>
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
                <div><h2 className="m-0 font-display text-[.98rem] font-bold">Inbox booking</h2><p className="mb-0 mt-1 text-[.7rem] text-muted">Permintaan dari formulir website.</p></div>
                <div className={toolbarClass}>
                  <SearchField value={bookingSearch} onChange={(event) => setBookingSearch(event.target.value)} placeholder="Cari pemesan/lokasi" label="Cari booking" />
                  <button className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-line bg-white px-3.5 text-[.76rem] font-bold text-muted transition-colors hover:border-cyan/40 hover:text-cyan disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={handleExportBookingsCsv} disabled={filteredBookings.length === 0}><Download size={16} aria-hidden="true" />Export CSV</button>
                </div>
              </div>
              <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5" role="tablist" aria-label="Filter status booking">
                {[
                  ['all', 'Semua'],
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
                <table className="w-full min-w-[1100px] border-collapse text-left">
                  <thead><tr className="bg-slate-ice text-[.65rem] font-bold uppercase tracking-[.07em] text-muted"><th className="px-5 py-3">Pemesan</th><th className="px-5 py-3">Jadwal</th><th className="px-5 py-3">Kendaraan</th><th className="px-5 py-3">Penjemputan</th><th className="px-5 py-3">Supir</th><th className="px-5 py-3 text-right">Estimasi</th><th className="px-5 py-3">Status</th></tr></thead>
                  <tbody>
                    {filteredBookings.map((booking) => (
                      <tr className={`border-t border-line align-top text-[.76rem] transition-colors hover:bg-slate-ice/80 ${booking.status === 'pending' ? 'bg-amber-50/50' : ''}`} key={booking.id}>
                        <td className="px-5 py-4">
                          <strong className="block text-ink">{booking.customer_name}</strong>
                          {booking.booking_code && <span className="mt-0.5 block font-display text-[.66rem] font-bold tracking-wide text-cyan">{booking.booking_code}</span>}
                          <div className="mt-1"><CustomerContact booking={booking} /></div>
                        </td>
                        <td className="px-5 py-4 text-muted"><span className="flex items-center gap-1.5"><CalendarDays size={13} aria-hidden="true" />{formatJakartaDateTime(booking.start_at, { day: 'numeric', month: 'numeric', year: 'numeric' })}</span><span className="mt-1 flex items-center gap-1.5"><Clock3 size={13} aria-hidden="true" />{formatJakartaDateTime(booking.start_at, { hour: '2-digit', minute: '2-digit', hour12: false })}–{formatJakartaDateTime(booking.end_at, { day: 'numeric', month: 'numeric', year: 'numeric' })} {formatJakartaDateTime(booking.end_at, { hour: '2-digit', minute: '2-digit', hour12: false })}</span></td>
                        <td className="max-w-[180px] px-5 py-4 text-muted">{(booking.vehicle_snapshot ?? []).map(formatBookedVehicle).join(', ')}<span className="mt-1 block text-[.67rem]">{booking.booking_mode} · {booking.duration} {booking.duration_unit}</span></td>
                        <td className="max-w-[200px] px-5 py-4 text-muted">
                          <span className="flex items-start gap-1.5">
                            <MapPin className="mt-0.5 shrink-0" size={13} aria-hidden="true" />
                            <span className="line-clamp-2" title={booking.pickup_address}>{booking.pickup_address}</span>
                          </span>
                        </td>
                        <td className="min-w-[210px] px-5 py-4">
                          <DriverAssignControls booking={booking} bookings={bookings} drivers={drivers} onAssign={handleAssignDriver} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-ink">Rp {formatPrice(Number(booking.estimated_price))}</td>
                        <td className="px-5 py-4">
                          <div className="grid gap-2">
                            <span className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[.65rem] font-bold ${bookingStatusTone(booking.status)}`}>{bookingStatusLabels[booking.status] ?? booking.status}</span>
                            <BookingStatusSelect booking={booking} onChange={handleBookingStatusChange} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 p-4 lg:hidden">
                {filteredBookings.map((booking) => (
                  <article className={`rounded-xl border p-4 ${booking.status === 'pending' ? 'border-amber-200 bg-amber-50/40' : 'border-line'}`} key={booking.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong className="block text-[.86rem] text-ink">{booking.customer_name}</strong>
                        {booking.booking_code && <span className="mt-0.5 block font-display text-[.66rem] font-bold tracking-wide text-cyan">{booking.booking_code}</span>}
                        <div className="mt-1"><CustomerContact booking={booking} /></div>
                      </div>
                      <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[.65rem] font-bold ${bookingStatusTone(booking.status)}`}>{bookingStatusLabels[booking.status] ?? booking.status}</span>
                    </div>
                    <p className="mb-0 mt-3 text-[.73rem] leading-5 text-muted">
                      {formatJakartaDateTime(booking.start_at, { day: 'numeric', month: 'numeric', year: 'numeric' })} {formatJakartaDateTime(booking.start_at, { hour: '2-digit', minute: '2-digit', hour12: false })}
                      {' – '}
                      {formatJakartaDateTime(booking.end_at, { day: 'numeric', month: 'numeric', year: 'numeric' })} {formatJakartaDateTime(booking.end_at, { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </p>
                    <p className="mb-0 mt-1 text-[.73rem] text-muted">{(booking.vehicle_snapshot ?? []).map(formatBookedVehicle).join(', ')} · {booking.booking_mode}</p>
                    <p className="mb-0 mt-1 line-clamp-2 text-[.73rem] text-muted">{booking.pickup_address}</p>
                    <div className="mt-3 grid gap-3 border-t border-line pt-3">
                      <DriverAssignControls booking={booking} bookings={bookings} drivers={drivers} onAssign={handleAssignDriver} />
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-[.82rem]">Rp {formatPrice(Number(booking.estimated_price))}</strong>
                      </div>
                      <BookingStatusSelect booking={booking} onChange={handleBookingStatusChange} />
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
                <table className="w-full min-w-[780px] border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-ice text-[.65rem] font-bold uppercase tracking-[.07em] text-muted">
                      <th className="px-5 py-3">Nama supir</th>
                      <th className="px-5 py-3">WhatsApp / Telepon</th>
                      <th className="px-5 py-3">SIM</th>
                      <th className="px-5 py-3">Catatan / Rute</th>
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
                          <a className="inline-flex items-center gap-1.5 font-medium hover:text-cyan" href={`https://wa.me/${cleanPhone(driver.phone)}`} target="_blank" rel="noopener noreferrer">
                            <Phone size={13} className="text-emerald-600" aria-hidden="true" />
                            {driver.phone}
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
                        <a className="mt-1 inline-flex items-center gap-1.5 text-[.72rem] text-muted" href={`https://wa.me/${cleanPhone(driver.phone)}`} target="_blank" rel="noopener noreferrer">{driver.phone}</a>
                      </div>
                      <span className="rounded-full bg-slate-ice px-2.5 py-0.5 text-[.65rem] font-bold text-slate-700">{driver.sim_type || 'SIM A'}</span>
                    </div>
                    {driver.notes && <p className="mb-0 mt-2 text-[.72rem] text-muted">{driver.notes}</p>}
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
        ) : (
          <section className={panelClass} aria-label="Ringkasan keuangan">
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
            ) : (
              <>
                <div className="border-b border-line px-5 py-4 max-[600px]:px-4">
                  <p className="m-0 text-[.7rem] leading-5 text-muted">Angka merupakan estimasi, bukan catatan pembayaran aktual. Booking ditolak atau dibatalkan tidak masuk total estimasi aktif.</p>
                </div>

                {financialBookings.length === 0 ? (
                  <EmptyState icon={<Wallet size={20} aria-hidden="true" />} title="Belum ada booking pada periode ini" description="Ubah rentang tanggal untuk melihat estimasi dari periode lain." />
                ) : (
                  <>
                  <div className="scrollbar-none hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[760px] border-collapse text-left">
                      <thead><tr className="bg-slate-ice text-[.65rem] font-bold uppercase tracking-[.07em] text-muted"><th className="px-5 py-3">Mulai sewa</th><th className="px-5 py-3">Pemesan</th><th className="px-5 py-3">Kendaraan</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Estimasi</th></tr></thead>
                      <tbody>
                        {financialBookings.map((booking) => (
                          <tr className="border-t border-line text-[.76rem] transition-colors hover:bg-slate-ice/80" key={booking.id}>
                            <td className="whitespace-nowrap px-5 py-3.5 text-muted">{formatJakartaDateTime(booking.start_at, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td className="px-5 py-3.5 font-semibold text-ink">{booking.customer_name}</td>
                            <td className="max-w-[220px] px-5 py-3.5 text-muted">{(booking.vehicle_snapshot ?? []).map(formatBookedVehicle).join(', ')}</td>
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
              </>
            )}
          </section>
        )}
          </div>
        </main>

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
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Harga / 12 jam</span><input className={fieldClass} required maxLength={24} value={vehicleDraft.price} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, price: event.target.value }))} placeholder="1.100.000" /></label>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Tempat duduk</span><input className={fieldClass} required maxLength={40} value={vehicleDraft.seats} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, seats: event.target.value }))} placeholder="6 kursi" /></label>
            <div className="grid gap-2 rounded-lg border border-line p-3"><span className="text-[.8rem] font-bold text-ink">Jumlah unit per transmisi</span>{vehicleDraft.transmission_options.map((type) => <label className="grid grid-cols-[1fr_100px] items-center gap-3 text-[.8rem] font-medium text-slate-900" key={type}><span>{type === 'automatic' ? 'Matic' : 'Manual'}</span><input className={fieldClass} type="number" min="0" step="1" value={vehicleDraft.transmission_stock[type] ?? 0} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, transmission_stock: { ...draft.transmission_stock, [type]: event.target.value } }))} /></label>)}<span className="text-[.78rem] font-semibold text-slate-800">Total baru: {vehicleDraft.transmission_options.reduce((total, type) => total + (Number(vehicleDraft.transmission_stock[type]) || 0), 0)} unit</span>{vehicleDraft.existing_stock > 0 && <span className="text-[.76rem] font-medium leading-5 text-slate-700">Stok lama {vehicleDraft.existing_stock} unit · belum dialokasikan {Math.max(0, vehicleDraft.existing_stock - vehicleDraft.transmission_options.reduce((total, type) => total + (Number(vehicleDraft.transmission_stock[type]) || 0), 0))} unit</span>}</div>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Status unit</span><select className={fieldClass} value={vehicleDraft.status} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, status: event.target.value }))}><option value="ready">Ready</option><option value="booking">Booking</option><option value="maintenance">Perawatan</option></select></label>
            <div className="grid gap-1.5">
              <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Label promosi</span><select className={fieldClass} value={customBadge ? '__custom' : vehicleDraft.badge} onChange={(event) => {
                if (event.target.value === '__custom') {
                  setCustomBadge(true)
                  setVehicleDraft((draft) => ({ ...draft, badge: promoBadgeOptions.includes(draft.badge) ? '' : draft.badge }))
                } else {
                  setCustomBadge(false)
                  setVehicleDraft((draft) => ({ ...draft, badge: event.target.value }))
                }
              }}><option value="">Tanpa label</option><option value="Promo">Promo</option><option value="Favorit">Favorit</option><option value="Terlaris">Terlaris</option><option value="Unit baru">Unit baru</option><option value="Harga spesial">Harga spesial</option><option value="__custom">Tulis sendiri</option></select></label>
              {customBadge && <input className={fieldClass} maxLength={40} value={vehicleDraft.badge} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, badge: event.target.value }))} placeholder="Contoh: Paket Lebaran" aria-label="Teks label promosi kustom" />}
            </div>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Urutan tampil</span><input className={fieldClass} type="number" min="0" step="1" value={vehicleDraft.sort_order} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, sort_order: event.target.value }))} /></label>
            <div className="col-span-2 grid gap-3 max-[520px]:col-span-1">
              <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Foto kendaraan</span><input className="block w-full rounded-xl border border-line px-3 py-2 text-[.76rem] file:mr-3 file:rounded-lg file:border-0 file:bg-slate-ice file:px-3 file:py-1.5 file:text-[.72rem] file:font-bold" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) setVehicleImage({ file, previewUrl: URL.createObjectURL(file) })
              }} /></label>
              {(vehicleImage?.previewUrl || vehicleDraft.image_url) && <img className="h-36 w-full rounded-xl border border-line bg-slate-ice object-contain p-2" src={vehicleImage?.previewUrl ?? vehicleDraft.image_url} alt="Pratinjau foto kendaraan" />}
              <span className="text-[.74rem] font-medium text-slate-700">JPG, PNG, atau WebP. Maksimal 5 MB. Foto lama dipertahankan jika tidak memilih foto baru.</span>
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
    </div>
  )
}

export default AdminDashboard
