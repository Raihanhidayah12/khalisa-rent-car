# Panduan Operasional Administrator
## Website & Sistem Reservasi PT Khalisa Sumber Rezeki
### Domain Resmi: [khalisarental.id](https://www.khalisarental.id)

Dokumen ini disusun sebagai panduan resmi dan standar operasional prosedur (SOP) bagi administrator dan staf operasional dalam mengelola pemesanan, armada kendaraan, penugasan supir, notifikasi, serta laporan keuangan di website **PT Khalisa Sumber Rezeki**.

---

## Daftar Isi
1. [Akses Masuk & Manajemen Akun Admin](#1-akses-masuk--manajemen-akun-admin)
2. [Sistem Notifikasi Bel Suara & Push Desktop](#2-sistem-notifikasi-bel-suara--push-desktop)
3. [Alur Pemrosesan Pesanan (Booking Management)](#3-alur-pemrosesan-pesanan-booking-management)
4. [Fitur Negosiasi Harga (Ubah Deal Nego)](#4-fitur-negosiasi-harga-ubah-deal-nego)
5. [Manajemen Supir & Validasi Anti-Bentrok](#5-manajemen-supir--validasi-anti-bentrok)
6. [Manajemen Armada, Varian & Harga Promo](#6-manajemen-armada-varian--harga-promo)
7. [Ekspor Laporan ke Excel (.xlsx)](#7-ekspor-laporan-ke-excel-xlsx)
8. [Halaman Cek Status Booking Mandiri Pelanggan](#8-halaman-cek-status-booking-mandiri-pelanggan)
9. [SOP Aturan Sewa & Syarat Ketentuan Resmi](#9-sop-aturan-sewa--syarat-ketentuan-resmi)
10. [Keamanan Sistem & Troubleshooting](#10-keamanan-sistem--troubleshooting)

---

## 1. Akses Masuk & Manajemen Akun Admin

### A. Login ke Dashboard
1. Buka halaman login admin di peramban (browser):  
   👉 **`https://www.khalisarental.id/adminlogin`**
2. Masukkan alamat email admin dan kata sandi yang telah terdaftar.
3. Klik tombol **Masuk ke Dashboard**. Sistem akan memvalidasi hak akses dan mengarahkan Anda ke dasbor operasional `/admin`.
4. Sesi login tersimpan secara aman dan persisten (tidak akan *logout* otomatis saat me-refresh halaman).
5. Untuk keluar, gunakan tombol **Keluar** (ikon *Log Out*) di pojok kanan atas dashboard.

> [!IMPORTANT]
> Halaman login dilindungi sistem keamanan **Anti Brute-Force**. Jika salah memasukkan kata sandi sebanyak 5 kali berturut-turut, formulir login akan **terkunci otomatis selama 60 detik**.

### B. Menambah & Mengelola Akun Admin
1. Masuk ke tab **Akun Admin** pada bilah navigasi atas dashboard.
2. Masukkan alamat email staf baru dan buat kata sandi yang kuat (minimal 12 karakter).
3. Klik **Buat Akun Admin**.
4. Akun utama (*Primary Admin*) ditandai label **Dilindungi** dan tidak dapat dihapus demi mencegah kehilangan akses sistem.
5. Akun staf admin yang sudah tidak bertugas dapat dinonaktifkan atau dihapus sewaktu-waktu oleh akun utama.

---

## 2. Sistem Notifikasi Bel Suara & Push Desktop

Dashboard dilengkapi sistem pemantau pesanan real-time tanpa perlu me-refresh halaman secara manual.

### A. Mengaktifkan Izin Notifikasi
1. Saat pertama kali membuka dashboard, klik tombol **Aktifkan Bel & Notifikasi** di bagian atas layar.
2. Browser akan memunculkan pop-up izin browser (*Notification Permission*), pilih **Izinkan (Allow)**.
3. Setelah aktif, sistem akan memainkan suara uji coba (*chime*) dan memunculkan notifikasi desktop konfirmasi.

### B. Kapan Notifikasi Berbunyi?
* **Pemesanan Baru Masuk**: Ketika pelanggan mengirimkan formulir dari website, bel audio (*chime*) berbunyi otomatis dan notifikasi desktop muncul menampilkan nama pelanggan, kendaraan, dan nomor WhatsApp.
* **Jadwal Sewa Selesai**: Sistem memberikan pengingat visual dan suara saat waktu sewa unit pelanggan telah berakhir agar admin segera mengecek pengembalian unit dan kelayakan armada.

---

## 3. Alur Pemrosesan Pesanan (Booking Management)

Semua pesanan yang masuk melalui website akan terdaftar pada tab **Booking**.

### A. Filter & Pencarian Cepat
* **Filter Waktu Interaktif**: Pilih rentang waktu di atas tabel:
  * **Semua waktu** (seluruh riwayat pesanan).
  * **Hari ini** (pesanan yang aktif atau mulai hari ini).
  * **Besok** (pesanan yang jadwalnya besok).
  * **7 hari ke depan** (persiapan operasional minggu ini).
  * **Per Bulan** (filter berdasarkan bulan kalender).
  * **Rentang Tanggal** (pilih tanggal mulai s/d tanggal selesai bebas).
* **Bilah Pencarian**: Cari berdasarkan nama pelanggan, nomor WhatsApp, alamat penjemputan, tipe armada, atau **Kode Booking** (contoh: `KHS-261031`).
* **Chip Status**: Filter pesanan berdasarkan status: *Semua, Menunggu, Dikonfirmasi, Selesai, Ditolak, Dibatalkan, atau Acara*.

### B. Membuka & Mengelola Detail Pesanan
1. **Klik baris pesanan** pada tabel desktop atau **klik kartu pesanan** pada tampilan ponsel untuk membuka modal detail lengkap.
2. Di dalam panel modal, admin dapat melihat:
   * Status pesanan terkini.
   * Rincian pemesan (nama, nomor WhatsApp, dan tombol langsung *Chat WhatsApp*).
   * Jadwal sewa lengkap (tanggal, jam mulai, dan jam selesai sesuai zona waktu Jakarta).
   * Titik penjemputan lengkap dengan tombol langsung membuka rute Google Maps.
   * Armada yang dipilih beserta varian transmisi dan powertrain.
   * Status penugasan supir.
   * Catatan khusus dari pemesan.
   * Rincian kalkulasi harga dan status negosiasi harga.

### C. Alur Pergantian Status Booking
1. **Menunggu (Pending)**: Pesanan baru masuk dari website. Pada tahap ini, unit belum dikunci dari katalog publik.
2. **Dikonfirmasi (Confirmed)**:
   * **PENTING**: Mengubah status ke Dikonfirmasi **otomatis mengunci stok armada** sehingga jadwal tersebut tidak bisa dipesan lagi oleh orang lain (*anti double-booking*).
   * Untuk pesanan dengan mode sewa supir, admin **wajib memilih supir** terlebih dahulu sebelum dapat mengonfirmasi pesanan.
   * Pastikan uang muka (DP minimal 30%) sudah diterima di rekening resmi sebelum mengubah ke status ini.
3. **Selesai (Completed)**:
   * Setelah masa sewa berakhir, kendaraan telah diterima kembali di pool/kantor dalam kondisi baik, BBM telah dicek (*same-to-same*), dan deposit jaminan telah diselesaikan.
   * Mengubah status ke Selesai akan **melepaskan supir kembali ke status Tersedia** dan unit kendaraan diberi **jeda persiapan 5 jam** sebelum siap disewa kembali.
4. **Ditolak / Dibatalkan (Rejected/Cancelled)**: Digunakan jika armada tidak tersedia, pelanggan membatalkan pesanan, atau verifikasi identitas tidak valid. Stok unit otomatis terlepas kembali.

---

## 4. Fitur Negosiasi Harga (Ubah Deal Nego)

Website menyediakan opsi bagi pelanggan untuk mencentang *"Saya ingin ajukan nego harga via WhatsApp"*.

1. Pesanan yang mengajukan negosiasi akan memiliki badge hijau **Nego WA** di tabel pesanan.
2. Hubungi pelanggan melalui tombol **Chat WA** untuk mendiskusikan penawaran harga terbaik.
3. Jika telah tercapai kesepakatan nominal sewa baru (misalnya dari harga acuan Rp1.800.000 disepakati deal Rp1.600.000):
   * Buka panel modal detail pesanan tersebut.
   * Pada bagian harga, klik tombol **Ubah Deal**.
   * Masukkan nominal harga bersih hasil negosiasi (contoh: `1600000`).
   * Klik **Simpan**.
4. Nilai estimasi pesanan akan langsung diperbarui mengikuti harga deal tersebut.
5. Saat status diubah menjadi **Dikonfirmasi**, nominal harga deal akan **terkunci permanen** dan otomatis tercatat pada invoice serta laporan ekspor Excel.

---

## 5. Manajemen Supir & Validasi Anti-Bentrok

Tab **Supir** digunakan untuk mengelola data tim pengemudi armada PT Khalisa Sumber Rezeki.

### A. Menambah & Memperbarui Data Supir
1. Masuk ke tab **Supir**, klik tombol **+ Tambah Supir**.
2. Masukkan nama lengkap supir, nomor WhatsApp aktif, golongan SIM (SIM A / SIM B1), status awal (*Tersedia / Sedang Bertugas / Libur*), dan catatan keahlian rute (misal: hafal rute Puncak, Jawa Barat, atau area Jabodetabek).
3. Klik **Simpan**.

### B. Validasi Jadwal Anti-Bentrok (Driver Availability Engine)
* Sistem memiliki perlindungan otomatis terhadap tabrakan jadwal supir.
* Ketika admin memilih supir untuk pesanan baru, sistem otomatis mengecek apakah supir tersebut sedang bertugas pada jam yang sama di pesanan lain.
* Jika jadwal bentrok, sistem akan menolak penugasan dan memberi peringatan agar memilih supir lain yang sedang *standby*.

### C. Mengirim Rincian Tugas ke Supir (Kirim ke Supir)
1. Setelah supir dipilih pada pesanan, klik tombol hijau **Kirim ke Supir**.
2. Sistem otomatis membuka WhatsApp supir dengan template pesan tugas resmi berisi:
   * Nama dan nomor telepon pemesan.
   * Armada yang digunakan.
   * Jadwal penjemputan (hari, tanggal, jam).
   * Alamat penjemputan lengkap + tautan Google Maps akurat.
   * Catatan khusus penumpang.

---

## 6. Manajemen Armada, Varian & Harga Promo

Tab **Armada** digunakan untuk mengatur stok mobil, varian mesin/transmisi, foto, harga sewa, dan badge promo.

### A. Menambah Armada Baru
1. Klik tombol **+ Tambah Armada**.
2. Masukkan **Nama Model** (contoh: `Innova Zenix G`).
3. Pilih **Kategori** (*MPV, SUV, Sedan, Luxury, Minibus/Van*).
4. Pilih **Transmisi** (*Matic* dan/atau *Manual*) serta isi kuantitas unit masing-masing.
5. Pilih **Powertrain** (*Bensin, Hybrid, atau EV/PHEV*).
6. Masukkan **Kapasitas Penumpang** (misal: `7 Seat`).
7. Masukkan **Harga Dasar Sewa per 12 Jam** (contoh: `850000`).
8. Upload foto mobil resolusi tinggi (maksimal 5 MB, format JPG/PNG/WebP). Foto otomatis diunggah ke Supabase Cloud Storage.
9. Pastikan opsi **Tampilkan di katalog publik** dicentang agar mobil tampil di website.
10. Klik **Simpan**.

### B. Mengatur Harga Promo & Diskon Terbatas
1. Klik tombol **Ubah** pada mobil yang ingin diberi promo.
2. Pada bagian badge, pilih **Promo**.
3. Masukkan **Harga Promo** (misal: harga normal 850.000 diubah promo menjadi 750.000).
4. Masukkan **Tanggal Berakhir Promo**.
5. Klik **Simpan**.
6. Di website publik, harga lama otomatis tercoret merah dan memunculkan badge hemat nominal. Begitu tanggal promo berakhir, sistem otomatis mengembalikan harga ke tarif normal tanpa perlu diedit ulang.

### C. Status Perawatan (Maintenance)
Jika ada armada yang sedang masuk bengkel, servis rutin, atau perbaikan bodi:
* Ubah status kendaraan menjadi **Perawatan**.
* Mobil berstatus Perawatan otomatis tidak dapat dipesan di formulir publik sampai statusnya diubah kembali menjadi **Ready**.

---

## 7. Ekspor Laporan ke Excel (.xlsx)

Untuk kebutuhan rekap operasional, arsip bulanan, atau pelaporan keuangan:

1. Di tab **Booking**, klik tombol **Export Excel** di kanan atas tabel.
2. Pilih mode ekspor:
   * **Tampilan Web Aktif**: Mengunduh data persis seperti yang sedang tampil di layar (mengikuti filter waktu dan status yang dipilih).
   * **Per Bulan**: Memilih satu bulan penuh (contoh: Oktober 2026).
   * **Rentang Tanggal**: Menentukan tanggal mulai dan tanggal akhir secara bebas.
3. Sistem akan memunculkan pratinjau jumlah pesanan yang akan diunduh.
4. Klik **Unduh File Excel**.
5. File `.xlsx` yang diunduh berformat rapi dan siap cetak:
   * Header warna biru navy korporat.
   * Garis baris selang-seling (*zebra stripe*).
   * Kolom lengkap: Nomor, Kode Booking, Tanggal Mulai/Selesai, Nama Pemesan, WhatsApp, Armada, Supir, Status Pesanan, dan Nilai Estimasi Biaya.
   * Format mata uang rupiah standar akuntansi (`Rp #,##0`).
   * Baris total rekap akumulasi nilai di baris paling bawah.

---

## 8. Halaman Cek Status Booking Mandiri Pelanggan

Pelanggan dapat memantau status pesanannya sendiri tanpa harus menghubungi admin secara manual:

1. Pelanggan membuka tautan: 👉 **`https://www.khalisarental.id/cek-booking`**
2. Pelanggan memasukkan **Nomor WhatsApp** dan **Kode Booking** (contoh: `KHS-891023`).
3. Sistem memvalidasi kecocokan kedua data tersebut. Jika cocok, sistem menampilkan:
   * Status pesanan terkini (*Menunggu / Dikonfirmasi / Selesai*).
   * Tipe mobil yang dipesan.
   * Jadwal keberangkatan dan kepulangan.
   * Status supir (apabila menyewa dengan supir).
   * Demi menjaga privasi pelanggan, detail alamat penjemputan di halaman publik ini disamarkan ke tingkat kecamatan/kota. Alamat lengkap hanya terlihat oleh admin dan supir yang bertugas.

---

## 9. SOP Aturan Sewa & Syarat Ketentuan Resmi

Saat melayani pelanggan via WhatsApp atau serah terima unit, gunakan klausul resmi dari halaman **`khalisarental.id/syarat-ketentuan`** sebagai acuan:

1. **Dokumen Lepas Kunci Wajib**:
   * e-KTP asli penyewa (disimpan atau diverifikasi fisik).
   * SIM A aktif yang masih berlaku.
   * Dokumen pendukung: ID Card kantor / NPWP / Kartu Keluarga / Akun Medsos.
   * Uang jaminan (*refundable deposit*) yang dikembalikan setelah pengecekan unit & rekap tilang ETLE selesai.
2. **Aturan BBM (*Same-to-Same*)**:
   * Posisi indikator bensin saat mobil dikembalikan wajib sama persis dengan saat serah terima di awal. Jika berkurang, kenakan biaya selisih BBM sesuai harga SPBU.
3. **Toleransi Waktu & Overtime**:
   * Batas toleransi pengembalian adalah **30 menit**.
   * Kelebihan jam (*overtime*) dikenakan biaya **10% per jam** dari tarif harian unit.
   * Keterlambatan lebih dari 4 jam tanpa konfirmasi dihitung biaya sewa 1 hari penuh.
4. **Izin Luar Kota**:
   * Wilayah operasional standar adalah **Jabodetabek**.
   * Penggunaan ke luar kota (Jawa Barat, Banten, Jawa Tengah, dll.) wajib izin tertulis admin dan dikenakan penyesuaian tarif sesuai rute.
5. **Tilang Elektronik (ETLE) & Kerusakan**:
   * Segala bentuk denda tilang kamera elektronik (ETLE) selama masa sewa menjadi tanggung jawab penuh penyewa.

---

## 10. Keamanan Sistem & Troubleshooting

### A. Kredensial & Lingkungan Sistem
* **Domain Utama**: `khalisarental.id` (Terkoneksi SSL HTTPS aktif).
* **Hosting Frontend**: Vercel Serverless (Otomatis ter-deploy saat branch `main` di-update).
* **Database & Storage**: Supabase Cloud (PostgreSQL 15 dengan Row Level Security).
* **Kunci Rahasia (`service_role`)**: Hanya boleh tersimpan di dashboard Supabase / Vercel Environment Variables. Jangan pernah membagikan kunci rahasia ini ke pihak mana pun.

### B. Troubleshooting Cepat
* **Tabel Pesanan Terasa Lambat / Belum Muncul**: Klik tombol **Refresh** (ikon putar) di pojok kanan atas dashboard untuk memaksa sinkronisasi ulang data terbaru dari database.
* **Bel Suara Tidak Bunyi**: Pastikan izin notifikasi browser tidak dalam kondisi diblokir (*Blocked*). Klik ikon gembok di bilah URL browser -> periksa izin *Sound* dan *Notifications* diatur ke *Allow*.
* **Supir Tidak Bisa Dipilih**: Cek tab Supir. Pastikan status supir dalam posisi **Tersedia**, bukan *Sedang Bertugas* atau *Libur*.

---

*Dokumen ini diterbitkan oleh Tim Pengembang Website PT Khalisa Sumber Rezeki — Diperbarui per 31 Oktober 2026.*
