<p align="center">
  <img src="public/Logo-cropped.png" alt="PT Khalisa Sumber Rezeki" width="140" />
</p>

<h1 align="center">PT Khalisa Sumber Rezeki — Rent Car Padang</h1>

<p align="center">
  Platform resmi reservasi rental mobil dan sistem otomasi manajemen operasional armada PT Khalisa Sumber Rezeki — Padang & Sumatera Barat.
</p>

<p align="center">
  <a href="https://www.khalisarental.id"><strong>🌐 khalisarental.id</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.4-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Deployment-Vercel-black?logo=vercel" alt="Vercel" />
</p>

---

## 📌 Ringkasan Proyek

Repositori ini memuat seluruh kode sumber website publik dan dashboard administrator terintegrasi untuk **PT Khalisa Sumber Rezeki**, perusahaan penyedia jasa transportasi rental mobil terpercaya di Padang, Sumatera Barat.

Sistem dirancang untuk memberikan pengalaman reservasi yang transparan bagi pelanggan, sekaligus memberikan kontrol operasional penuh bagi tim admin—mulai dari deteksi bentrok jadwal armada (*anti double-booking*), penugasan supir, pencatatan transaksi uang muka (DP) & pelunasan, hingga ekspor laporan keuangan akuntansi ke format Excel (`.xlsx`).

---

## ✨ Fitur Utama

### 🌐 1. Website Publik (Customer Facing)
* **Katalog Armada Interaktif**: Menampilkan foto unit asli, transmisi (Matic/Manual), bahan bakar (Bensin, Diesel, Hybrid, EV), kapasitas penumpang, dan bagasi.
* **Kalkulator Durasi Komposit Cerdas**: Mendukung durasi sewa fleksibel (**Bulan × 30 hari**, **Hari × 24 jam**, dan **Jam Tambahan**), lengkap dengan tombol preset cepat (12 Jam, 1 Hari, 2 Hari, 3 Hari, 1 Minggu, 1 Bulan).
* **Live Schedule & Anti Double-Booking**: Jadwal pengembalian dihitung otomatis secara *real-time*. Unit yang sudah terisi jadwal sewa lain langsung terkunci dan tidak bisa dipesan ganda.
* **Tiga Mode Layanan**:
  * **Sewa Lepas Kunci**: Bebas mengemudi sendiri dengan verifikasi dokumen.
  * **Sewa + Supir**: Termasuk jasa supir profesional, ramah, dan berpengalaman.
  * **Paket Rental Acara / Wedding**: Pilihan mobil premium (Alphard, Fortuner, Innova Zenix) dengan pilihan add-on dekorasi bunga & pita.
* **Estimasi Biaya Tol Transparan**: Opsi penambahan tarif tol bandara/kota otomatis atau kustom.
* **Nego Harga via WhatsApp**: Fitur bagi pelanggan untuk mengajukan negosiasi harga terbaik sebelum pesanan dikonfirmasi.
* **Cek Booking Mandiri (`/cek-booking`)**: Pelanggan dapat memantau status pesanan (Menunggu / Dikonfirmasi / Selesai) cukup dengan memasukkan nomor WhatsApp dan Kode Booking.
* **Syarat & Ketentuan Resmi (`/syarat-ketentuan`)**: Halaman SOP, privasi data, dan tata tertib peminjaman unit.

---

### 🛡️ 2. Dashboard Operasional Administrator (`/admin`)
* **Sistem Keamanan & Anti Brute-Force (`/adminlogin`)**: Proteksi penguncian otomatis (lockout 60 detik) jika terjadi salah password 5 kali berturut-turut.
* **Notifikasi Bel Suara (Chime) & Push Desktop**: Dashboard memantau pesanan masuk dan waktu sewa selesai secara *real-time* tanpa perlu me-refresh halaman.
* **Tab "Cek Jadwal" (Asisten CS WhatsApp)**:
  * Memeriksa ketersediaan seluruh armada untuk tanggal, jam, dan durasi tertentu dalam 1 detik.
  * Sub-tab **Armada Ready**: Daftar mobil siap jalan beserta estimasi tarif dan tombol cepat `+ Buat Booking Unit Ini`.
  * Sub-tab **Penuh / Tersewa**: Menampilkan mobil yang sedang bertugas lengkap dengan estimasi jam kembalinya.
  * Sub-tab **Status Supir**: Memantau supir yang *Standby*, *Sedang Tugas*, atau *Libur*.
  * Sub-tab **Format Balasan WA**: Template balasan WhatsApp ramah dan profesional tanpa format yang berantakan, lengkap dengan tombol **1-Click Salin Pesan**.
* **Input Booking Manual (Order WA / Offline)**:
  * Catat order langsung dari WhatsApp/telepon dengan validasi jadwal bentrok *real-time*.
  * Pilihan status awal: **`✅ Dikonfirmasi (Lunas Penuh 100%)`**, **`🟡 Dikonfirmasi (Bayar DP)`**, atau **`⏳ Menunggu (Belum Bayar)`**.
  * Input pembayaran terintegrasi: metode transfer, nama pengirim rekening, dan upload struk transfer/bukti bayar.
* **Alur Konfirmasi & Pelunasan Transparan**:
  * Intersep verifikasi pembayaran saat mengubah status booking dari *Menunggu* ke *Dikonfirmasi*.
  * Modal **Input Bukti Pelunasan** untuk booking yang awalnya bayar DP, mengarsipkan **kedua bukti transfer** (*Bukti DP + Bukti Pelunasan*).
  * Tampilan rincian bebas dari kata "DP" saat booking sudah berstatus Lunas (`DIBAYAR LUNAS`, `Pengirim Pembayaran (Lunas)`).
