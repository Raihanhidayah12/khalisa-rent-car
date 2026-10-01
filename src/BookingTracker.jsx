import { useState } from 'react'
import { ArrowLeft, CalendarDays, CarFront, Hash, MapPin, MessageSquare, Search, Wallet } from 'lucide-react'
import logo from './assets/Logo-cropped.png'
import { supabase } from './supabaseClient'
import { formatPrice } from './vehicleUtils'
import { formatJakartaDateTime, maskPickupAddress } from './bookingUtils'

const statusLabels = {
  pending: 'Menunggu konfirmasi',
  confirmed: 'Dikonfirmasi',
  completed: 'Selesai',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
}
const statusTones = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  confirmed: 'border-sky-200 bg-sky-50 text-sky-800',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
}
const statusNotes = {
  pending: 'Permintaan sudah masuk dan sedang menunggu konfirmasi admin. Mohon tunggu sebentar, jadwal dan unit akan segera dikunci.',
  confirmed: 'Booking sudah dikonfirmasi admin. Unit dan jadwal sudah dikunci untuk tanggal tersebut.',
  completed: 'Sewa selesai. Terima kasih sudah bepergian bersama PT Khalisa Sumber Rezeki.',
  rejected: 'Permintaan ini belum bisa kami terima. Hubungi admin untuk alternatif unit atau jadwal lain.',
  cancelled: 'Permintaan ini dibatalkan dan slot kendaraan sudah dilepas kembali.',
}

function normalizePhoneDigits(value) {
  const digits = String(value).replace(/\D/g, '')
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  if (digits.startsWith('8')) return `62${digits}`
  return digits
}

function normalizeCode(value) {
  let code = String(value).trim().toUpperCase().replace(/\s+/g, '')
  if (code && !code.startsWith('KHS-')) code = `KHS-${code.replace(/^KHS/, '')}`
  return code
}

