# Rencana Anggaran Biaya (RAB)
## Website Rental Mobil PT Khalisa Sumber Rezeki

**Tanggal penyusunan:** 2 Oktober 2026  
**Tanggal pembaruan & finalisasi:** 30 Oktober 2026  
**Jenis anggaran:** Estimasi jasa pembuatan, implementasi, dan penguatan website, satu kali (one-time)  
**Nilai jasa:** **Rp2.500.000**  
**Status domain khusus:** Domain kustom `khalisarental.id` aktif terhubung (biaya registrar dibayar terpisah oleh pemilik)

> Dokumen ini adalah rincian penawaran dan serah terima jasa berdasarkan ruang lingkup fitur website yang tercantum, bukan bukti biaya historis atau invoice pembayaran. Total Rp2.500.000 dialokasikan penuh untuk pekerjaan jasa teknis; biaya pembelian domain dan tagihan provider dibayar terpisah.

---

## Ringkasan Anggaran

| No. | Uraian pekerjaan | Estimasi waktu | Tarif dasar | Jumlah |
|---:|---|---:|---:|---:|
| 1 | Analisis kebutuhan dan alur bisnis | 4 jam | Rp50.000 | Rp200.000 |
| 2 | Desain UI/UX dan penyesuaian responsif | 5 jam | Rp60.000 | Rp300.000 |
| 3 | Halaman publik, katalog, dan detail kendaraan | 9 jam | Rp50.000 | Rp450.000 |
| 4 | Formulir booking, validasi, perhitungan, dan alur WhatsApp | 8 jam | Rp50.000 | Rp400.000 |
| 5 | Dashboard admin dan pengelolaan operasional | 10 jam | Rp50.000 | Rp500.000 |
| 6 | Integrasi Supabase dan kontrol akses aplikasi | 6 jam | Rp50.000 | Rp300.000 |
| 7 | Pengujian, perbaikan bug, dan penguatan keamanan | 4 jam | Rp50.000 | Rp200.000 |
| 8 | Konfigurasi deployment, optimasi SEO, dan serah terima | 3 jam | Rp50.000 | Rp150.000 |
|  | **Total estimasi jasa (49 jam)** |  |  | **Rp2.500.000** |

Rata-rata nilai jasa pada estimasi ini sekitar **Rp51.000 per jam**. Jam kerja merupakan dasar penyusunan anggaran, bukan pencatatan timesheet aktual.

### Pemisahan total biaya

| Komponen | Biaya dalam RAB | Keterangan |
|---|---:|---|
| Jasa analisis, desain, pembuatan, integrasi, pengujian, keamanan, dan serah terima | Rp2.500.000 | Biaya satu kali sesuai rincian di atas. |
| Domain khusus, misalnya `khalisarentcar.com` atau `khalisarentcar.co.id` | Tidak termasuk | Pemilik membeli langsung melalui registrar (Niagahoster, Domainesia, dsb). |
| Vercel, Supabase, dan Geoapify | Tidak ditagihkan dalam RAB ini | Menggunakan paket gratis/kuota standar yang mencukupi untuk operasional. Biaya peningkatan kuota, jika ada, dibayar langsung ke provider. |
| Pajak | Belum dihitung | Ditambahkan bila berlaku sesuai status penyedia jasa dan ketentuan perpajakan. |
| **Jumlah jasa yang ditawarkan** | **Rp2.500.000** | **Belum termasuk domain, tagihan provider, dan pajak yang mungkin berlaku.** |

---

## Rincian Lingkup Pekerjaan

### 1. Analisis kebutuhan dan alur bisnis — Rp200.000
- **Aktivitas:** Inventarisasi halaman dan peran pengguna (2 jam × Rp50.000 = Rp100.000); pemetaan proses booking serta keputusan admin (1 jam × Rp50.000 = Rp50.000); penetapan daftar kebutuhan dan batas pekerjaan (1 jam × Rp50.000 = Rp50.000).
- **Hasil:** Daftar halaman, kebutuhan pelanggan/admin, urutan status booking, dan batas fitur yang masuk ke estimasi.

