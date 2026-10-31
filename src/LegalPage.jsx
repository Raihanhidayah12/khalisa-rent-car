import { ArrowLeft, ArrowUpRight, ShieldCheck } from 'lucide-react'
import logo from './assets/Logo-cropped.png'

const logoSrc = logo?.src || logo

const sections = [
  {
    title: '1. Pemesanan & Konfirmasi',
    points: [
      'Pemesanan sewa kendaraan dapat diajukan secara langsung melalui formulir online di website resmi khalisarental.id atau melalui WhatsApp resmi PT Khalisa Sumber Rezeki.',
      'Permintaan awal berstatus "Menunggu" dan akan segera diverifikasi oleh admin operasional untuk memastikan ketersediaan unit, jadwal, serta kelayakan dokumen.',
      'Pemesanan dianggap sah dan mengikat setelah status berubah menjadi "Dikonfirmasi" serta pembayaran uang muka (DP) telah diterima.',
      'Setiap pemesanan memiliki kode unik (contoh: KHS-XXXXXX) yang dapat dipantau statusnya kapan saja melalui halaman Cek Status Booking menggunakan nomor WhatsApp terdaftar.',
    ],
  },
  {
    title: '2. Persyaratan Dokumen Penyewa',
    points: [
      'Sewa Lepas Kunci (Perorangan): Penyewa wajib melampirkan foto e-KTP asli yang masih berlaku, SIM A aktif, serta dokumen pendukung verifikasi (seperti ID Card karyawan, NPWP, Kartu Keluarga, atau akun media sosial aktif).',
      'Deposit Jaminan Lepas Kunci: Penyewa wajib menitipkan uang jaminan (refundable deposit) yang akan dikembalikan penuh 100% setelah masa sewa berakhir, unit diperiksa kondisinya, dan terbebas dari catatan tilang elektronik (ETLE).',
      'Sewa Lepas Kunci (Korporat / Perusahaan): Melampirkan legalitas usaha (NIB / SIUP / NPWP Perusahaan), KTP penanggung jawab, SIM A pengemudi yang ditugaskan, serta Purchase Order (PO) atau Surat Perjanjian Sewa resmi.',
      'Sewa Dengan Supir: Cukup melampirkan kartu identitas (KTP) dan nomor WhatsApp aktif pemesan atau penanggung jawab perjalanan selama sewa.',
    ],
  },
  {
    title: '3. Tarif Sewa, Pembayaran & Pelunasan',
    points: [
      'Tarif yang tertera di website merupakan tarif acuan transparan berbasis durasi pemesanan (harian, mingguan, bulanan) dengan dasar perhitungan kelipatan 12 jam.',
      'Total biaya final diinformasikan oleh admin saat konfirmasi pemesanan, mencakup tipe unit kendaraan, durasi sewa, opsi dengan supir/lepas kunci, dan kesepakatan harga promo/nego.',
      'Uang muka (DP) minimal sebesar 30% dari total nilai sewa wajib dibayarkan untuk mengunci slot jadwal armada.',
      'Pelunasan sisa biaya sewa dan deposit jaminan dilakukan paling lambat saat serah terima kendaraan atau sebelum keberangkatan.',
      'Seluruh transaksi pembayaran hanya sah jika ditransfer ke rekening bank resmi atas nama PT Khalisa Sumber Rezeki atau rekening resmi yang dikonfirmasi tertulis oleh admin WhatsApp resmi kami.',
    ],
  },
  {
    title: '4. Bahan Bakar (BBM), Tol, Parkir & Akomodasi',
    points: [
      'Bahan Bakar Lepas Kunci: Menganut sistem same-to-same. Posisi indikator bahan bakar saat pengembalian unit wajib sama persis dengan saat serah terima di awal. Selisih bahan bakar yang berkurang akan dibebankan kepada penyewa sesuai harga resmi SPBU.',
      'Tol & Parkir: Biaya operasional seperti kartu tol, tarif parkir, retribusi masuk tempat wisata, dan tiket penyeberangan kapal (jika ada) merupakan tanggung jawab penyewa, kecuali pemesan memilih paket sewa include kartu tol/all-in.',
      'Akomodasi Supir: Untuk perjalanan ke luar kota yang mengharuskan supir menginap, biaya penginapan supir dan uang makan menjadi tanggung jawab penyewa sesuai kesepakatan tertulis di awal.',
    ],
  },
  {
    title: '5. Batas Waktu, Keterlambatan & Overtime',
    points: [
      'Waktu mulai dan berakhirnya masa sewa dihitung tepat sesuai jam penjemputan dan pengembalian yang disepakati pada konfirmasi pesanan.',
      'Toleransi keterlambatan pengembalian unit adalah maksimal 30 (tiga puluh) menit.',
      'Kelebihan waktu (overtime) dikenakan tarif proporsional sebesar 10% per jam dari harga sewa harian unit yang digunakan.',
      'Keterlambatan pengembalian unit lebih dari 4 (empat) jam tanpa konfirmasi dan persetujuan tertulis sebelumnya dari admin akan dihitung sebagai perpanjangan sewa 1 (satu) hari penuh.',
    ],
  },
  {
    title: '6. Wilayah Operasional & Pemakaian Luar Kota',
    points: [
      'Wilayah operasional standar layanan adalah Jakarta, Bogor, Depok, Tangerang, dan Bekasi (Jabodetabek).',
      'Penggunaan armada ke luar wilayah Jabodetabek (wilayah Jawa Barat, Banten, Jawa Tengah, Jawa Timur, atau luar pulau) wajib diberitahukan dan mendapatkan izin tertulis dari admin sebelum jadwal keberangkatan.',
      'Seluruh armada PT Khalisa Sumber Rezeki dilengkapi dengan sistem pemantau posisi GPS demi keamanan bersama. Dilarang keras merusak, melepas, atau memodifikasi perangkat pelacak kendaraan.',
    ],
  },
  {
    title: '7. Tanggung Jawab, Kerusakan & Tilang Elektronik (ETLE)',
    points: [
      'Penyewa wajib menjaga kebersihan, keselamatan, dan kelayakan kendaraan selama masa sewa berlangsung.',
      'Dilarang keras memindahtangankan, menggadaikan, menyewakan kembali (sub-rent), membawa muatan terlarang/berbahaya, atau menggunakan kendaraan untuk segala aktivitas yang melanggar hukum Negara Republik Indonesia.',
      'Penyewa bertanggung jawab penuh atas segala denda pelanggaran lalu lintas (termasuk denda tilang kamera elektronik / ETLE) yang terjadi selama masa pemakaian kendaraan.',
      'Segala kerusakan fisik kendaraan akibat kelalaian penyewa (seperti tabrakan, baret, benturan, atau kehilangan komponen kendaraan) menjadi tanggung jawab penyewa sesuai ketentuan klaim asuransi (own risk) atau biaya perbaikan bengkel resmi.',
      'Supir dari PT Khalisa Sumber Rezeki berhak menolak rute atau instruksi penyewa yang melanggar hukum, membahayakan keselamatan penumpang, atau merusak kendaraan.',
    ],
  },
  {
    title: '8. Perubahan Jadwal (Reschedule) & Pembatalan',
    points: [
      'Permohonan perubahan jadwal (reschedule) atau penggantian tipe kendaraan dapat diajukan paling lambat H-2 sebelum waktu sewa, bergantung pada ketersediaan unit armada pengganti.',
      'Pembatalan pesanan sepihak oleh penyewa pada H-1 atau hari-H keberangkatan dapat mengakibatkan hangusnya uang muka (DP) sebagai kompensasi biaya alokasi slot armada.',
      'Apabila pembatalan terjadi karena kendala operasional tak terduga dari pihak PT Khalisa Sumber Rezeki atau kondisi kahar (force majeure) yang tidak dapat digantikan, seluruh uang muka (DP) akan dikembalikan penuh (100% refund).',
    ],
  },
  {
    title: '9. Kebijakan Privasi & Perlindungan Data',
    points: [
      'Data pribadi yang dikumpulkan melalui website meliputi: nama lengkap, nomor telepon/WhatsApp, alamat penjemputan, foto dokumen identitas untuk verifikasi, serta riwayat reservasi.',
      'Data tersebut digunakan secara eksklusif hanya untuk proses verifikasi legalitas penyewa, penugasan supir, konfirmasi reservasi, serta koordinasi teknis operasional perjalanan Anda.',
      'PT Khalisa Sumber Rezeki berkomitmen melindungi privasi pelanggan dan tidak akan pernah menjual, menyewakan, atau memberikan data pribadi Anda kepada pihak ketiga mana pun tanpa persetujuan Anda.',
      'Data disimpan dengan aman dan pelanggan berhak meminta penghapusan riwayat data identitas setelah seluruh kewajiban masa sewa dinyatakan selesai.',
      'Dengan menggunakan layanan dan mencentang persetujuan pada formulir booking, pelanggan menyatakan menyetujui seluruh ketentuan privasi ini.',
    ],
  },
  {
    title: '10. Layanan Pelanggan & Kontak Resmi',
    points: [
      'Layanan Pelanggan WhatsApp 24 Jam: 0813 8083 5156 dan 0812 7777 2320.',
      'Email Resmi Operasional: admin@khalisarental.id / info@khalisarental.id.',
      'Kantor Pusat & Pool Armada: Jl. Gili Sampeng No.26, RT.9/RW.3, Kebon Jeruk, Kec. Kebon Jeruk, Kota Jakarta Barat, DKI Jakarta 11530.',
    ],
  },
]

function LegalPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="public-site-header sticky top-[14px] z-30 mx-auto mt-[14px] flex min-h-[76px] w-[min(1320px,calc(100%-48px))] items-center justify-between gap-7 rounded-[12px] border border-white/15 bg-ink/90 px-7 shadow-[0_14px_40px_rgba(15,23,42,.28)] backdrop-blur-xl max-[900px]:px-[4%] max-[760px]:w-[calc(100%-32px)] max-[760px]:gap-x-4 max-[760px]:px-4 max-[600px]:mt-3 max-[600px]:w-[calc(100%-24px)] max-[600px]:gap-2 max-[600px]:rounded-[10px] max-[600px]:py-[10px] max-[360px]:w-[calc(100%-16px)] max-[360px]:gap-x-2 max-[360px]:px-3">
        <a className="inline-flex shrink-0 items-center gap-3 max-[760px]:gap-2" href="/" aria-label="PT Khalisa Sumber Rezeki, beranda">
          <span className="grid h-11 w-[58px] shrink-0 place-items-center overflow-hidden rounded-md bg-white p-0.5"><img className="h-full w-full object-contain" src={logoSrc} alt="" /></span>
          <span className="grid gap-1 max-[600px]:gap-0.5"><strong className="font-display text-[.91rem] font-extrabold tracking-[.08em] text-white max-[760px]:text-[.82rem] max-[600px]:text-[.74rem] max-[360px]:text-[.68rem]">PT KHALISA</strong><small className="text-[.6rem] font-semibold tracking-[.14em] text-cyan max-[760px]:text-[.55rem] max-[600px]:text-[.5rem] max-[360px]:text-[.46rem]">SUMBER REZEKI</small></span>
        </a>
        <nav className="flex shrink-0 items-center gap-5 text-[.74rem] font-semibold text-white/80 max-[600px]:gap-3" aria-label="Navigasi halaman">
          <a className="inline-flex items-center gap-1.5 transition-colors hover:text-cyan" href="/"><ArrowLeft size={14} aria-hidden="true" /><span className="max-[420px]:hidden">Beranda</span></a>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-5 pb-16 pt-10 sm:px-7 sm:pt-14 lg:pb-24">
        <div className="border-b border-line pb-9 sm:pb-11">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-[.65rem] font-extrabold tracking-[.14em] text-crimson"><ShieldCheck size={14} aria-hidden="true" />KETENTUAN LAYANAN RESMI</span>
            <span className="text-[.7rem] text-muted">Diperbarui Oktober 2026</span>
          </div>
          <h1 className="mb-0 mt-5 max-w-[850px] font-display text-[2.6rem] font-extrabold leading-[1.12] text-ink max-[700px]:text-[2.1rem] max-[420px]:text-[1.75rem]">Syarat, ketentuan & kebijakan privasi</h1>
          <p className="mb-0 mt-4 max-w-[680px] text-[.92rem] leading-7 text-muted max-[420px]:text-[.82rem] max-[420px]:leading-6">Ketentuan ini mengikat seluruh layanan sewa kendaraan PT Khalisa Sumber Rezeki, baik pemesanan melalui website resmi maupun layanan WhatsApp operasional.</p>
        </div>

        <div className="grid gap-9 pt-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16 lg:pt-10">
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
                <h2 className="m-0 font-display text-[1rem] font-bold">Butuh bantuan atau pertanyaan khusus?</h2>
                <p className="mb-0 mt-1 text-[.76rem] leading-5 text-muted">Tim operasional PT Khalisa Sumber Rezeki siap membantu mengonfirmasi kebutuhan sewa Anda.</p>
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
