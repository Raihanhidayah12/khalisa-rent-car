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
- [Detail Durasi Sewa](#detail-durasi-sewa)
- [Detail Lokasi Penjemputan](#detail-lokasi-penjemputan)
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
| Katalog | Menggabungkan baris varian dengan nama model yang sama menjadi satu kartu. Detail mobil menampilkan foto, kategori, spesifikasi, varian yang stoknya dialokasikan, serta harga mulai. |
| Booking | Wajib memilih tanggal dan jam sebelum memilih mobil. Durasi dapat diisi dalam kombinasi bulan (30 hari), hari, dan jam; minimum 12 jam berlaku untuk isian jam saja dan tarif dihitung proporsional dari harga per 12 jam. Kartu pesanan menampilkan tipe transmisi/mesin yang ready, jumlah unit, harga per unit, dan subtotal. |
| Lokasi penjemputan | Autocomplete alamat Jakarta dan sekitarnya menampilkan alamat ringkas tanpa nama provinsi yang membingungkan. Pelanggan dapat mengisi alamat manual atau memakai tombol lokasi terkini; setelah izin browser diberikan, alamat diidentifikasi dan tautan Google Maps pada pesan booking diarahkan memakai koordinat lokasi. |
| Konfirmasi | Menyimpan permintaan booking ke Supabase dan menyediakan langkah lanjutan melalui WhatsApp. Jika pelanggan memilih supir, opsi hanya aktif setelah tanggal dan waktu dipilih serta kapasitas supir untuk seluruh rentang sewa lolos pemeriksaan. Ketersediaan dicek ulang tepat sebelum permintaan dikirim. |
| Reservasi unit | Booking berstatus confirmed mengurangi stok. Booking pending belum mengunci unit; stok dicek kembali saat admin mengonfirmasi. Unit memerlukan jeda persiapan 5 jam setelah waktu selesai sebelum bisa disewa lagi. |
| Dashboard admin | Mengelola armada, foto kendaraan, keuangan, tim supir, dan status booking melalui `/admin`. Booking hanya ditandai selesai secara manual setelah waktu pengembalian lewat dan kendaraan diterima. Grafik keuangan memfilter booking berdasarkan tanggal mulai sewa di zona waktu Jakarta; pilihan Semua menampilkan tren 30 hari terakhir. |
| Detail booking | Klik baris tabel atau kartu booking untuk membuka panel detail lengkap: jadwal, kendaraan, lokasi penjemputan, penugasan supir, catatan pemesan, estimasi harga, dan perubahan status — tanpa meninggalkan halaman. |
| Export Excel | Tombol di daftar booking membuka panel pilih periode (per bulan atau rentang tanggal bebas) sebelum mengunduh. File `.xlsx` berformat rapi: header berwarna, zebra stripe, badge status berwarna, format angka, dan baris total estimasi. Nama file menyertakan periode yang dipilih. |
| Paket Acara | Seksi khusus di beranda untuk rental mobil acara (Pernikahan, Wisuda, Korporat, Ulang Tahun). Pelanggan pilih tipe acara, centang add-on dekorasi (bunga, pita, papan nama, balon, dll), isi detail, lalu kirim request langsung ke WhatsApp admin sebagai pesan terformat. |
| Kelola Supir | Memantau supir standby/kosong, bertugas, dan libur, serta menugaskan supir ke booking secara eksklusif oleh Admin. Supir dengan booking menunggu atau dikonfirmasi tidak dapat ditandai tersedia atau libur sampai booking aktifnya selesai/dilepas. Permintaan aktif yang membutuhkan supir tetapi belum memiliki penugasan ikut dihitung agar kapasitas pada jadwal yang sama tidak ditawarkan berulang kali. |
| Akses admin | Login melalui `/adminlogin`; hak admin menggunakan klaim tepercaya `app_metadata.role = "admin"`. |
| Akun admin | Hanya akun admin utama yang dapat melihat tab, menambah akun, atau menghapus admin tambahan melalui Edge Function Supabase. |

### Alur ketersediaan supir

1. Pelanggan memilih tanggal, jam mulai, dan durasi sewa. Website memeriksa kapasitas supir untuk seluruh rentang tersebut melalui RPC Supabase.
2. Opsi **Butuh supir** aktif hanya jika ada kapasitas yang cocok. Supir berstatus **Libur** tidak dihitung. Supir **Tersedia** atau **Sedang Bertugas** dapat dipertimbangkan jika tidak bentrok dengan penugasan aktif.
3. Permintaan lain yang masih **Menunggu** atau **Dikonfirmasi** dan membutuhkan supir ikut mengurangi kapasitas jadwal meskipun admin belum memilih nama supirnya. Ini mencegah website menawarkan kapasitas yang sama kepada beberapa pelanggan untuk waktu beririsan.
4. Ketersediaan diperiksa lagi tepat sebelum pengiriman. Jika pemeriksaan gagal atau kapasitas berubah, permintaan dengan supir tidak dikirim; pelanggan diminta memilih waktu lain atau melanjutkan tanpa supir.
5. Setelah permintaan masuk, admin memilih supir tertentu dari daftar penugasan di dashboard. Opsi pelanggan hanya meminta layanan supir—bukan memilih atau memesan nama supir secara langsung.

## Detail Durasi Sewa

Pelanggan mengisi durasi dengan tiga kotak terpisah, dan boleh memakai satu kotak saja atau menggabungkan beberapa kotak:

- **Bulan:** setiap bulan dihitung sebagai 30 hari (720 jam).
- **Hari:** ditambahkan sebagai 24 jam untuk setiap hari.
- **Jam:** ditambahkan langsung ke jumlah jam sewa.

Rumus durasi total adalah `bulan × 720 + hari × 24 + jam`. Contohnya, `1 bulan + 2 hari + 5 jam` menjadi 773 jam, sedangkan `1 hari + 2 jam` menjadi 26 jam. Pilihan cepat yang tersedia adalah **12 jam**, **1 hari**, **1 minggu**, dan **1 bulan**; memilih pilihan cepat akan mengisi ulang ketiga kotak mengikuti durasi tersebut.

Tarif dasar yang tersimpan tetap tarif per 12 jam. Harga sewa dihitung secara proporsional, bukan dibulatkan ke kelipatan 12 jam: `tarif dasar × (durasi total dalam jam ÷ 12)`. Sebagai contoh, sewa 14 jam dihitung sebagai `14 ÷ 12` kali tarif dasar; sewa 1 hari 2 jam dihitung sebagai `26 ÷ 12` kali tarif dasar. Durasi minimum 12 jam tetap berlaku. Jika pelanggan hanya mengisi kotak jam, input jam tidak menerima nilai di bawah 12 dan akan kembali ke 12; bila bulan atau hari turut diisi, minimum diterapkan ke total durasinya.

Durasi terpilih dan harga mengikuti pelanggan di kartu kendaraan, detail kendaraan, ringkasan booking, pesan WhatsApp, dashboard admin, export Excel, dan halaman cek booking.

## Detail Lokasi Penjemputan

- **Cari alamat:** ketik sedikitnya tiga karakter untuk melihat saran Geoapify yang dibatasi ke Jakarta dan sekitarnya (radius pencarian sekitar 50 km dari pusat Jakarta). Pilih saran untuk mengisi alamat dan menyimpan koordinatnya.
- **Alamat yang ditampilkan:** disusun dari nama tempat, jalan/nomor, kelurahan atau area, kabupaten/kota, dan kode pos bila tersedia. Untuk alamat di Indonesia, provinsi dan nama negara tidak ditambahkan agar hasil lebih ringkas (misalnya `Bundaran Taman Gondangdia 1, Jalan Teuku Umar, Menteng, Jakarta Pusat, 10350`).
- **Lokasi terkini:** tekan ikon target di sisi kolom alamat, lalu izinkan akses lokasi pada prompt browser. Browser mengambil koordinat perangkat dan Geoapify reverse geocoding mengubahnya menjadi alamat. Koordinat tetap disimpan untuk tautan Google Maps agar pin menunjuk lokasi yang dipilih.
- **Isi manual:** alamat tetap dapat diketik sendiri jika pencarian atau lokasi perangkat tidak tersedia. Jika alamat manual tidak dipilih dari saran, tautan Google Maps mencari teks alamat tersebut.
- **Izin dan koneksi:** lokasi perangkat hanya tersedia jika browser mendukung Geolocation API, pengguna memberi izin, dan halaman dibuka melalui HTTPS atau `localhost`. Jika izin ditolak, permintaan gagal, atau waktu habis, masukkan alamat secara manual atau coba lagi.
- **Konfigurasi:** pencarian saran dan reverse geocoding membutuhkan `VITE_GEOAPIFY_API_KEY`. Tanpa variabel tersebut, pelanggan masih dapat menulis alamat manual, tetapi pencarian dan pengubahan koordinat ke alamat tidak tersedia.

## Teknologi

| Teknologi | Penggunaan |
| --- | --- |
| React 19 + Vite 8 | Antarmuka dan development server |
| Tailwind CSS 4 | Styling |
| Supabase | Auth, PostgreSQL, dan Storage |
| Geoapify | Autocomplete dan reverse geocoding alamat penjemputan |
| `libphonenumber-js` | Validasi nomor telepon internasional |
| ExcelJS | Generate file `.xlsx` untuk export data booking |

## Menjalankan Secara Lokal

### Persiapan

- Node.js yang kompatibel dengan versi Vite di proyek.
- Project Supabase dengan URL dan anon key.
- API key Geoapify untuk pencarian lokasi.
- Akses lokasi perangkat bersifat opsional dan memerlukan izin browser. Geolocation browser umumnya hanya tersedia pada HTTPS atau `localhost`.

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

1. Tabel `public.vehicles` harus memiliki kolom dasar `id`, `name`, `price`, `category`, `seats`, `badge`, `is_active`, `sort_order`, `image_url`, dan `stock`, serta kolom varian `transmission_options` (text array), `transmission_stock` (JSON object), `transmission_details`, dan `powertrain_type`.
2. Tabel `public.booking_requests` harus menyimpan `vehicle_ids`, `vehicle_snapshot`, jadwal, status, dan hold kedaluwarsa. Snapshot tiap varian menyimpan `transmission_type`, `powertrain_type`, harga, dan kuantitas.
3. RPC `vehicle_availability` harus menghitung booking confirmed yang rentangnya beririsan dengan jadwal ditambah buffer 5 jam. Trigger `guard_booking_vehicle_capacity` harus mengunci stok saat booking dikonfirmasi dan mencegah oversell, termasuk beberapa tipe dalam satu model.
4. Booking pending tidak mengurangi stok; konfirmasi tetap harus lolos pengecekan kapasitas. Booking rejected/cancelled tidak dihitung. Setelah pengembalian, unit baru bisa disewa kembali setelah jeda 5 jam.
5. Riwayat migrasi database lama belum tersedia di checkout ini; jangan gunakan `supabase db push` untuk membuat ulang schema project produksi. File `supabase/migrations/20261013000000_driver_availability_for_window.sql` menambahkan RPC pemeriksaan kapasitas supir per jadwal dan memerlukan tabel/kolom booking serta supir yang sudah ada. Terapkan file tersebut melalui SQL Editor pada project Supabase yang dipakai, lalu pastikan fungsi berhasil dibuat sebelum mengaktifkan opsi supir di website. Fungsi mengembalikan boolean saja; jika RPC gagal atau belum diterapkan, pilihan supir dinonaktifkan dan booking dengan supir tidak dikirim.
6. Row Level Security (RLS): katalog publik hanya dapat membaca kendaraan aktif; pengunjung dapat mengirim booking, sedangkan membaca inbox dan mengubah status booking dibatasi untuk admin.
7. Bucket Storage `vehicle-images` dengan akses baca publik; upload, update, dan delete hanya untuk admin.
8. Akun admin Supabase Auth dengan klaim tepercaya `app_metadata.role = "admin"`. Jangan menetapkan role admin melalui `user_metadata`.
9. Site URL dan Redirect URLs di Supabase Auth untuk origin lokal, misalnya `http://localhost:5173/adminlogin`.
10. Hubungkan Supabase CLI ke project yang benar dengan `supabase link --project-ref <project-ref>`, lalu deploy Edge Function dengan `supabase functions deploy create-admin` dan `supabase functions deploy manage-admins`. Function memakai `SUPABASE_SERVICE_ROLE_KEY` di lingkungan server Supabase; jangan pernah memasukkannya ke frontend atau variabel `VITE_*`. Admin tertua dilindungi sebagai akun utama secara default. Untuk mengunci akun tertentu, atur secret Edge Function `PRIMARY_ADMIN_EMAIL` atau `PRIMARY_ADMIN_USER_ID`. Hanya akun utama yang dapat melihat dan memakai tab pengelolaan admin.

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