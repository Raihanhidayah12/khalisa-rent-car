# Rencana Anggaran Biaya (RAB)
## Website Rental Mobil PT Khalisa Sumber Rezeki

**Tanggal penyusunan:** 2 Oktober 2026  
**Jenis anggaran:** Estimasi jasa pembuatan dan implementasi website, satu kali (one-time)  
**Nilai jasa:** **Rp2.500.000**

> Dokumen ini adalah estimasi nilai jasa berdasarkan ruang lingkup dan teknologi yang terlihat pada proyek. Angka ini bukan bukti biaya historis atau invoice pembayaran. Biaya layanan pihak ketiga dibahas terpisah.

## Ringkasan Anggaran

| No. | Uraian pekerjaan | Volume | Tarif satuan | Jumlah |
|---:|---|---:|---:|---:|
| 1 | Analisis kebutuhan dan alur bisnis | 4 jam | Rp50.000 | Rp200.000 |
| 2 | Desain UI/UX dan penyesuaian responsif | 5 jam | Rp60.000 | Rp300.000 |
| 3 | Halaman publik, katalog, dan detail kendaraan | 9 jam | Rp50.000 | Rp450.000 |
| 4 | Formulir booking, validasi, perhitungan, dan alur WhatsApp | 8 jam | Rp50.000 | Rp400.000 |
| 5 | Dashboard admin dan pengelolaan operasional | 10 jam | Rp50.000 | Rp500.000 |
| 6 | Integrasi Supabase dan kontrol akses aplikasi | 6 jam | Rp50.000 | Rp300.000 |
| 7 | Pengujian, perbaikan bug, dan pemeriksaan tampilan perangkat | 4 jam | Rp50.000 | Rp200.000 |
| 8 | Konfigurasi deployment, dokumentasi, dan serah terima | 3 jam | Rp50.000 | Rp150.000 |
|  | **Total estimasi jasa (49 jam)** |  |  | **Rp2.500.000** |

Rata-rata nilai jasa pada estimasi ini sekitar **Rp51.000 per jam**. Jam kerja merupakan dasar penyusunan anggaran, bukan pencatatan timesheet aktual.

## Rincian Lingkup Pekerjaan

### 1. Analisis kebutuhan dan alur bisnis — Rp200.000

- Memetakan alur pelanggan dari melihat armada hingga mengirim permintaan booking.
- Memetakan alur admin untuk mengelola kendaraan, booking, dan supir.
- Menentukan informasi yang perlu tampil pada katalog, formulir, dan status booking.

### 2. Desain UI/UX dan penyesuaian responsif — Rp300.000

- Menyusun tampilan halaman publik dan dashboard admin mengikuti identitas visual usaha.
- Menyesuaikan layout untuk desktop dan ponsel.
- Menata komponen seperti navigasi, filter kategori, kartu kendaraan, formulir, tabel, dan dialog.

### 3. Halaman publik, katalog, dan detail kendaraan — Rp450.000

- Membuat halaman beranda dan bagian informasi usaha.
- Menampilkan katalog kendaraan yang menggabungkan varian dengan model sama.
- Menampilkan foto, spesifikasi, kategori, transmisi, jenis mesin, stok, dan harga.
- Menyediakan halaman syarat dan ketentuan serta halaman cek status booking.

### 4. Formulir booking dan alur WhatsApp — Rp400.000

- Memilih tanggal, jam, durasi, jenis layanan, kendaraan, varian, dan jumlah unit.
- Menghitung harga dan subtotal berdasarkan pilihan kendaraan.
- Memvalidasi data pemesan, nomor WhatsApp, serta lokasi penjemputan.
- Memeriksa ketersediaan kendaraan dan supir melalui fungsi aplikasi/database yang tersedia.
- Menyimpan permintaan booking dan menyediakan tindak lanjut melalui tautan WhatsApp.

### 5. Dashboard admin dan pengelolaan operasional — Rp500.000

- Mengelola data kendaraan, foto, varian, stok, harga, dan status publikasi.
- Memproses status booking dan penugasan supir.
- Menandai booking Dikonfirmasi sebagai Selesai setelah waktu pengembalian lewat saat dashboard dimuat atau diperbarui.
- Mengelola profil serta status ketersediaan supir.
- Menampilkan ringkasan estimasi keuangan dan menyediakan ekspor data booking ke CSV.
- Mengelola akun admin tambahan melalui fungsi server yang disediakan.
- Menyegarkan status supir yang masa tugasnya telah lewat saat dashboard dimuat atau diperbarui; ini bukan proses terjadwal yang berjalan saat dashboard tertutup.

### 6. Integrasi Supabase dan kontrol akses — Rp300.000

- Menghubungkan antarmuka dengan Supabase Auth, PostgreSQL, dan Storage.
- Menggunakan role admin untuk membatasi akses dashboard dan operasi sensitif.
- Menghubungkan fungsi database untuk ketersediaan, reservasi, dan penugasan sesuai konfigurasi backend.
- Nilai ini mengasumsikan project dan konfigurasi backend Supabase yang diperlukan sudah tersedia. Pemulihan riwayat migration atau pembangunan ulang database tidak termasuk.

