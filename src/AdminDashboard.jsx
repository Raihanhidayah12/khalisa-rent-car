import { useEffect, useState } from 'react'
import { ArrowUpRight, CalendarDays, CarFront, Clock3, LogOut, Plus, Search, UserRound, X } from 'lucide-react'
import logo from './assets/Logo-cropped.png'
import { supabase } from './supabaseClient'
import { formatPrice, getAvailableVehicleStock, getVehicleStock, isVehicleReady, parsePrice } from './vehicleUtils'

const emptyVehicleDraft = {
  name: '',
  price: '',
  category: 'MPV',
  seats: '',
  badge: '',
  image_url: '',
  stock: 1,
  status: 'ready',
  sort_order: 0,
  is_active: true,
}
const promoBadgeOptions = ['', 'Promo', 'Favorit', 'Terlaris', 'Unit baru', 'Harga spesial']

function AdminDashboard() {
  const [adminEmail, setAdminEmail] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const [vehicles, setVehicles] = useState([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [vehiclesError, setVehiclesError] = useState('')
  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [bookingsError, setBookingsError] = useState('')
  const [activeTab, setActiveTab] = useState('fleet')
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [bookingSearch, setBookingSearch] = useState('')
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all')
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false)
  const [editingVehicleId, setEditingVehicleId] = useState(null)
  const [vehicleDraft, setVehicleDraft] = useState(emptyVehicleDraft)
  const [customBadge, setCustomBadge] = useState(false)
  const [vehicleImage, setVehicleImage] = useState(null)
  const [savingVehicle, setSavingVehicle] = useState(false)
  const [vehicleFormError, setVehicleFormError] = useState('')

  useEffect(() => () => {
    if (vehicleImage?.previewUrl) URL.revokeObjectURL(vehicleImage.previewUrl)
  }, [vehicleImage])

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      try {
        const { error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) throw refreshError

        const { data, error } = await supabase.auth.getUser()
        if (error || data.user?.app_metadata?.role !== 'admin') {
          await supabase.auth.signOut()
          window.location.replace('/adminlogin')
          return
        }

        await supabase.rpc('expire_pending_booking_holds')

        if (active) {
          setAdminEmail(data.user.email ?? '')
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
      } catch (error) {
        if (active) setVehiclesError(error.message || 'Gagal memuat data armada.')
      } finally {
        if (active) {
          setCheckingSession(false)
          setLoadingVehicles(false)
          setLoadingBookings(false)
        }
      }
    }

    async function refreshDashboardData() {
      const { error: expiryError } = await supabase.rpc('expire_pending_booking_holds')
      if (expiryError) return

      const [{ data: fleet, error: fleetError }, { data: requests, error: requestsError }] = await Promise.all([
        supabase.from('vehicles').select('*').order('sort_order', { ascending: true }),
        supabase.from('booking_requests').select('*').order('created_at', { ascending: false }),
      ])

      if (!active) return
      if (!fleetError) setVehicles(fleet ?? [])
      if (!requestsError) setBookings(requests ?? [])
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
    setVehicleDraft(vehicle ? {
      name: vehicle.name ?? '',
      price: vehicle.price ?? '',
      category: vehicle.category ?? 'MPV',
      seats: vehicle.seats ?? '',
      badge: vehicle.badge ?? '',
      image_url: vehicle.image_url ?? '',
      stock: getVehicleStock(vehicle),
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

    const payload = {
      name: vehicleDraft.name.trim(),
      price: vehicleDraft.price.trim(),
      category: vehicleDraft.category,
      seats: vehicleDraft.seats.trim(),
      badge: vehicleDraft.badge.trim() || null,
      image_url: imageUrl || null,
      stock: Number(vehicleDraft.stock),
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
    setBookingsError('')
    const { data, error } = await supabase
      .from('booking_requests')
      .update({ status })
      .eq('id', bookingId)
      .select('*')
      .single()

    if (error) {
      setBookingsError(error.message)
      return
    }

    setBookings((current) => current.map((booking) => booking.id === bookingId ? data : booking))
    const { data: fleet, error: fleetError } = await supabase
      .from('vehicles')
      .select('*')
      .order('sort_order', { ascending: true })
    if (!fleetError) setVehicles(fleet ?? [])
  }

  if (checkingSession) {
    return <main className="grid min-h-screen place-items-center bg-slate-ice text-[.85rem] text-muted" role="status">Memverifikasi akses administrator...</main>
  }

  const activeVehicles = vehicles.filter((vehicle) => vehicle.is_active)
  const modelCount = new Set(activeVehicles.map((vehicle) => vehicle.name)).size
  const totalUnits = activeVehicles.reduce((total, vehicle) => total + getVehicleStock(vehicle), 0)
  const readyUnits = activeVehicles.reduce((total, vehicle) => total + (isVehicleReady(vehicle) ? getAvailableVehicleStock(vehicle) : 0), 0)
  const filteredVehicles = vehicles.filter((vehicle) => `${vehicle.name} ${vehicle.category}`.toLowerCase().includes(vehicleSearch.trim().toLowerCase()))
  const filteredBookings = bookings.filter((booking) => {
    const matchesStatus = bookingStatusFilter === 'all' || booking.status === bookingStatusFilter
    const searchText = `${booking.customer_name} ${booking.customer_phone} ${booking.pickup_address}`.toLowerCase()
    return matchesStatus && searchText.includes(bookingSearch.trim().toLowerCase())
  })

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex min-h-[76px] w-[min(1320px,calc(100%-40px))] items-center justify-between gap-4 max-[600px]:w-[calc(100%-28px)]">
          <a className="inline-flex items-center gap-3" href="/" aria-label="Kembali ke situs utama">
            <span className="grid h-10 w-[54px] place-items-center overflow-hidden rounded-md bg-white p-1 shadow-sm"><img className="size-full object-contain" src={logo} alt="" /></span>
            <span className="grid gap-1"><strong className="font-display text-[.8rem] font-extrabold tracking-[.08em]">PT KHALISA</strong><small className="text-[.55rem] font-semibold tracking-[.14em] text-cyan">SUMBER REZEKI</small></span>
          </a>
          <div className="flex items-center gap-4 max-[600px]:gap-2">
            <span className="max-w-[260px] truncate text-[.76rem] font-medium text-muted max-[600px]:hidden">{adminEmail}</span>
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-3.5 text-[.76rem] font-bold text-muted transition-colors hover:border-crimson/40 hover:text-crimson" type="button" onClick={handleLogout}><LogOut size={15} aria-hidden="true" />Keluar</button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-[min(1320px,calc(100%-40px))] py-10 max-[600px]:w-[calc(100%-28px)] max-[600px]:py-7">
        <div className="mb-8 flex items-end justify-between gap-4 max-[600px]:items-start">
          <div>
            <span className="text-[.65rem] font-extrabold tracking-[.15em] text-crimson">RINGKASAN OPERASIONAL</span>
            <h1 className="mb-0 mt-2 font-display text-[1.8rem] font-extrabold max-[600px]:text-[1.5rem]">Dashboard admin</h1>
            <p className="mb-0 mt-2 text-[.84rem] text-muted">Ikhtisar armada aktif PT Khalisa Sumber Rezeki.</p>
          </div>
          <a className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-ink px-3.5 text-[.75rem] font-bold text-white transition-colors hover:bg-[#26364b]" href="/">Lihat situs <ArrowUpRight size={15} aria-hidden="true" /></a>
        </div>

        <section className="mb-8 grid grid-cols-3 gap-4 max-[700px]:grid-cols-1" aria-label="Ringkasan armada">
          <article className="rounded-lg border border-line bg-white p-5">
            <span className="text-[.68rem] font-semibold text-muted">Model kendaraan</span>
            <strong className="mt-2 block font-display text-[1.8rem] font-extrabold">{loadingVehicles ? '—' : modelCount}</strong>
          </article>
          <article className="rounded-lg border border-line bg-white p-5">
            <span className="text-[.68rem] font-semibold text-muted">Total unit aktif</span>
            <strong className="mt-2 block font-display text-[1.8rem] font-extrabold">{loadingVehicles ? '—' : totalUnits}</strong>
          </article>
          <article className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-5">
            <span className="text-[.68rem] font-semibold text-emerald-800">Unit ready</span>
            <strong className="mt-2 block font-display text-[1.8rem] font-extrabold text-emerald-800">{loadingVehicles ? '—' : readyUnits}</strong>
          </article>
        </section>

        <div className="mb-5 flex gap-6 border-b border-line" role="tablist" aria-label="Bagian dashboard">
          <button className={`border-b-2 px-1 pb-3 text-[.8rem] font-bold ${activeTab === 'fleet' ? 'border-crimson text-crimson' : 'border-transparent text-muted hover:text-ink'}`} type="button" role="tab" aria-selected={activeTab === 'fleet'} onClick={() => setActiveTab('fleet')}>Armada <span className="ml-1 text-[.7rem] font-medium">{vehicles.length}</span></button>
          <button className={`border-b-2 px-1 pb-3 text-[.8rem] font-bold ${activeTab === 'bookings' ? 'border-crimson text-crimson' : 'border-transparent text-muted hover:text-ink'}`} type="button" role="tab" aria-selected={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')}>Booking <span className="ml-1 text-[.7rem] font-medium">{bookings.length}</span></button>
        </div>

        {activeTab === 'fleet' ? (
          <section className="overflow-hidden rounded-lg border border-line bg-white" aria-label="Daftar armada">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 max-[600px]:px-4">
              <div className="flex items-center gap-2.5"><CarFront className="text-cyan" size={19} aria-hidden="true" /><h2 className="m-0 font-display text-[.98rem] font-bold">Kelola armada</h2></div>
              <div className="flex flex-1 justify-end gap-2 max-[600px]:w-full max-[600px]:flex-none">
                <label className="flex h-10 min-w-[170px] max-w-[270px] flex-1 items-center gap-2 rounded-md border border-line px-3 max-[600px]:max-w-none">
                  <Search className="shrink-0 text-muted" size={15} aria-hidden="true" />
                  <input className="min-w-0 flex-1 border-0 bg-transparent text-[.76rem] outline-none placeholder:text-[#94a3b8]" type="search" value={vehicleSearch} onChange={(event) => setVehicleSearch(event.target.value)} placeholder="Cari nama atau kategori" aria-label="Cari armada" />
                </label>
                <button className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-crimson px-3.5 text-[.76rem] font-bold text-white transition-colors hover:bg-crimson-deep" type="button" onClick={() => openVehicleForm()}><Plus size={16} aria-hidden="true" />Tambah</button>
              </div>
            </div>

            {vehiclesError ? (
              <p className="m-0 px-5 py-8 text-[.82rem] text-red-700" role="alert">Gagal memuat armada: {vehiclesError}</p>
            ) : loadingVehicles ? (
              <p className="m-0 px-5 py-8 text-[.82rem] text-muted" role="status">Memuat armada...</p>
            ) : filteredVehicles.length === 0 ? (
              <p className="m-0 px-5 py-8 text-[.82rem] text-muted">Tidak ada armada yang cocok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-left">
                  <thead><tr className="bg-slate-ice text-[.65rem] font-bold uppercase tracking-[.07em] text-muted"><th className="px-5 py-3">Kendaraan</th><th className="px-5 py-3">Kategori</th><th className="px-5 py-3">Ready / total</th><th className="px-5 py-3">Ketersediaan</th><th className="px-5 py-3">Publikasi</th><th className="px-5 py-3 text-right">Harga / 12 jam</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead>
                  <tbody>
                    {filteredVehicles.map((vehicle) => (
                      <tr className="border-t border-line text-[.78rem]" key={vehicle.id}>
                        <td className="px-5 py-3.5 font-semibold text-ink">{vehicle.name}</td>
                        <td className="px-5 py-3.5 text-muted">{vehicle.category}</td>
                        <td className="px-5 py-3.5 text-muted">{getAvailableVehicleStock(vehicle)} / {getVehicleStock(vehicle)} unit</td>
                        <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1.5 font-semibold ${vehicle.status === 'maintenance' ? 'text-slate-500' : isVehicleReady(vehicle) ? 'text-emerald-700' : 'text-amber-700'}`}><span className={`size-1.5 rounded-full ${vehicle.status === 'maintenance' ? 'bg-slate-400' : isVehicleReady(vehicle) ? 'bg-emerald-500' : 'bg-amber-500'}`} />{vehicle.status === 'maintenance' ? 'Perawatan' : isVehicleReady(vehicle) ? 'Ready' : 'Booking'}</span></td>
                        <td className="px-5 py-3.5 text-muted">{vehicle.is_active ? 'Aktif' : 'Nonaktif'}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-ink">Rp {formatPrice(parsePrice(vehicle.price))}</td>
                        <td className="px-5 py-3.5 text-right"><button className="rounded-md border border-line px-3 py-1.5 text-[.72rem] font-bold text-muted transition-colors hover:border-cyan/40 hover:text-cyan" type="button" onClick={() => openVehicleForm(vehicle)}>Ubah</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section className="overflow-hidden rounded-lg border border-line bg-white" aria-label="Inbox booking">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 max-[600px]:px-4">
              <div><h2 className="m-0 font-display text-[.98rem] font-bold">Inbox booking</h2><p className="mb-0 mt-1 text-[.7rem] text-muted">Permintaan dari formulir website.</p></div>
              <div className="flex flex-1 justify-end gap-2 max-[600px]:w-full max-[600px]:flex-none">
                <label className="flex h-10 min-w-[150px] max-w-[260px] flex-1 items-center gap-2 rounded-md border border-line px-3 max-[600px]:max-w-none">
                  <Search className="shrink-0 text-muted" size={15} aria-hidden="true" />
                  <input className="min-w-0 flex-1 border-0 bg-transparent text-[.76rem] outline-none placeholder:text-[#94a3b8]" type="search" value={bookingSearch} onChange={(event) => setBookingSearch(event.target.value)} placeholder="Cari pemesan/lokasi" aria-label="Cari booking" />
                </label>
                <select className="h-10 rounded-md border border-line bg-white px-2.5 text-[.74rem] text-ink outline-none focus:border-cyan" value={bookingStatusFilter} onChange={(event) => setBookingStatusFilter(event.target.value)} aria-label="Filter status booking">
                  <option value="all">Semua status</option><option value="pending">Menunggu</option><option value="confirmed">Dikonfirmasi</option><option value="rejected">Ditolak</option><option value="completed">Selesai</option><option value="cancelled">Dibatalkan</option>
                </select>
              </div>
            </div>

            {bookingsError ? (
              <p className="m-0 px-5 py-8 text-[.82rem] text-red-700" role="alert">{bookingsError.includes('booking_requests') ? 'Tabel booking belum tersedia. Jalankan migration admin_dashboard_workflows.sql di Supabase.' : `Gagal memuat booking: ${bookingsError}`}</p>
            ) : loadingBookings ? (
              <p className="m-0 px-5 py-8 text-[.82rem] text-muted" role="status">Memuat booking...</p>
            ) : filteredBookings.length === 0 ? (
              <p className="m-0 px-5 py-8 text-[.82rem] text-muted">Belum ada permintaan booking untuk filter ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] border-collapse text-left">
                  <thead><tr className="bg-slate-ice text-[.65rem] font-bold uppercase tracking-[.07em] text-muted"><th className="px-5 py-3">Pemesan</th><th className="px-5 py-3">Jadwal</th><th className="px-5 py-3">Kendaraan</th><th className="px-5 py-3">Penjemputan</th><th className="px-5 py-3 text-right">Estimasi</th><th className="px-5 py-3">Status</th></tr></thead>
                  <tbody>
                    {filteredBookings.map((booking) => (
                      <tr className="border-t border-line align-top text-[.76rem]" key={booking.id}>
                        <td className="px-5 py-4"><strong className="block text-ink">{booking.customer_name}</strong><a className="mt-1 inline-flex items-center gap-1 text-muted hover:text-cyan" href={`tel:${booking.customer_phone}`}><UserRound size={13} aria-hidden="true" />{booking.customer_phone}</a></td>
                        <td className="px-5 py-4 text-muted"><span className="flex items-center gap-1.5"><CalendarDays size={13} aria-hidden="true" />{new Date(booking.start_at).toLocaleDateString('id-ID')}</span><span className="mt-1 flex items-center gap-1.5"><Clock3 size={13} aria-hidden="true" />{new Date(booking.start_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}–{new Date(booking.end_at).toLocaleDateString('id-ID')} {new Date(booking.end_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}</span></td>
                        <td className="max-w-[180px] px-5 py-4 text-muted">{(booking.vehicle_snapshot ?? []).map((vehicle) => vehicle.name).join(', ')}<span className="mt-1 block text-[.67rem]">{booking.booking_mode} · {booking.duration} {booking.duration_unit}</span></td>
                        <td className="max-w-[220px] px-5 py-4 text-muted">{booking.pickup_address}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-ink">Rp {formatPrice(Number(booking.estimated_price))}</td>
                        <td className="px-5 py-4"><select className="rounded-md border border-line bg-white px-2.5 py-2 text-[.72rem] font-semibold text-ink outline-none focus:border-cyan" value={booking.status} aria-label={`Status booking ${booking.customer_name}`} onChange={(event) => handleBookingStatusChange(booking.id, event.target.value)}><option value="pending" disabled={['rejected', 'completed', 'cancelled'].includes(booking.status)}>Menunggu</option><option value="confirmed" disabled={['rejected', 'completed', 'cancelled'].includes(booking.status)}>Dikonfirmasi</option><option value="rejected">Ditolak</option><option value="completed">Selesai</option><option value="cancelled">Dibatalkan</option></select></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {vehicleFormOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setVehicleFormOpen(false) }}>
        <section className="max-h-[min(760px,92vh)] w-full max-w-[650px] overflow-y-auto rounded-lg bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="vehicle-editor-title">
          <header className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="m-0 font-display text-[1.05rem] font-bold" id="vehicle-editor-title">{editingVehicleId ? 'Ubah kendaraan' : 'Tambah kendaraan'}</h2><p className="mb-0 mt-1 text-[.72rem] text-muted">Informasi armada yang tampil di katalog.</p></div><button className="grid size-9 place-items-center rounded-md text-muted hover:bg-slate-ice hover:text-ink" type="button" aria-label="Tutup form" onClick={() => setVehicleFormOpen(false)}><X size={18} aria-hidden="true" /></button></header>
          <form className="grid grid-cols-2 gap-4 p-5 max-[520px]:grid-cols-1" onSubmit={handleSaveVehicle}>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Nama kendaraan</span><input className="h-10 rounded-md border border-line px-3 text-[.8rem] outline-none focus:border-cyan" required maxLength={120} value={vehicleDraft.name} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, name: event.target.value }))} /></label>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Kategori</span><select className="h-10 rounded-md border border-line bg-white px-3 text-[.8rem] outline-none focus:border-cyan" value={vehicleDraft.category} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, category: event.target.value }))}><option>MPV</option><option>Premium</option><option>Rombongan</option></select></label>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Harga / 12 jam</span><input className="h-10 rounded-md border border-line px-3 text-[.8rem] outline-none focus:border-cyan" required maxLength={24} value={vehicleDraft.price} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, price: event.target.value }))} placeholder="1.100.000" /></label>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Tempat duduk</span><input className="h-10 rounded-md border border-line px-3 text-[.8rem] outline-none focus:border-cyan" required maxLength={40} value={vehicleDraft.seats} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, seats: event.target.value }))} placeholder="6 kursi" /></label>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Jumlah unit</span><input className="h-10 rounded-md border border-line px-3 text-[.8rem] outline-none focus:border-cyan" type="number" min="0" step="1" required value={vehicleDraft.stock} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, stock: event.target.value }))} /></label>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Status unit</span><select className="h-10 rounded-md border border-line bg-white px-3 text-[.8rem] outline-none focus:border-cyan" value={vehicleDraft.status} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, status: event.target.value }))}><option value="ready">Ready</option><option value="booking">Booking</option><option value="maintenance">Perawatan</option></select></label>
            <div className="grid gap-1.5">
              <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Label promosi</span><select className="h-10 rounded-md border border-line bg-white px-3 text-[.8rem] outline-none focus:border-cyan" value={customBadge ? '__custom' : vehicleDraft.badge} onChange={(event) => {
                if (event.target.value === '__custom') {
                  setCustomBadge(true)
                  setVehicleDraft((draft) => ({ ...draft, badge: promoBadgeOptions.includes(draft.badge) ? '' : draft.badge }))
                } else {
                  setCustomBadge(false)
                  setVehicleDraft((draft) => ({ ...draft, badge: event.target.value }))
                }
              }}><option value="">Tanpa label</option><option value="Promo">Promo</option><option value="Favorit">Favorit</option><option value="Terlaris">Terlaris</option><option value="Unit baru">Unit baru</option><option value="Harga spesial">Harga spesial</option><option value="__custom">Tulis sendiri</option></select></label>
              {customBadge && <input className="h-10 rounded-md border border-line px-3 text-[.8rem] outline-none focus:border-cyan" maxLength={40} value={vehicleDraft.badge} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, badge: event.target.value }))} placeholder="Contoh: Paket Lebaran" aria-label="Teks label promosi kustom" />}
            </div>
            <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Urutan tampil</span><input className="h-10 rounded-md border border-line px-3 text-[.8rem] outline-none focus:border-cyan" type="number" min="0" step="1" value={vehicleDraft.sort_order} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, sort_order: event.target.value }))} /></label>
            <div className="col-span-2 grid gap-3 max-[520px]:col-span-1">
              <label className="grid gap-1.5"><span className="text-[.72rem] font-bold">Foto kendaraan</span><input className="block w-full rounded-md border border-line px-3 py-2 text-[.76rem] file:mr-3 file:rounded file:border-0 file:bg-slate-ice file:px-3 file:py-1.5 file:text-[.72rem] file:font-bold" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) setVehicleImage({ file, previewUrl: URL.createObjectURL(file) })
              }} /></label>
              {(vehicleImage?.previewUrl || vehicleDraft.image_url) && <img className="h-36 w-full rounded-md border border-line bg-slate-ice object-contain p-2" src={vehicleImage?.previewUrl ?? vehicleDraft.image_url} alt="Pratinjau foto kendaraan" />}
              <span className="text-[.66rem] text-muted">JPG, PNG, atau WebP. Maksimal 5 MB. Foto lama dipertahankan jika tidak memilih foto baru.</span>
            </div>
            <label className="col-span-2 flex items-center gap-2.5 text-[.78rem] font-medium max-[520px]:col-span-1"><input className="size-4 accent-crimson" type="checkbox" checked={vehicleDraft.is_active} onChange={(event) => setVehicleDraft((draft) => ({ ...draft, is_active: event.target.checked }))} />Tampilkan di katalog publik</label>
            {vehicleFormError && <p className="col-span-2 m-0 rounded-md bg-red-50 px-3 py-2.5 text-[.74rem] text-red-700 max-[520px]:col-span-1" role="alert">{vehicleFormError}</p>}
            <div className="col-span-2 flex justify-end gap-2 border-t border-line pt-4 max-[520px]:col-span-1"><button className="h-10 rounded-md border border-line px-4 text-[.76rem] font-bold text-muted hover:bg-slate-ice" type="button" onClick={() => setVehicleFormOpen(false)}>Batal</button><button className="h-10 rounded-md bg-crimson px-4 text-[.76rem] font-bold text-white hover:bg-crimson-deep disabled:opacity-60" type="submit" disabled={savingVehicle}>{savingVehicle ? 'Menyimpan...' : 'Simpan kendaraan'}</button></div>
          </form>
        </section>
      </div>}
    </div>
  )
}

export default AdminDashboard
