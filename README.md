<p align="center">
  <img src="src/assets/Logo-cropped.png" alt="PT Khalisa Sumber Rezeki" width="150" />
</p>

<h1 align="center">PT Khalisa Sumber Rezeki</h1>

<p align="center">
  Website rental mobil untuk menjelajahi armada, mengajukan booking, dan mengelola operasional penyewaan secara aman dan terintegrasi.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3ecf8e?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-4-06b6d4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Security-Hardened-22c55e?logo=shield&logoColor=white" alt="Security Hardened" />
</p>

## Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur Utama](#fitur-utama)
- [Detail Durasi Sewa](#detail-durasi-sewa)
- [Detail Lokasi Penjemputan](#detail-lokasi-penjemputan)
- [Optimasi SEO & Google Search](#optimasi-seo--google-search)
- [Teknologi](#teknologi)
- [Menjalankan Secara Lokal](#menjalankan-secara-lokal)
- [Deploy ke Vercel](#deploy-ke-vercel)
- [Konfigurasi Supabase](#konfigurasi-supabase)
- [Perintah](#perintah)
- [Arsitektur Keamanan](#arsitektur-keamanan)

## Tentang Proyek

Website ini dibangun untuk **PT Khalisa Sumber Rezeki**, penyedia jasa rental mobil profesional di wilayah Jakarta dan sekitarnya. Pengunjung dapat melihat katalog armada yang siap disewa, menghitung tarif sewa secara transparan (harian, mingguan, bulanan), memilih opsi lepas kunci atau dengan supir, dan mengirim pesanan langsung terhubung ke WhatsApp. Administrator dapat mengelola armada, menetapkan penugasan supir, memantau keuangan, dan mengekspor laporan pemesanan ke Excel melalui dashboard operasional.

## Fitur Utama

| Area | Kemampuan & Fungsi |
| --- | --- |
| **Katalog Armada** | Pengelompokan varian kendaraan otomatis menjadi satu model kartu. Menampilkan foto armada, kapasitas penumpang, transmisi (Matic/Manual), powertrain (Bensin/Hybrid/EV), ketersediaan unit, harga sewa, serta badge dinamis (Promo, Terlaris, Unit Baru). |
| **Formulir Booking** | Memvalidasi jadwal sewa sebelum memilih unit. Durasi sewa fleksibel (kombinasi bulan, hari, dan jam) dengan batas minimal 12 jam. Perhitungan tarif proporsional transparan dengan opsi include biaya tol standar. |
| **Pilihan Layanan** | Mendukung layanan **Sewa dengan Supir**, **Lepas Kunci** (harian/mingguan/bulanan), dan **Paket Acara** (Pernikahan, Wisuda, Korporat, Ulang Tahun) lengkap dengan opsi add-on dekorasi (bunga segar, pita, papan nama). |
| **Lokasi Penjemputan** | Autocomplete alamat Jakarta & sekitarnya via Geoapify API, dukungan Geolocation browser untuk deteksi lokasi perangkat otomatis, dan input manual cadangan. Tautan Google Maps otomatis disertakan pada ringkasan pesanan. |
| **Reservasi & Stok** | Booking berstatus **Dikonfirmasi** otomatis mengunci stok unit dan menugaskan supir yang tersedia. Memiliki jeda pembersihan/persiapan 5 jam setelah waktu sewa berakhir sebelum unit dapat dipesan kembali. |
| **Dashboard Operasional** | Akses manajemen terproteksi `/admin`: kelola armada & tarif, upload foto ke storage cloud, pantau supir (standby, on duty, libur), ubah status pesanan, dan rekap keuangan berdasarkan zona waktu Jakarta. |
| **Detail Booking Interaktif** | Panel modal interaktif untuk melihat rincian pemesan, kontak WhatsApp, jadwal sewa, koordinat jemput, supir yang bertugas, catatan pemesan, dan ubah status tanpa reload halaman. |
| **Export Excel (.xlsx)** | Download rekap booking ke format Excel rapi dengan opsi filter periode (per bulan atau rentang tanggal bebas). Menyertakan nomor urut, kode booking, badge status, format mata uang, dan baris total estimasi. |
| **Cek Status Booking** | Halaman publik `/cek-booking` bagi pelanggan untuk mengecek status pesanan menggunakan kombinasi nomor telepon WhatsApp dan kode booking unik (`KHS-XXXXXX`). |

---

## Detail Durasi Sewa

Pelanggan dapat mengisi durasi sewa melalui kombinasi fleksibel:
- **Bulan:** Dihitung tetap 30 hari (720 jam).
- **Hari:** Dihitung 24 jam per hari.
- **Jam:** Ditambahkan langsung ke durasi total.

Rumus durasi total: `(bulan × 720) + (hari × 24) + jam`.  
Tarif dasar dihitung proporsional dari harga per 12 jam: `Tarif Dasar × (Total Jam ÷ 12)`. Nilai sewa tidak dibulatkan ke kelipatan hari sehingga pelanggan hanya membayar durasi yang dipesan.

---

## Detail Lokasi Penjemputan

- **Pencarian Cerdas:** Mengetik minimal 3 karakter memunculkan rekomendasi alamat Geoapify yang difilter khusus area Jabodetabek (radius 50 km dari pusat Jakarta).
- **Format Bersih:** Menyaring nama wilayah agar ringkas (nama jalan, kelurahan, kecamatan, kota, kode pos) tanpa imbuhan redundan.
- **Deteksi GPS Perangkat:** Tombol target lokasi mengambil koordinat GPS perangkat melalui browser dan menerjemahkannya ke alamat nyata via reverse geocoding.
- **Koneksi Aman:** Deteksi lokasi perangkat diwajibkan berjalan di atas protokol HTTPS atau `localhost`.

---

## Optimasi SEO & Google Search

Aplikasi telah dilengkapi optimasi teknis untuk visibilitas mesin pencari Google:
1. **Peta Situs (`sitemap.xml`)**: Terdaftar di [public/sitemap.xml](public/sitemap.xml) mencakup halaman publik utama, cek booking, dan syarat ketentuan.
2. **Kontrol Perayap (`robots.txt`)**: Terdaftar di [public/robots.txt](public/robots.txt) untuk mempercepat perayapan halaman publik sekaligus memblokir indeks halaman sensitif (`/admin` dan `/adminlogin`).
3. **Structured Data JSON-LD (`AutoRental`)**: Schema resmi Schema.org tertanam di `index.html` dengan koordinat lokal Jakarta Barat, rentang harga sewa, nomor telepon, dan jam buka operasional 24 jam untuk mendukung rich snippet Google.
4. **Geo Meta Tags**: Tag geografis Jakarta Barat (`ID-JK`, koordinat `-6.1944, 106.7778`) untuk mengoptimalkan peringkat di Google Search Lokal & Google Maps.

---

## Teknologi

| Lapisan | Komponen & Pustaka |
| --- | --- |
| **Frontend** | React 19, Vite 8, Tailwind CSS 4, Lucide React |
| **Backend & Database** | Supabase (PostgreSQL 15, Row Level Security, RPC Functions, Cloud Storage) |
| **Peta & Geocoding** | Geoapify Geocoding & Reverse Geocoding API |
| **Validasi & Utilitas** | `libphonenumber-js` (validasi telepon E.164), `ExcelJS` (ekspor spreadsheet) |
| **Hosting & CI/CD** | Vercel (Production Branch `main`) |

---

## Menjalankan Secara Lokal

### Persiapan
- Node.js versi 18 ke atas.
- Akun dan project Supabase aktif.
- API Key Geoapify.

### Langkah Instalasi

1. Clone repositori dan install dependencies:
   ```sh
   git clone https://github.com/Raihanhidayah12/Website-Rental-Mobil.git
   cd Website-Rental-Mobil
   npm install
   ```

2. Buat file konfigurasi `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GEOAPIFY_API_KEY=your_geoapify_api_key
   ```

3. Jalankan development server:
   ```sh
   npm run dev
   ```
   Buka `http://localhost:5173` di browser Anda.

---

## Deploy ke Vercel

1. Hubungkan repository GitHub ke dashboard Vercel.
2. Pengaturan build Vite:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
3. Masukkan Environment Variables di **Project Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEOAPIFY_API_KEY`
4. Domain deployment produksi: [ptkhalisasumberrezeki.vercel.app](https://ptkhalisasumberrezeki.vercel.app).

---

## Konfigurasi Supabase

Sebelum menggunakan aplikasi di lingkungan produksi, pastikan konfigurasi berikut telah diterapkan di Supabase:

1. **Struktur Tabel:**
   - `public.vehicles`: Menyimpan armada, harga, status, kategori, varian transmisi, powertrain, dan stok.
   - `public.booking_requests`: Menyimpan riwayat pesanan, koordinat jemput, snapshot harga/unit, mode booking, dan penugasan supir.
   - `public.drivers`: Menyimpan nama supir, nomor kontak, SIM, dan status ketersediaan.
2. **Fungsi RPC & Migrasi:**
   - `confirm_booking_with_driver`: Konfirmasi otomatis pesanan dengan penugasan supir secara atomik.
   - `assign_booking_driver(uuid, uuid)`: Overload fungsi penugasan supir terproteksi (tersedia di `supabase/migrations/20261027000000_fix_assign_booking_driver_uuid_overload.sql`).
   - `lookup_bookings_by_phone`: Pencarian status booking aman oleh pelanggan tanpa membuka akses tabel langsung.
   - `expire_pending_booking_holds`: Pembersihan otomatis booking hold yang kedaluwarsa.
3. **Row Level Security (RLS):**
   - Publik (`anon`) dilarang membaca data sensitif pelanggan di tabel `booking_requests` dan `drivers`.
   - Publik hanya dapat membaca kendaraan berstatus aktif (`is_active = true`).
   - Modifikasi katalog, status booking, dan data supir dibatasi hanya untuk pengguna dengan role `admin`.
4. **Cloud Storage `vehicle-images`:**
   - Hak akses baca bersifat publik.
   - Hak upload, update, dan delete foto hanya diberikan kepada admin terautentikasi.

---

## Perintah

| Perintah | Deskripsi |
| --- | --- |
| `npm run dev` | Menjalankan local development server Vite |
| `npm run build` | Melakukan build aset produksi ke direktori `dist/` |
| `npm run preview` | Menjalankan preview lokal dari hasil build `dist/` |
| `npm run lint` | Menjalankan pemeriksaan kode cepat menggunakan Oxlint |

---

## Arsitektur Keamanan

Aplikasi dirancang dengan standar keamanan web modern:

- **HTTP Security Headers (Vercel Production):** Mengaktifkan `Content-Security-Policy` (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` (HSTS), dan `Permissions-Policy` melalui [vercel.json](vercel.json).
- **Anti Brute-Force Form Login:** Halaman `/adminlogin` memiliki sistem pelindung otomatis. Percobaan salah password 5 kali berturut-turut akan mengunci form login selama 60 detik.
- **Server-Side Role Validation:** Verifikasi hak akses admin menggunakan klaim server `app_metadata.role = "admin"` yang divalidasi langsung via `supabase.auth.getUser()`, bukan sekadar membaca token lokal.
- **Perlindungan Kredensial:** Kunci rahasia master (`SUPABASE_SERVICE_ROLE_KEY`) tidak pernah dimasukkan ke dalam kode frontend klien.
- **Sanitasi Data:** Nomor telepon dinormalisasi ke format internasional E.164, koordinat divalidasi bertipe numerik, dan upload foto dibatasi maksimal 5 MB dengan tipe file JPG, PNG, atau WebP.