* **Manajemen Armada & Supir**:
  * Manajemen stok transmisi (Matic/Manual), status aktif/nonaktif, dan mode perawatan (bengkel).
  * Validasi jadwal supir agar tidak terjadi tumpang-tindih tugas (*driver availability engine*).
* **Ekspor Laporan Excel Akuntansi (`.xlsx`)**:
  * Mengunduh data pesanan per tampilan aktif, per bulan, atau rentang tanggal bebas.
  * Kolom laporan sangat lengkap: *No., Kode Booking, Dibuat, Pemesan, Telepon, Mulai, Selesai, Kendaraan, Layanan, Durasi, Supir, Status Booking, Status Bayar (Lunas/DP/Menunggu), Tipe Bayar, Metode Bayar, Nama Pengirim, Total Sewa (Rp), Dibayar (Rp), Sisa Tagihan (Rp), dan Catatan*.
  * Baris **TOTAL** di bagian paling bawah otomatis menjumlahkan nilai sewa, total uang masuk, dan total sisa piutang.

---

## 🛠️ Arsitektur & Teknologi

| Komponen | Teknologi | Keterangan |
|---|---|---|
| **Framework** | [Next.js](https://nextjs.org/) 16 (App Router) | React Server Components & Client Hydration |
| **Bahasa** | JavaScript (ESNext) / React 19 | Frontend & Serverless API Routes |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) 3.4 | Utility-first CSS, responsive design |
| **Ikon** | [Lucide React](https://lucide.dev/) | Icon library modern dan ringan |
| **Basis Data** | [Supabase](https://supabase.com/) | PostgreSQL, Row-Level Security (RLS), RPC |
| **File Storage** | Supabase Storage Bucket | Penyimpanan bukti transfer & struk pembayaran |
| **Ekspor Excel**| [ExcelJS](https://github.com/exceljs/exceljs) | Pembuatan file `.xlsx` dengan styling lengkap |
| **Deployment** | [Vercel](https://vercel.com/) | CI/CD otomatis & edge network |

---

## 📁 Struktur Direktori

```text
khalisa-rent-car/
├── public/                     # Asset statis, logo, favicon, audio notifikasi (chime.mp3)
├── src/
│   ├── app/                    # Next.js App Router Pages & API
│   │   ├── page.jsx            # Halaman utama (Katalog & Form Sewa Publik)
│   │   ├── layout.jsx          # Root layout & global metadata SEO
│   │   ├── admin/              # Rute Dashboard Admin (/admin)
│   │   ├── adminlogin/         # Rute Login Admin (/adminlogin)
│   │   ├── cek-booking/        # Rute Pelacakan Booking Mandiri (/cek-booking)
│   │   ├── syarat-ketentuan/   # Rute Syarat & Ketentuan (/syarat-ketentuan)
│   │   └── api/
│   │       └── upload-payment-proof/ # API route upload berkas struk pembayaran
│   ├── AdminDashboard.jsx      # Komponen utama Dashboard Admin (SPA)
│   ├── App.jsx                 # Komponen utama Website Publik (SPA)
│   ├── BookingTracker.jsx      # Komponen pelacakan status booking mandiri
│   ├── LegalPage.jsx           # Komponen syarat, ketentuan & kebijakan privasi
│   ├── bookingUtils.js         # Utilitas waktu Jakarta, kode booking & masking
│   ├── vehicleUtils.js         # Utilitas tarif durasi, promo, & kalkulasi armada
│   ├── supabaseClient.js       # Client instance Supabase
│   └── index.css               # Definisi theme Tailwind, typography & animasi
├── PANDUAN_ADMIN.md            # SOP & Manual Book lengkap operasional admin
├── next.config.mjs             # Konfigurasi Next.js
├── tailwind.config.js          # Konfigurasi token warna & styling Tailwind
└── package.json                # Dependensi proyek & npm scripts
```

---

## 🚀 Panduan Menjalankan Proyek Secara Lokal

### Prasyarat
* **Node.js**: v18.18+ (disarankan v20 LTS)
* **npm**: v9+ atau **pnpm** / **yarn**

### 1. Kloning Repositori
```bash
git clone https://github.com/Raihanhidayah12/khalisa-rent-car.git
cd khalisa-rent-car
```

### 2. Pasang Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Buat berkas `.env.local` pada direktori root proyek:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # Opsional untuk API backend
NEXT_PUBLIC_GEOAPIFY_API_KEY=your-geoapify-key # Opsional untuk autokomplet lokasi
```

### 4. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka peramban di [http://localhost:3000](http://localhost:3000).

---

## 📋 Perintah Script yang Tersedia

| Script | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan Next.js development server dengan Hot Reload |
| `npm run build` | Menjalankan kompilasi produksi Next.js (`next build`) |
| `npm run start` | Menjalankan server aplikasi pada mode produksi |
| `npm run lint` | Menjalankan audit linter statis dengan `oxlint` |

---

## 📖 Dokumentasi Terkait

Untuk petunjuk operasional staf, tata cara verifikasi bukti pembayaran, alur negosiasi WA, penugasan supir, hingga SOP pengembalian unit, silakan baca:
👉 **[PANDUAN_ADMIN.md](file:///d:/khalisa-rent-car/PANDUAN_ADMIN.md)**

---

## ⚖️ Hak Cipta & Kepemilikan

Seluruh materi merek dagang, desain grafis, logo, dan kode sumber adalah hak milik eksklusif **PT Khalisa Sumber Rezeki**.  
Hak cipta dilindungi oleh undang-undang.
