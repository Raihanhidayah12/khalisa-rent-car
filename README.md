<p align="center">
  <img src="public/Logo-cropped.png" alt="PT Khalisa Sumber Rezeki" width="140" />
</p>

<h1 align="center">PT Khalisa Sumber Rezeki</h1>

<p align="center">
  Official website dan platform reservasi rental mobil PT Khalisa Sumber Rezeki — Jakarta & sekitarnya.
</p>

<p align="center">
  <a href="https://www.khalisarental.id"><strong>khalisarental.id</strong></a>
</p>

---

## Ringkasan Proyek

Repositori ini memuat kode sumber website resmi **PT Khalisa Sumber Rezeki**, menyediakan informasi armada, estimasi tarif sewa transparan, formulir reservasi online, dan cek status booking.

### Teknologi Utama

- **Framework:** Next.js (App Router) & React
- **Styling:** Tailwind CSS & Lucide Icons
- **Backend:** Supabase (Database & Storage)
- **Deployment:** Vercel

---

## Menjalankan Proyek Secara Lokal

### Prasyarat
- Node.js (v18.18+ disarankan v20+)
- npm

### Instalasi

1. Clone repositori:
   ```bash
   git clone https://github.com/Raihanhidayah12/khalisa-rent-car.git
   cd khalisa-rent-car
   ```

2. Pasang dependensi:
   ```bash
   npm install
   ```

3. Konfigurasi Environment Variables:
   Buat file `.env.local` di direktori utama:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_GEOAPIFY_API_KEY=your_geoapify_key
   ```

4. Jalankan development server:
   ```bash
   npm run dev
   ```
   Buka [http://localhost:3000](http://localhost:3000) di browser.

### Perintah Tersedia

| Perintah | Deskripsi |
| --- | --- |
| `npm run dev` | Menjalankan server development |
| `npm run build` | Menjalankan kompilasi produksi |
| `npm run start` | Menjalankan server mode produksi |
| `npm run lint` | Pemeriksaan linting kode |

---

## Hak Cipta & Kepemilikan

Hak cipta & seluruh materi merek dagang adalah milik **PT Khalisa Sumber Rezeki**. Seluruh hak cipta dilindungi undang-undang.