### 7. Pengujian dan perbaikan — Rp200.000

- Menjalankan pemeriksaan build dan lint.
- Memeriksa alur utama booking, dashboard, serta kondisi validasi.
- Memeriksa layout desktop dan ponsel serta memperbaiki temuan dalam lingkup yang disepakati.

### 8. Deployment dan serah terima — Rp150.000

- Menyiapkan build dan konfigurasi deployment frontend ke Vercel.
- Menyediakan panduan penggunaan admin dan catatan konfigurasi dasar.
- Menyerahkan source code dan memberikan garansi perbaikan bug selama 30 hari untuk lingkup yang disepakati.

## Biaya Operasional di Luar Jasa

Biaya berikut **tidak termasuk** dalam total jasa Rp2.500.000. Nilai aktual mengikuti provider, pilihan paket, pemakaian, dan tanggal pembelian.

| Komponen | Perkiraan perlakuan biaya | Catatan |
|---|---|---|
| Domain | Biaya tahunan, mengikuti registrar dan ekstensi domain | Domain adalah biaya berulang; harga perlu dikonfirmasi sebelum pembelian. |
| Hosting frontend Vercel | Dapat mulai dari paket gratis jika memenuhi ketentuan dan kuota provider | Biaya dapat berubah jika penggunaan atau kebutuhan melewati batas paket. |
| Database, autentikasi, dan penyimpanan Supabase | Dapat mulai dari paket gratis jika memenuhi ketentuan dan kuota provider | Biaya dapat timbul untuk kapasitas atau pemakaian tambahan. Foto disimpan di Storage. |
| API pencarian alamat Geoapify | Mengikuti kuota dan paket provider | Penggunaan berlebih atau kebutuhan komersial tertentu dapat dikenakan biaya. |
| WhatsApp | Tautan `wa.me` untuk membuka aplikasi WhatsApp | Bukan integrasi WhatsApp Business API; pesan otomatis tanpa klik tidak termasuk. |

## Kenapa Nilainya Bisa Rp2.500.000?

1. **Ini harga jasa dengan lingkup yang dibatasi**, bukan biaya berlangganan atau harga infrastruktur khusus. Anggaran dibagi ke delapan kelompok pekerjaan dengan estimasi 49 jam.
2. **Teknologi yang digunakan sudah tersedia dan banyak yang open source**, seperti React, Vite, dan Tailwind CSS. Pengerjaan tidak memerlukan pembelian lisensi framework.
3. **Layanan backend dan hosting menggunakan platform terkelola**, yaitu Supabase dan Vercel. Pendekatan ini mengurangi kebutuhan membangun dan merawat server sendiri.
4. **Alur komunikasi WhatsApp menggunakan tautan**, bukan chatbot atau WhatsApp Business API yang memerlukan setup dan biaya tambahan.
5. **Tidak ada gateway pembayaran online** pada lingkup ini. Booking dikirim sebagai permintaan, kemudian dikonfirmasi admin.
6. **Estimasi ini mengasumsikan data, foto kendaraan, identitas merek, dan project Supabase tersedia dari pemilik.** Perancangan identitas merek, produksi foto, migrasi data besar, dan rekonstruksi backend tidak dihitung.
7. **Harga ini tergolong hemat untuk fitur yang tercantum.** Nilainya dapat tercapai dengan penggunaan komponen yang konsisten, pengerjaan langsung pada satu aplikasi, dan tanpa kebutuhan sistem enterprise atau dukungan berkelanjutan di luar masa garansi.

## Tidak Termasuk

- Pembelian domain, paket hosting berbayar, kuota API berbayar, dan biaya provider lainnya.
- Biaya pajak yang mungkin berlaku sesuai status penyedia jasa dan aturan perpajakan.
- WhatsApp Business API, notifikasi otomatis, SMS, email transaksional berbayar, atau chatbot.
- Pembayaran online, refund otomatis, invoice akuntansi, dan rekonsiliasi pembayaran.
- Aplikasi native Android/iOS, aplikasi untuk supir, GPS tracking, atau integrasi peta berbayar.
- Pembuatan konten, copywriting profesional, foto/video kendaraan, dan desain logo baru.
- Pemulihan atau pembuatan ulang migration database Supabase yang tidak tersedia pada checkout ini.
- Fitur baru, perubahan besar setelah serah terima, dan dukungan rutin setelah masa garansi.

## Asumsi dan Ketentuan

- Pemilik menyediakan akses yang diperlukan ke project Vercel, Supabase, domain, dan Geoapify. Kredensial rahasia tidak disimpan di source code publik.
- Project Supabase sudah memiliki schema, kebijakan RLS, Storage, dan fungsi database yang sesuai. Checkout source saat ini tidak menyertakan file migration; konfigurasi database produksi perlu diverifikasi sebelum deployment.
- Perubahan dalam masa garansi terbatas pada perbaikan bug yang dapat direproduksi pada fitur yang tercantum. Penambahan atau perubahan kebutuhan diperkirakan terpisah.
- Nilai jasa dapat berubah jika ruang lingkup, jumlah integrasi, kebutuhan keamanan, atau kebutuhan migrasi data berubah.