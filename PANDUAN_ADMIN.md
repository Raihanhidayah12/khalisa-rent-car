# Panduan Admin — Website Rental PT Khalisa Sumber Rezeki

Dokumen serah terima untuk pengelola website. Halaman publik: beranda (`/`), cek status booking (`/cek-booking`), syarat & ketentuan (`/syarat-ketentuan`). Halaman internal: login admin (`/adminlogin`), dashboard admin (`/admin`).

## 1. Masuk ke dashboard

1. Buka `/adminlogin`, masukkan email + kata sandi akun administrator.
2. Setelah masuk, diarahkan otomatis ke `/admin`.
3. Jika sesi kedaluwarsa, login ulang. Jangan bagikan akun admin ke orang lain.

### Menambah akun admin

- Buka menu **Akun admin**, masukkan email unik dan kata sandi minimal 12 karakter, lalu pilih **Buat akun admin**.
- Gunakan satu akun berbeda untuk setiap anggota/perangkat; jangan berbagi kata sandi.
- Hanya akun utama yang dapat melihat dan memakai menu ini. Admin tambahan tidak dapat membuka menu, membuat akun, atau menghapus akun melalui dashboard maupun Edge Function.
- Daftar akun menandai akun utama dan akun yang sedang dipakai sebagai **Dilindungi**. Akun utama tidak dapat dihapus, dan akun yang sedang dipakai juga tidak dapat menghapus dirinya sendiri. Akun admin tambahan lainnya dapat dihapus oleh akun utama.
- Secara default, akun admin dengan waktu pembuatan paling awal adalah akun utama. Untuk mengunci email utama tertentu, atur secret Edge Function `PRIMARY_ADMIN_EMAIL`; alternatifnya gunakan `PRIMARY_ADMIN_USER_ID` dengan UUID akun tersebut.
- Menu ini memerlukan Supabase Edge Function `create-admin` dan `manage-admins`. Hubungkan CLI ke project yang benar dengan `supabase link --project-ref <project-ref>`, lalu deploy dari root project dengan `supabase functions deploy create-admin` dan `supabase functions deploy manage-admins`. Function memeriksa role pemanggil dan memberi role melalui `app_metadata`.
- Kunci `SUPABASE_SERVICE_ROLE_KEY` hanya boleh tersedia sebagai secret di lingkungan Edge Function Supabase, tidak di browser atau variabel `VITE_*`.

## 2. Menu Ikhtisar (finance)

- Empat kartu atas: total estimasi aktif, booking selesai, dikonfirmasi, menunggu konfirmasi — mengikuti periode yang dipilih (7/30/90 hari, bulan ini, bulan lalu, semua, atau rentang tanggal sendiri).
- Tiga pintasan bawah bisa diklik untuk lompat ke tab terkait (booking menunggu, unit ready, supir tersedia).
- Angka adalah **estimasi nilai booking**, bukan catatan pembayaran aktual.

## 3. Menu Booking

- Daftar permintaan dari formulir website. Gunakan pencarian dan chip filter status.
- Di bawah nama pemesan tertera **kode booking** (`KHS-XXXXXX`). Kode ini juga bisa dipakai sebagai kata kunci pencarian, dan ikut terbawa sebagai kolom "Kode Booking" di file CSV.
- **Ganti status**: pilih pada dropdown status (Menunggu → Dikonfirmasi → Selesai, atau Ditolak/Dibatalkan). Booking berstatus Dikonfirmasi otomatis ditandai Selesai setelah waktu pengembalian lewat, saat dashboard dibuka atau refresh berkala berjalan. Otomatisasi ini berdasarkan jadwal, bukan konfirmasi fisik kendaraan telah diterima; dashboard tertutup tidak menjalankan proses latar belakang.
- **Konfirmasi**: stok baru dikunci ketika booking dikonfirmasi. Jika unit/varian sudah dipakai booking confirmed lain atau melewati batas stok, konfirmasi ditolak dan booking tetap Menunggu. Hubungi pelanggan untuk memilih varian atau jadwal lain.
- **Tugaskan supir**: pilih supir pada dropdown "Penugasan supir". Setelah ditugaskan muncul tautan "Kirim ke supir" yang membuka WhatsApp berisi rincian tugas (tamu, jadwal, alamat jemput, armada).
- **Export CSV**: tombol di kanan atas tabel mengunduh data booking yang sedang tampil (sesuai filter/pencarian) dalam format yang langsung terbuka rapi di Excel.

## 4. Menu Armada