function formatDateTime(value) {
  const date = formatJakartaDateTime(value, { day: 'numeric', month: 'short', year: 'numeric' })
  const time = formatJakartaDateTime(value, { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${date} · ${time}`
}

function formatBookedVehicle(vehicle) {
  const transmission = vehicle.transmission_type === 'automatic' ? 'Matic' : vehicle.transmission_type === 'manual' ? 'Manual' : ''
  const powertrain = { gasoline: 'Bensin', hybrid: 'Hybrid', ev_phev: 'EV / PHEV' }[vehicle.powertrain_type] ?? ''
  const quantity = Number(vehicle.quantity) || 1
  const variant = [transmission, powertrain].filter(Boolean).join(' · ')
  return `${vehicle.name}${variant ? ` (${variant})` : ''}${quantity > 1 ? ` x${quantity}` : ''}`
}

function BookingCard({ booking }) {
  const vehicles = (booking.vehicle_snapshot ?? []).map(formatBookedVehicle).join(', ')
  const area = maskPickupAddress(booking.pickup_address)
  const statusTone = statusTones[booking.status] ?? statusTones.cancelled
  const submittedAt = formatDateTime(booking.created_at)
  const bookingTime = `${formatDateTime(booking.start_at)} – ${formatDateTime(booking.end_at)}`

  return (
    <article className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_12px_34px_rgba(15,23,42,.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <span className="block text-[.62rem] font-bold tracking-[.12em] text-muted">KODE BOOKING</span>
          <strong className="mt-1 block break-all font-display text-[1rem] font-extrabold text-ink">{booking.booking_code ?? '—'}</strong>
          <span className="mt-1 block text-[.68rem] text-muted">Diajukan {submittedAt}</span>
        </div>
        <span className={`inline-flex shrink-0 rounded-full border px-3 py-1.5 text-[.68rem] font-bold ${statusTone}`}>
          {statusLabels[booking.status] ?? booking.status}
        </span>
      </div>
      <div className="grid gap-x-6 sm:grid-cols-2">
        <div className="flex min-w-0 items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
          <CalendarDays className="mt-0.5 shrink-0 text-cyan" size={17} aria-hidden="true" />
          <div className="min-w-0">
            <span className="block text-[.61rem] font-bold tracking-[.1em] text-muted">JADWAL SEWA</span>
            <p className="mb-0 mt-1 text-[.78rem] leading-5 text-ink">{bookingTime}</p>
            <p className="mb-0 mt-1 text-[.7rem] text-muted">{booking.booking_mode} · {booking.duration} {booking.duration_unit}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
          <CarFront className="mt-0.5 shrink-0 text-cyan" size={17} aria-hidden="true" />
          <div className="min-w-0">
            <span className="block text-[.61rem] font-bold tracking-[.1em] text-muted">KENDARAAN</span>
            <p className="mb-0 mt-1 break-words text-[.78rem] leading-5 text-ink">{vehicles || '—'}</p>
          </div>
        </div>
        {area && (
          <div className="flex min-w-0 items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
            <MapPin className="mt-0.5 shrink-0 text-cyan" size={17} aria-hidden="true" />
            <div className="min-w-0">
              <span className="block text-[.61rem] font-bold tracking-[.1em] text-muted">PENJEMPUTAN</span>
              <p className="mb-0 mt-1 break-words text-[.78rem] leading-5 text-ink">{area}</p>
            </div>
          </div>
        )}
        <div className="flex min-w-0 items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
          <Wallet className="mt-0.5 shrink-0 text-cyan" size={17} aria-hidden="true" />
          <div className="min-w-0">
            <span className="block text-[.61rem] font-bold tracking-[.1em] text-muted">ESTIMASI BIAYA</span>
            <p className="mb-0 mt-1 font-display text-[.9rem] font-extrabold text-ink">Rp {formatPrice(Number(booking.estimated_price) || 0)}</p>
          </div>
        </div>
      </div>
      <p className="m-0 bg-slate-ice px-5 py-4 text-[.75rem] leading-6 text-muted sm:px-6">{statusNotes[booking.status] ?? 'Hubungi admin untuk informasi terbaru seputar booking ini.'}</p>
    </article>
  )
}

function BookingTracker() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLookup(event) {
    event.preventDefault()
    const digits = normalizePhoneDigits(phone)
    const bookingCode = normalizeCode(code)
    if (digits.length < 9) {
      setError('Masukkan nomor WhatsApp yang dipakai saat memesan, contoh: 08123456789.')
      return
    }
    if (bookingCode.replace(/\D/g, '').length < 6) {
      setError('Masukkan kode booking (contoh: KHS-XXXXXX) yang diterima setelah memesan.')
      return
    }

    setLoading(true)
    setError('')
    try {
      let rows = null
      const { data, error: rpcError } = await supabase.rpc('lookup_bookings_by_phone', { phone_digits: digits, code: bookingCode })
      if (!rpcError) {
        rows = data ?? []
      } else {
        const { data: fallback, error: fallbackError } = await supabase
          .from('booking_requests')
          .select('id,booking_code,created_at,status,start_at,end_at,booking_mode,duration,duration_unit,vehicle_snapshot,estimated_price,pickup_address')
          .eq('booking_code', bookingCode)
          .or(`customer_phone.eq.+${digits},customer_phone.eq.${digits}`)
          .order('created_at', { ascending: false })
        if (fallbackError) throw fallbackError
        rows = fallback ?? []
      }
      setResults(rows)
      setSearched(true)
    } catch {
      setError('Gagal memeriksa booking. Coba lagi atau hubungi admin melalui WhatsApp.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-screen flex-col bg-slate-ice text-ink">
      <header className="public-site-header sticky top-[14px] z-30 mx-auto mt-[14px] flex min-h-[76px] w-[min(1320px,calc(100%-48px))] items-center justify-between gap-7 rounded-[12px] border border-white/15 bg-ink/90 px-7 shadow-[0_14px_40px_rgba(15,23,42,.28)] backdrop-blur-xl max-[900px]:px-[4%] max-[760px]:w-[calc(100%-32px)] max-[760px]:gap-x-4 max-[760px]:px-4 max-[600px]:mt-3 max-[600px]:w-[calc(100%-24px)] max-[600px]:gap-2 max-[600px]:rounded-[10px] max-[600px]:py-[10px] max-[360px]:w-[calc(100%-16px)] max-[360px]:gap-x-2 max-[360px]:px-3">
        <a className="inline-flex shrink-0 items-center gap-3 max-[760px]:gap-2" href="/" aria-label="PT Khalisa Sumber Rezeki, beranda">
          <span className="grid h-11 w-[58px] shrink-0 place-items-center overflow-hidden rounded-md bg-white p-0.5"><img className="h-full w-full object-contain" src={logo} alt="" /></span>
          <span className="grid gap-1 max-[600px]:gap-0.5"><strong className="font-display text-[.91rem] font-extrabold tracking-[.08em] text-white max-[760px]:text-[.82rem] max-[600px]:text-[.74rem] max-[360px]:text-[.68rem]">PT KHALISA</strong><small className="text-[.6rem] font-semibold tracking-[.14em] text-cyan max-[760px]:text-[.55rem] max-[600px]:text-[.5rem] max-[360px]:text-[.46rem]">SUMBER REZEKI</small></span>
          </a>
        <nav className="flex shrink-0 items-center gap-5 text-[.74rem] font-semibold text-white/80 max-[600px]:gap-3" aria-label="Navigasi halaman">
          <a className="inline-flex items-center gap-1.5 transition-colors hover:text-cyan" href="/"><ArrowLeft size={14} aria-hidden="true" /><span className="max-[420px]:hidden">Beranda</span></a>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[900px] flex-1 px-5 py-8 sm:px-7 sm:py-12">
        <div className="mb-7 max-w-[660px] sm:mb-9">
          <span className="inline-flex items-center gap-2 text-[.65rem] font-extrabold tracking-[.14em] text-crimson"><span className="h-px w-7 bg-crimson" />LACAK PESANAN</span>
          <h1 className="mb-0 mt-3 font-display text-[2.2rem] font-extrabold leading-tight text-ink max-[600px]:text-[1.8rem]">Cek status booking</h1>
          <p className="mb-0 mt-3 text-[.86rem] leading-6 text-muted">Masukkan nomor WhatsApp dan kode booking untuk melihat status terbaru pesananmu.</p>
        </div>

        <form className="grid gap-3 rounded-xl border border-line bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,.05)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end sm:gap-3 sm:p-5" onSubmit={handleLookup}>
            <label className="grid min-w-0 gap-1.5">
              <span className="text-[.68rem] font-bold text-ink">Nomor WhatsApp</span>
              <span className="flex h-11 min-w-0 items-center gap-2 rounded-lg border border-line bg-slate-ice/70 px-3 transition-colors focus-within:border-cyan">
              <Search className="shrink-0 text-muted" size={15} aria-hidden="true" />
              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-[.8rem] outline-none placeholder:text-[#94a3b8]"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Nomor WhatsApp: 08123456789"
                aria-label="Nomor WhatsApp pemesan"
              />
              </span>
            </label>
            <label className="grid min-w-0 gap-1.5">
              <span className="text-[.68rem] font-bold text-ink">Kode booking</span>
              <span className="flex h-11 min-w-0 items-center gap-2 rounded-lg border border-line bg-slate-ice/70 px-3 transition-colors focus-within:border-cyan">
              <Hash className="shrink-0 text-muted" size={15} aria-hidden="true" />
              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-[.8rem] uppercase tracking-wide outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-[#94a3b8]"
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Kode booking: KHS-XXXXXX"
                aria-label="Kode booking"
              />
              </span>
            </label>
          <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-crimson px-5 text-[.78rem] font-bold text-white transition-colors hover:bg-crimson-deep disabled:cursor-wait disabled:opacity-60 sm:w-auto" type="submit" disabled={loading}>
            <Search size={15} aria-hidden="true" />{loading ? 'Memeriksa...' : 'Cek status'}
          </button>
        </form>

        {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[.76rem] text-red-700" role="alert">{error}</p>}

        {searched && !error && (
          results.length > 0 ? (
            <div className="mt-8 grid gap-4" role="status">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                <h2 className="m-0 font-display text-[1.1rem] font-bold">Hasil pencarian</h2>
                <span className="text-[.72rem] text-muted">{results.length} booking ditemukan</span>
              </div>
              {results.map((booking) => <BookingCard booking={booking} key={booking.id} />)}
              <p className="m-0 text-[.74rem] text-muted">Ada pertanyaan soal booking ini? <a className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline" href="https://wa.me/6281380835156" target="_blank" rel="noreferrer"><MessageSquare size={13} aria-hidden="true" />Chat admin via WhatsApp</a></p>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-line bg-white px-5 py-10 text-center shadow-[0_8px_24px_rgba(15,23,42,.04)]" role="status">
              <p className="m-0 text-[.84rem] font-semibold text-ink">Booking tidak ditemukan</p>
              <p className="mx-auto mb-0 mt-2 max-w-[380px] text-[.76rem] leading-5 text-muted">Tidak ada booking yang cocok dengan nomor dan kode ini. Pastikan keduanya sama persis dengan data saat memesan, atau ajukan pemesanan baru di halaman utama.</p>
              <a className="mt-4 inline-flex h-10 items-center rounded-xl bg-crimson px-4 text-[.76rem] font-bold text-white transition-colors hover:bg-crimson-deep" href="/">Ajukan booking</a>
            </div>
          )
        )}
      </main>

      <footer className="border-t border-white/10 bg-ink">
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-2 px-5 py-4 text-[.68rem] text-[#cbd5e1] sm:px-7">
          <span>© 2026 PT Khalisa Sumber Rezeki</span>
          <a className="transition-colors hover:text-cyan" href="/syarat-ketentuan">Syarat & ketentuan</a>
        </div>
      </footer>
    </div>
  )
}

export default BookingTracker