### 2. Desain UI/UX dan penyesuaian responsif — Rp300.000
- **Aktivitas:** Struktur halaman dan hierarki informasi (2 jam × Rp60.000 = Rp120.000); penataan komponen publik dan admin (2 jam × Rp60.000 = Rp120.000); penyesuaian breakpoint desktop/ponsel (1 jam × Rp60.000 = Rp60.000).
- **Hasil:** Sistem tampilan responsif yang diterapkan pada halaman publik, form booking, dan dashboard operasional.

### 3. Halaman publik, katalog, dan detail kendaraan — Rp450.000
- **Aktivitas:** Beranda, navigasi, dan bagian informasi usaha (2 jam × Rp50.000 = Rp100.000); katalog, filter kategori, dan pengelompokan model (2 jam × Rp50.000 = Rp100.000); kartu/detail kendaraan beserta varian, stok, harga acuan, badge "Bisa Nego", dan konsultasi harga via WhatsApp (3 jam × Rp50.000 = Rp150.000); halaman syarat dan ketentuan serta cek booking (2 jam × Rp50.000 = Rp100.000).
- **Rincian hasil:** Pengunjung dapat mencari model melalui kategori; melihat foto, spesifikasi, harga, ketersediaan dan varian transmisi/mesin pada kartu atau detail kendaraan; opsi cepat "💬 Nego via WA" untuk negosiasi langsung ke admin; membaca syarat sewa; serta membuka halaman cek booking.

### 4. Formulir booking dan alur WhatsApp — Rp400.000
- **Aktivitas dan estimasi:**
  - Pilihan layanan (Dengan Supir, Lepas Kunci, Paket Acara), tanggal, jam, durasi bulan/hari/jam, dan batas minimum 12 jam (2 jam × Rp50.000 = **Rp100.000**).
  - Pemilihan model, varian, transmisi, kuantitas, opsi include tol, kalkulasi harga proporsional, dan opsi checkbox "Saya ingin ajukan nego harga via WhatsApp" (2 jam × Rp50.000 = **Rp100.000**).
  - Validasi nama dan format nomor telepon internasional E.164, autocomplete alamat via Geoapify, dan opsi pengambilan lokasi perangkat (2 jam × Rp50.000 = **Rp100.000**).
  - Penyimpanan data booking ke Supabase, sinkronisasi mode sewa dengan batasan database, pembuatan kode booking unik (`KHS-XXXXXX`), dan penyusunan pesan WhatsApp serta tautan Google Maps (2 jam × Rp50.000 = **Rp100.000**).
- **Rincian durasi dan harga:** Satu bulan dihitung tetap 30 hari; satu hari 24 jam. Durasi minimum 12 jam. Tarif dasar dihitung proporsional `tarif dasar × (total jam ÷ 12)`.
- **Rincian lokasi:** Pelanggan dapat mencari alamat di Jakarta dan sekitarnya menggunakan Geoapify, memilih hasil untuk menyimpan teks alamat dan koordinat, atau mendeteksi lokasi perangkat via GPS.

### 5. Dashboard admin dan pengelolaan operasional — Rp500.000
- **Aktivitas:** Akses dashboard dan sesi admin persisten tanpa reset saat reload (2 jam × Rp50.000 = Rp100.000); pemrosesan booking, penugasan supir tervalidasi, ubah deal harga nego, dan modal detail booking (3 jam × Rp50.000 = Rp150.000); CRUD armada/foto dan manajemen tim supir (3 jam × Rp50.000 = Rp150.000); ringkasan keuangan Jakarta time, notifikasi Web Push & bel audio chime real-time, ekspor Excel dengan filter periode, dan manajemen akun admin (2 jam × Rp50.000 = Rp100.000).
- **Hasil:** Dashboard `/admin` terintegrasi, notifikasi suara dan push desktop otomatis saat pesanan masuk/selesai, fitur ubah harga deal nego terkunci, validasi kewajiban pilih supir sebelum konfirmasi status, ekspor data booking ke file `.xlsx` berformat rapi, statistik pemakaian jam-unit kendaraan, dan riwayat pesanan supir. Booking diselesaikan manual setelah kendaraan kembali dan diterima.

