<p align="center">
  <img src="public/Logo-cropped.png" alt="PT Khalisa Sumber Rezeki" width="140" />
</p>

<h1 align="center">PT Khalisa Sumber Rezeki — Rent Car Padang</h1>

<p align="center">
  Official website dan platform reservasi rental mobil PT Khalisa Sumber Rezeki — Padang & Sumatera Barat.
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

## 📌 Tentang Platform

Repositori ini memuat kode sumber website resmi **PT Khalisa Sumber Rezeki**, penyedia layanan transportasi rental mobil terpercaya di Padang, Sumatera Barat.

Platform ini memudahkan masyarakat, wisatawan, instansi pemerintahan, dan pelaku bisnis untuk melihat ketersediaan armada, menghitung estimasi tarif sewa secara transparan, melakukan reservasi online, dan melacak status pemesanan secara mandiri.

---

## ✨ Fitur Layanan Publik

* **Katalog Armada Lengkap**: Pilihan mobil keluarga (MPV), mobil premium (Alphard, Fortuner, Denza), hingga kendaraan rombongan (Hiace Commuter & Premio).
* **Kalkulator Durasi Fleksibel**: Perhitungan tarif otomatis untuk durasi harian, mingguan, maupun bulanan.
* **Transparansi Ketersediaan**: Sistem ketersediaan jadwal terintegrasi untuk mencegah bentrok pemesanan armada.
* **Pilihan Layanan**:
  * **Sewa Lepas Kunci**: Mengemudi sendiri dengan verifikasi dokumen resmi.
  * **Sewa + Supir**: Didampingi supir profesional, ramah, dan berpengalaman.
  * **Paket Rental Acara / Wedding**: Kendaraan eksekutif dan VIP untuk acara khusus.
* **Pelacakan Status Booking**: Pelanggan dapat mengecek perkembangan reservasi secara mandiri melalui nomor WhatsApp dan Kode Booking.
* **Informasi Tarif & Estimasi Tol**: Informasi estimasi biaya yang jelas dan opsi negosiasi langsung ke tim layanan pelanggan via WhatsApp.
* **Syarat, Ketentuan & Kebijakan Privasi**: Panduan SOP penggunaan unit demi kenyamanan dan keamanan bersama.

---

## 🛠️ Teknologi yang Digunakan

* **Frontend Framework:** Next.js (App Router) & React
* **Styling & Tampilan:** Tailwind CSS & Lucide Icons
* **Database & Infrastruktur:** Supabase (PostgreSQL & Storage)
* **Hosting & Deployment:** Vercel

---

## 📁 Struktur Direktori Umum

```text
khalisa-rent-car/
├── public/                     # Aset statis & logo
├── src/
│   ├── app/                    # Next.js App Router (Rute Halaman & Layout)
│   ├── App.jsx                 # Komponen antarmuka publik
│   ├── BookingTracker.jsx      # Pelacakan status pemesanan mandiri
│   ├── LegalPage.jsx           # Halaman syarat & ketentuan sewa
│   ├── bookingUtils.js         # Utilitas waktu & pemformatan kode
│   ├── vehicleUtils.js         # Utilitas kalkulasi tarif armada
│   └── supabaseClient.js       # Client integrasi database
├── next.config.mjs             # Konfigurasi Next.js
├── tailwind.config.js          # Konfigurasi tema Tailwind CSS
└── package.json                # Dependensi proyek
```

---

## 🚀 Menjalankan Proyek Secara Lokal

### Prasyarat
* **Node.js**: v18.18+ (disarankan v20 LTS)
* **npm**: v9+

### Langkah Instalasi
1. Kloning repositori:
   ```bash
   git clone https://github.com/Raihanhidayah12/khalisa-rent-car.git
   cd khalisa-rent-car
   ```

2. Pasang dependensi:
   ```bash
   npm install
   ```

3. Konfigurasi Environment Variables:
   Buat file `.env.local` pada direktori utama:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Jalankan server lokal:
   ```bash
   npm run dev
   ```
   Buka [http://localhost:3000](http://localhost:3000) pada peramban.

---

## 📋 Perintah Script

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan development server |
| `npm run build` | Menjalankan kompilasi produksi |
| `npm run start` | Menjalankan server hasil build |
| `npm run lint` | Menjalankan pemeriksaan kode linting |

---

## ⚖️ Hak Cipta & Kepemilikan

Hak cipta & seluruh materi merek dagang adalah milik **PT Khalisa Sumber Rezeki**.  
Seluruh hak cipta dilindungi oleh undang-undang.
