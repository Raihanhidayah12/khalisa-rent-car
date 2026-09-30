<p align="center">
  <img src="src/assets/Logo-cropped.png" alt="PT Khalisa Sumber Rezeki" width="150" />
</p>

<h1 align="center">PT Khalisa Sumber Rezeki</h1>

<p align="center">
  Website rental mobil untuk menjelajahi armada, mengajukan booking, dan mengelola operasional penyewaan.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3ecf8e?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-4-06b6d4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
</p>

## Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Menjalankan Secara Lokal](#menjalankan-secara-lokal)
- [Deploy ke Vercel](#deploy-ke-vercel)
- [Konfigurasi Supabase](#konfigurasi-supabase)
- [Perintah](#perintah)
- [Catatan Keamanan](#catatan-keamanan)

## Tentang Proyek

Website ini dibuat untuk PT Khalisa Sumber Rezeki. Pengunjung dapat melihat kendaraan yang tersedia dan mengirim permintaan booking. Admin dapat mengelola armada dan memproses booking melalui dashboard.

## Fitur

| Area | Kemampuan |
| --- | --- |
| Katalog | Menampilkan kendaraan aktif, kategori, stok, foto, ketersediaan, dan estimasi harga dari Supabase. |
| Booking | Memilih jadwal dan durasi sewa, mengisi data kontak, serta mencari lokasi penjemputan di Jakarta dan sekitarnya. |
| Konfirmasi | Menyimpan permintaan booking ke Supabase dan menyediakan langkah lanjutan melalui WhatsApp. |
| Reservasi unit | Booking pending menahan unit selama 30 menit; booking terkonfirmasi tetap menahan unit. Booking ditolak, dibatalkan, atau selesai melepaskan unit. |
| Dashboard admin | Mengelola armada, foto kendaraan, dan status booking melalui `/admin`. |
| Akses admin | Login melalui `/adminlogin`; hak admin menggunakan klaim tepercaya `app_metadata.role = "admin"`. |

## Teknologi

| Teknologi | Penggunaan |
| --- | --- |
| React 19 + Vite 8 | Antarmuka dan development server |
| Tailwind CSS 4 | Styling |
| Supabase | Auth, PostgreSQL, dan Storage |
| Geoapify | Pencarian alamat penjemputan |
| `libphonenumber-js` | Validasi nomor telepon internasional |

## Menjalankan Secara Lokal

### Persiapan

- Node.js yang kompatibel dengan versi Vite di proyek.
- Project Supabase dengan URL dan anon key.
- API key Geoapify untuk pencarian lokasi.

### Instalasi

1. Install dependency:

   ```sh
   npm install
   ```

2. Salin `.env.example` menjadi `.env.local`, lalu isi nilainya:

   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GEOAPIFY_API_KEY=your_geoapify_api_key
   ```

3. Jalankan aplikasi:

   ```sh
   npm run dev
   ```

   Buka URL lokal yang ditampilkan Vite, biasanya `http://localhost:5173`.

## Deploy ke Vercel

1. Import repository GitHub `Raihanhidayah12/Website-Rental-Mobil` ke Vercel.
2. Pilih preset **Vite** dan root directory `./`. Pengaturan build proyek:

    | Pengaturan | Nilai |
    | --- | --- |
    | Build Command | `npm run build` |
    | Output Directory | `dist` |
    | Install Command | `npm install` |

    Vercel biasanya mendeteksi nilai-nilai ini secara otomatis.

3. Di **Project Settings → Environment Variables**, tambahkan variabel berikut untuk environment **Production** dan **Preview**:

    ```text
    VITE_SUPABASE_URL
    VITE_SUPABASE_ANON_KEY
    VITE_GEOAPIFY_API_KEY
    ```

    Isi nilainya dari konfigurasi Supabase dan Geoapify. Jangan menaruh secret di repository.

4. Deploy project. Pastikan **Production Branch** disetel ke `main`. Commit baru yang di-push ke `main` akan memicu production deployment; pantau status dan **Build Logs** dari menu **Deployments**.

Domain Vercel yang dikonfigurasi untuk project ini: [ptkhalisasumberrezeki.vercel.app](https://ptkhalisasumberrezeki.vercel.app). Domain dapat digunakan setelah deployment berhasil.

## Konfigurasi Supabase

Sebelum menggunakan aplikasi, siapkan database dan akses Supabase berikut:

1. Tabel `public.vehicles` dengan kolom yang digunakan aplikasi: `id` (integer), `name`, `price`, `category`, `seats`, `badge`, `is_active`, `sort_order`, `image_url`, dan `stock`.
2. Tabel serta fungsi database untuk booking dan reservasi unit, termasuk RPC `expire_pending_booking_holds`.
3. Row Level Security (RLS): katalog publik hanya dapat membaca kendaraan aktif; pengunjung dapat mengirim booking, sedangkan membaca inbox dan mengubah status booking dibatasi untuk admin.
4. Bucket Storage `vehicle-images` dengan akses baca publik; upload, update, dan delete hanya untuk admin.
5. Akun admin Supabase Auth dengan klaim tepercaya `app_metadata.role = "admin"`. Jangan menetapkan role admin melalui `user_metadata`.
6. Site URL dan Redirect URLs di Supabase Auth untuk origin lokal, misalnya `http://localhost:5173/adminlogin`.

> **Catatan:** folder `supabase/migrations` saat ini belum berisi file SQL. Pastikan schema, RPC, policy RLS, dan bucket di atas sudah disiapkan di project Supabase.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan development server |
| `npm run build` | Membuat build production di `dist/` |
| `npm run preview` | Menjalankan preview build production |
| `npm run lint` | Menjalankan Oxlint |

## Catatan Keamanan

- `VITE_SUPABASE_ANON_KEY` digunakan di browser. Lindungi data dengan RLS dan jangan pernah menaruh Supabase `service_role` key pada variabel berawalan `VITE_`.
- Batasi API key Geoapify berdasarkan origin/referrer dan kuota.
- Security headers di `vite.config.js` berlaku untuk Vite dev/preview. Konfigurasikan headers setara di hosting production.
- Jangan commit `.env` atau `.env.local`; gunakan `.env.example` sebagai template tanpa secret.