import { ArrowLeft, ArrowUpRight, ShieldCheck } from 'lucide-react'
import logo from './assets/Logo-cropped.png'

const sections = [
  {
    title: '1. Pemesanan & konfirmasi',
    points: [
      'Pemesanan diajukan melalui formulir di halaman utama atau melalui WhatsApp resmi PT Khalisa Sumber Rezeki.',
      'Setiap permintaan berstatus "Menunggu" sampai admin mengkonfirmasi ketersediaan unit dan jadwal. Booking dianggap sah setelah status berubah menjadi "Dikonfirmasi".',
      'Status booking dapat diperiksa kapan saja melalui halaman Cek Status Booking dengan nomor WhatsApp pemesan.',
    ],
  },
  {
    title: '2. Harga & pembayaran',
    points: [
      'Harga yang tampil di website adalah estimasi sewa per 12 jam per unit dan dapat berbeda mengikuti durasi, jenis layanan (dengan supir atau lepas kunci), serta tanggal pemesanan.',
      'Total final dikonfirmasi admin saat proses konfirmasi booking, termasuk biaya supir, durasi tambahan, atau keperluan khusus lainnya.',
      'Skema pembayaran (uang muka atau pelunasan) dan rekening tujuan diinformasikan admin melalui WhatsApp resmi.',
    ],
  },
  {
    title: '3. Perubahan & pembatalan',
    points: [
      'Perubahan jadwal atau kendaraan dapat diminta melalui WhatsApp admin selama unit pengganti masih tersedia.',
      'Pembatalan oleh pemesan sebaiknya diinformasikan sesegera mungkin agar slot kendaraan dapat dilepas untuk pelanggan lain.',
      'Admin berhak menolak atau membatalkan permintaan apabila data pemesan tidak valid, tujuan penggunaan tidak jelas, atau kondisi operasional tidak memungkinkan.',
    ],
  },
  {
    title: '4. Syarat penyewa & aturan kendaraan',
    points: [
      'Penyewa lepas kunci wajib menyerahkan identitas yang masih berlaku dan memenuhi ketentuan yang disepakati saat konfirmasi.',
      'Kendaraan hanya digunakan sesuai peruntukan dan wilayah yang disepakati; penggunaan untuk kegiatan melawan hukum dilarang.',
      'Penyewa bertanggung jawab atas denda lalu lintas dan kerusakan akibat kelalaian selama masa sewa.',
      'Supir dari PT Khalisa Sumber Rezeki berhak menolak rute atau permintaan yang membahayakan keselamatan.',
    ],
  },
  {
    title: '5. Kebijakan privasi',
    points: [
      'Data yang dikumpulkan melalui formulir pemesanan: nama pemesan, nomor WhatsApp, alamat penjemputan, jadwal sewa, dan pilihan kendaraan.',
      'Data hanya digunakan untuk memproses pemesanan, konfirmasi jadwal, penugasan supir, dan komunikasi operasional terkait sewa.',
      'Data tidak dijual atau dibagikan ke pihak ketiga di luar keperluan operasional sewa (misalnya informasi penjemputan kepada supir yang ditugaskan).',
      'Data pemesanan disimpan selama dibutuhkan untuk keperluan administrasi dan dapat diminta untuk dihapus dengan menghubungi admin.',
      'Dengan mencentang persetujuan pada formulir, pemesan menyetujui pemrosesan data sesuai ketentuan di atas.',
    ],
  },
  {
    title: '6. Kontak',
    points: [
      'WhatsApp / telepon: 0813 8083 5156 dan 0812 7777 2320 (setiap hari, 24 jam).',
      'Alamat: Jl. Gili Sampeng No.26, RT.9/RW.3, Kb. Jeruk, Kec. Kb. Jeruk, Kota Jakarta Barat, DKI Jakarta 11530.',
    ],
  },
]

function LegalPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="public-site-header sticky top-[14px] z-30 mx-auto mt-[14px] flex min-h-[76px] w-[min(1320px,calc(100%-48px))] items-center justify-between gap-7 rounded-[12px] border border-white/15 bg-ink/90 px-7 shadow-[0_14px_40px_rgba(15,23,42,.28)] backdrop-blur-xl max-[900px]:px-[4%] max-[760px]:w-[calc(100%-32px)] max-[760px]:gap-x-4 max-[760px]:px-4 max-[600px]:mt-3 max-[600px]:w-[calc(100%-24px)] max-[600px]:gap-2 max-[600px]:rounded-[10px] max-[600px]:py-[10px] max-[360px]:w-[calc(100%-16px)] max-[360px]:gap-x-2 max-[360px]:px-3">
        <a className="inline-flex shrink-0 items-center gap-3 max-[760px]:gap-2" href="/" aria-label="PT Khalisa Sumber Rezeki, beranda">
          <span className="grid h-11 w-[58px] shrink-0 place-items-center overflow-hidden rounded-md bg-white p-0.5"><img className="h-full w-full object-contain" src={logo} alt="" /></span>
          <span className="grid gap-1 max-[600px]:gap-0.5"><strong className="font-display text-[.91rem] font-extrabold tracking-[.08em] text-white max-[760px]:text-[.82rem] max-[600px]:text-[.74rem] max-[360px]:text-[.68rem]">PT KHALISA</strong><small className="text-[.6rem] font-semibold tracking-[.14em] text-cyan max-[760px]:text-[.55rem] max-[600px]:text-[.5rem] max-[360px]:text-[.46rem]">SUMBER REZEKI</small></span>
        </a>
        <nav className="flex shrink-0 items-center gap-5 text-[.74rem] font-semibold text-white/80 max-[600px]:gap-3" aria-label="Navigasi halaman">
          <a className="inline-flex items-center gap-1.5 transition-colors hover:text-cyan" href="/"><ArrowLeft size={14} aria-hidden="true" /><span className="max-[420px]:hidden">Beranda</span></a>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-5 pb-16 pt-10 sm:px-7 sm:pt-14 lg:pb-24">
        <div className="border-b border-line pb-9 sm:pb-11">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-[.65rem] font-extrabold tracking-[.14em] text-crimson"><ShieldCheck size={14} aria-hidden="true" />KETENTUAN LAYANAN</span>
            <span className="text-[.7rem] text-muted">Berlaku sejak 1 Oktober 2026</span>
          </div>
          <h1 className="mb-0 mt-5 max-w-[850px] font-display text-[2.6rem] font-extrabold leading-[1.12] text-ink max-[700px]:text-[2.1rem] max-[420px]:text-[1.75rem]">Syarat, ketentuan & kebijakan privasi</h1>
          <p className="mb-0 mt-4 max-w-[680px] text-[.92rem] leading-7 text-muted max-[420px]:text-[.82rem] max-[420px]:leading-6">Ketentuan ini berlaku untuk seluruh layanan sewa kendaraan PT Khalisa Sumber Rezeki, baik melalui website maupun WhatsApp resmi.</p>
        </div>

        <div className="grid gap-9 pt-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16 lg:pt-10">
          <aside className="hidden lg:block">
            <nav className="sticky top-8" aria-label="Daftar isi ketentuan">
              <p className="mb-4 text-[.64rem] font-extrabold tracking-[.14em] text-muted">DAFTAR ISI</p>
              <ol className="m-0 grid list-none gap-1 border-l border-line p-0">
                {sections.map((section, index) => (
                  <li key={section.title}>
                    <a className="group flex items-start gap-3 border-l-2 border-transparent py-2 pl-3 text-[.76rem] leading-5 text-muted transition-colors hover:border-crimson hover:text-crimson" href={`#ketentuan-${index + 1}`}>
                      <span className="font-display text-[.65rem] font-bold text-[#94a3b8] group-hover:text-crimson">{String(index + 1).padStart(2, '0')}</span>
                      <span>{section.title.replace(/^\d+\.\s*/, '')}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <div className="min-w-0">
            <details className="mb-7 border-y border-line py-3 lg:hidden">
              <summary className="cursor-pointer list-none text-[.76rem] font-bold text-ink marker:hidden">Daftar isi <span className="ml-1 text-muted">({sections.length} bagian)</span></summary>
              <nav className="mt-3 grid gap-1 border-t border-line pt-3" aria-label="Daftar isi ketentuan">
                {sections.map((section, index) => (
                  <a className="flex items-center gap-3 py-2 text-[.78rem] text-muted transition-colors hover:text-crimson" href={`#ketentuan-${index + 1}`} key={section.title}>
                    <span className="font-display text-[.65rem] font-bold text-cyan">{String(index + 1).padStart(2, '0')}</span>
                    {section.title.replace(/^\d+\.\s*/, '')}
                  </a>
                ))}
              </nav>
            </details>

            <article className="min-w-0">
              {sections.map((section, index) => (
                <section className="scroll-mt-8 border-b border-line py-7 first:pt-0 last:border-b-0 last:pb-0 sm:py-9" id={`ketentuan-${index + 1}`} key={section.title}>
                  <div className="grid min-w-0 grid-cols-[42px_minmax(0,1fr)] gap-4 sm:grid-cols-[50px_minmax(0,1fr)] sm:gap-5">
                    <span className="grid size-10 place-items-center rounded-full bg-slate-ice font-display text-[.72rem] font-extrabold text-cyan sm:size-11">{String(index + 1).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <h2 className="m-0 font-display text-[1.2rem] font-bold leading-snug text-ink max-[420px]:text-[1.05rem]">{section.title.replace(/^\d+\.\s*/, '')}</h2>
                      <ul className="mb-0 mt-4 grid list-none gap-3 p-0 text-[.84rem] leading-7 text-muted max-[420px]:mt-3 max-[420px]:gap-2 max-[420px]:text-[.78rem] max-[420px]:leading-6">
                        {section.points.map((point) => (
                          <li className="grid min-w-0 grid-cols-[10px_minmax(0,1fr)] gap-2" key={point}>
                            <span className="mt-[1px] text-cyan" aria-hidden="true">·</span>
                            <span className="min-w-0">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              ))}
            </article>

            <section className="mt-10 flex flex-col justify-between gap-5 border-t border-line bg-slate-ice px-5 py-6 sm:flex-row sm:items-center sm:px-7" aria-label="Kontak bantuan">
              <div>
                <h2 className="m-0 font-display text-[1rem] font-bold">Butuh bantuan?</h2>
                <p className="mb-0 mt-1 text-[.76rem] leading-5 text-muted">Hubungi tim kami untuk pertanyaan tentang ketentuan layanan.</p>
              </div>
              <a className="inline-flex w-fit items-center gap-2 rounded-md bg-crimson px-4 py-2.5 text-[.76rem] font-bold text-white transition-colors hover:bg-crimson-deep" href="https://wa.me/6281380835156" target="_blank" rel="noreferrer">Hubungi admin <ArrowUpRight size={14} aria-hidden="true" /></a>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 bg-ink">
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-2 px-5 py-4 text-[.68rem] text-[#cbd5e1] sm:px-7">
          <span>© 2026 PT Khalisa Sumber Rezeki</span>
          <a className="transition-colors hover:text-cyan" href="/cek-booking">Cek status booking</a>
        </div>
      </footer>
    </div>
  )
}

export default LegalPage