### 6. Integrasi Supabase dan kontrol akses — Rp300.000
- **Aktivitas:** Konfigurasi koneksi frontend dan environment (1 jam × Rp50.000 = Rp50.000); integrasi autentikasi/role admin berbasis server claims (1 jam × Rp50.000 = Rp50.000); alur baca/tulis katalog, booking, supir, dan cloud storage (2 jam × Rp50.000 = Rp100.000); integrasi RPC ketersediaan, konfirmasi otomatis supir, fallback direct update penugasan supir, dan realtime postgres changes (2 jam × Rp50.000 = Rp100.000).
- **Rincian hasil:** Frontend memakai Supabase URL dan anon key terisolasi; alur admin divalidasi ke server Supabase; ketersediaan supir dan armada diperiksa atomik; penugasan supir terlindung dari bentrok RPC; serta sinkronisasi realtime booking baru.

### 7. Pengujian, perbaikan bug, dan penguatan keamanan — Rp200.000
- **Aktivitas:** Build dan pemeriksaan kode (1 jam × Rp50.000 = Rp50.000); pengujian alur booking/admin dan perbaikan bug tipe database (2 jam × Rp50.000 = Rp100.000); penguatan keamanan web & anti-brute force (1 jam × Rp50.000 = Rp50.000).
- **Cakupan penguatan keamanan:** Penambalan dependensi berisiko (Vite & source-map); proteksi brute-force login admin otomatis (lockout 60 detik setelah 5 kali gagal); pengetatan izin database (RLS data pelanggan anonim); isolasi file foto di Cloud Storage; dan perbaikan format mata uang konsisten.

### 8. Deployment, optimasi SEO, dan serah terima — Rp150.000
- **Aktivitas:** Konfigurasi deployment Vercel dengan header keamanan HTTP lengkap (1 jam × Rp50.000 = Rp50.000); optimasi SEO teknis (`sitemap.xml`, `robots.txt`, dan Schema.org `AutoRental` JSON-LD) (1 jam × Rp50.000 = Rp50.000); serah terima source code, panduan admin, dan dokumentasi (1 jam × Rp50.000 = Rp50.000).
- **Hasil:** Source code bersih, header keamanan produksi aktif di Vercel, domain kustom `khalisarental.id` terkonfigurasi, metadata SEO ramah Google Search & Google Maps, panduan admin, dan garansi perbaikan bug 30 hari setelah serah terima.

---

## Alur Kerja Website

### Alur booking dari pelanggan sampai selesai

1. **Pelanggan memilih layanan dan jadwal:** Pelanggan memilih tanggal, jam mulai, dan durasi dalam bulan, hari, jam, atau kombinasinya. Kapasitas supir diperiksa secara otomatis. Opsi **Butuh supir** hanya dapat dipilih jika ada supir yang siap pada jadwal tersebut.
2. **Pelanggan memilih kendaraan:** Katalog menampilkan kendaraan yang ready dengan opsi **Bisa Nego**. Pelanggan memilih varian transmisi/mesin dan jumlah unit; harga acuan dan subtotal dihitung otomatis.
3. **Pelanggan mengisi data dan mengirim permintaan:** Nama, nomor WhatsApp, lokasi penjemputan, dan opsi pengajuan negosiasi harga divalidasi. Permintaan tersimpan berstatus **Menunggu** dengan kode booking unik (`KHS-XXXXXX`). Tautan pesan WhatsApp dan Google Maps disiapkan.
4. **Admin menerima notifikasi:** Browser admin membunyikan bel audio chime dan menampilkan Web Push Notification bahwa pesanan baru telah masuk.
5. **Admin memeriksa dan negosiasi harga (jika ada):** Admin meninjau rincian di dashboard `/admin`. Jika pelanggan mengajukan nego dan tercapai kesepakatan lewat WhatsApp, admin menekan tombol **Ubah Deal** di modal booking untuk memperbarui nominal harga deal.
6. **Admin menugaskan supir:** Untuk pesanan dengan mode sewa supir, admin wajib memilih supir yang tersedia terlebih dahulu pada kolom supir.
7. **Admin mengonfirmasi booking:** Admin mengubah status menjadi **Dikonfirmasi**. Database mengunci stok unit dan nominal harga deal terkunci (tidak dapat diubah kembali).
8. **Admin menyelesaikan booking:** Setelah waktu sewa selesai (admin menerima pemberitahuan desktop/suara), kendaraan diterima kembali, dan admin menandai booking menjadi **Selesai**.
9. **Ketersediaan diperbarui:** Supir kembali berstatus Tersedia dan armada memiliki jeda persiapan **5 jam** sebelum dapat disewa kembali.