- **Satu kartu per model**: nama kendaraan yang sama digabung di katalog publik. Untuk model dengan powertrain berbeda, buat satu baris admin per varian dengan nama model yang sama, misalnya `Innova Zenix G` Bensin dan `Innova Zenix G` Hybrid.
- **Transmisi dan powertrain berbeda**: centang Matic/Manual hanya untuk tipe yang benar-benar tersedia pada baris varian itu. Pilih teknologi mesin terpisah: Bensin, Hybrid, atau EV/PHEV.
- **Alokasi jumlah unit**: isi jumlah tiap transmisi. Total stok baris dihitung dari jumlah per tipe. Untuk satu unit Matic, isi Matic `1` dan Manual `0`; jangan centang tipe yang tidak tersedia. Untuk dua Matic dan satu Manual pada satu powertrain, isi `2` dan `1`.
- **Harga varian**: harga / 12 jam disimpan per baris varian. Pelanggan melihat harga masing-masing tipe di detail dan kartu pesanan; kartu katalog model menampilkan harga mulai.
- **Ubah**: tombol Ubah pada baris kendaraan. Foto lama dipertahankan jika tidak diganti.
- **Status unit** memengaruhi katalog publik: unit berstatus Perawatan tidak tersedia. Stok varian yang habis tidak bisa dipilih.
- **Publikasi**: centang "Tampilkan di katalog publik" untuk menyembunyikan/menampilkan kendaraan di website tanpa menghapus datanya.

### Alur pelanggan

1. Pelanggan pilih tanggal mulai dan waktu. Tombol pilih mobil aktif setelah availability selesai diperiksa.
2. Kartu katalog dapat dibuka untuk melihat foto dan detail model. Pilih model, lalu pilih powertrain/transmisi dan jumlah pada kartu pesanan.
3. Kartu pesanan hanya menawarkan varian dengan stok pada jadwal tersebut. Harga per unit dan subtotal ditampilkan sebelum submit.
4. Snapshot booking dan pesan WhatsApp menyimpan nama model, transmisi, powertrain, harga, dan jumlah tiap varian.

## 5. Menu Supir

- Tambah/ubah/hapus profil supir: nama, WhatsApp, jenis SIM, status (Tersedia / Sedang Bertugas / Libur), catatan rute.
- Status supir memengaruhi website: jika tidak ada supir berstatus Tersedia, opsi layanan "Sewa mobil + Supir" otomatis dinonaktifkan di formulir pemesanan.

## 6. Proteksi double-booking dan jeda unit

- Hanya booking berstatus **Dikonfirmasi** yang mengurangi stok. Booking Menunggu belum mengunci unit; saat admin mengonfirmasi, kapasitas diperiksa kembali dan konflik diberitahukan di dashboard.
- Hitungan stok dilakukan per varian dan jumlah unit, bukan hanya nama model.
- Setelah waktu selesai sewa, unit memiliki jeda persiapan **5 jam**. Contoh: selesai pukul 05.00 berarti baru bisa disewa mulai pukul 10.00; pemesanan pukul 09.00 ditolak.
- Jika unit terakhir sudah dikonfirmasi pelanggan lain, booking baru ditolak dan katalog dimuat ulang.

## 7. Halaman cek status booking (untuk pelanggan)

- Setelah memesan, pelanggan menerima **kode booking** (format `KHS-XXXXXX`) di layar konfirmasi dan di pesan WhatsApp. Kode ini wajib disimpan pelanggan.
- Pelanggan membuka `/cek-booking` (tautan juga ada di footer) lalu memasukkan **nomor WhatsApp + kode booking**. Keduanya harus cocok, sehingga booking tidak bisa diintip orang lain yang hanya tahu nomornya.
- Halaman menampilkan status terbaru beserta jadwal, kendaraan, dan estimasi biaya. **Alamat jemput disamarkan** ke tingkat kecamatan/kota saja demi privasi; alamat lengkap tetap terlihat oleh admin di dashboard dan di pesan WhatsApp.
- Pastikan schema Supabase memiliki `booking_code` dan RPC lookup berdasarkan nomor telepon + kode booking. Tanpa fungsi/kolom ini, halaman cek status tidak dapat menemukan booking.
- **Booking lama** (dibuat sebelum migrasi) tidak punya kode booking, jadi tidak muncul di `/cek-booking`. Arahkan pelanggan tersebut untuk konfirmasi status lewat WhatsApp admin. Semua booking baru otomatis mendapat kode.

## 8. Catatan operasional lainnya

- Data booking, armada, dan supir tersimpan di Supabase; foto kendaraan di Supabase Storage bucket `vehicle-images`.
- Website memperbarui data otomatis tiap 60 detik; untuk pembaruan instan, muat ulang halaman.
- Nomor WhatsApp tujuan pemesanan: 0813 8083 5156 (terpasang di tombol WhatsApp website).
- Folder `supabase/migrations` pada checkout ini kosong. Sebelum deploy atau menyiapkan project baru, pulihkan dan terapkan migrasi schema/RPC yang sesuai dengan database produksi. Build frontend berhasil tidak berarti perubahan database sudah diterapkan.

## 9. Garansi & dukungan

- Garansi perbaikan bug: **30 hari** sejak serah terima (sampai 31 Oktober 2026). Laporkan kendala beserta langkah kejadian dan tampilan layar.
- Di luar masa garansi atau untuk penambahan fitur baru (pembayaran online, notifikasi WhatsApp otomatis, laporan khusus, dll.), pengerjaan dihitung terpisah sebagai add-on.