```mermaid
flowchart TD
	A[Pelanggan pilih layanan dan jadwal] --> B{Ketersediaan supir sesuai?}
	B -- Tidak --> A
	B -- Ya --> C[Pilih kendaraan, varian, dan jumlah]
	C --> D[Isi kontak, jemput, dan opsi ajukan nego]
	D --> E[Permintaan tersimpan: Menunggu + kode booking]
	E --> F[Admin terima notifikasi chime & push di dashboard]
	F --> G{Pelanggan ajukan nego?}
	G -- Ya --> H[Admin & pemesan sepakat di WA, admin input Ubah Deal]
	G -- Tidak --> I{Perlu supir?}
	H --> I
	I -- Ya --> J[Admin tentukan supir di dropdown supir]
	I -- Lepas kunci --> K{Admin konfirmasi?}
	J --> K
	K -- Ditolak / dibatalkan --> L[Booking ditolak atau dibatalkan]
	K -- Konfirmasi --> M[Status Dikonfirmasi: Stok & harga deal dikunci]
	M --> N[Jadwal sewa selesai & kendaraan diterima]
	N --> O[Admin ubah status: Selesai]
	O --> P[Supir Tersedia kembali & armada jeda 5 jam]
	E -. Cek status dengan nomor WA + kode .-> Q[Halaman cek booking]
	M -. Status terbaru .-> Q
	O -. Status Selesai .-> Q
```

---

## Biaya Operasional di Luar Jasa

Biaya berikut **tidak termasuk** dalam total jasa Rp2.500.000:

| Komponen | Perkiraan perlakuan biaya | Catatan |
|---|---|---|
| Domain | Biaya tahunan, mengikuti registrar dan ekstensi domain | Biaya berulang per tahun (misal: `.com` atau `.co.id`). |
| Hosting frontend Vercel | Paket gratis (Hobby tier) | Sudah mencukupi untuk traffic website rental mobil standar. |
| Database & Storage Supabase | Paket gratis (Free tier) | Mencukupi untuk data armada, ribuan booking, dan foto kendaraan. |
| API Lokasi Geoapify | Paket gratis (3.000 request/hari) | Sangat mencukupi untuk kebutuhan pencarian alamat harian. |
| WhatsApp | Tautan langsung `wa.me` | Membuka WhatsApp secara instan tanpa biaya langganan API berbayar. |

---

## Tidak Termasuk

- Pembelian nama domain khusus dan langganan infrastruktur berbayar jika melewati kuota gratis provider.
- WhatsApp Business API berbayar, SMS gateway, atau email transaksional berbayar.
- Payment gateway online (pembayaran diverifikasi manual via transfer rekening/cash).
- Aplikasi mobile native Android/iOS terpisah di Play Store / App Store.
- Pembuatan konten fotografi armada profesional dan perancangan logo baru.
- Penambahan modul fitur baru di luar ruang lingkup yang disepakati setelah masa garansi 30 hari.

---

## Asumsi dan Ketentuan

- Pemilik menyediakan akses ke project Vercel, Supabase, domain, dan Geoapify. Kredensial rahasia (`service_role`) tidak pernah dimasukkan ke dalam kode publik.
- Database Supabase telah dilengkapi fungsi RPC penugasan supir, pencegahan overbooking, dan kebijakan keamanan data (RLS).
- Garansi perbaikan bug yang dapat direproduksi berlaku 30 hari kalender terhitung sejak serah terima.
