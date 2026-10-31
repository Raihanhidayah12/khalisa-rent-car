export const metadata = {
  title: 'Syarat, Ketentuan & Kebijakan Privasi',
  description:
    'Syarat dan ketentuan resmi rental mobil lepas kunci dan dengan supir PT Khalisa Sumber Rezeki. Informasi lengkap persyaratan dokumen, tarif, deposit, BBM, toleransi overtime, dan privasi data.',
  alternates: {
    canonical: 'https://www.khalisarental.id/syarat-ketentuan',
  },
  openGraph: {
    title: 'Syarat, Ketentuan & Kebijakan Privasi | Khalisa Rent Car',
    description:
      'Ketentuan resmi sewa mobil lepas kunci & supir PT Khalisa Sumber Rezeki Jakarta. Transparan, aman, dan berbadan hukum.',
    url: 'https://www.khalisarental.id/syarat-ketentuan',
    siteName: 'Khalisa Rent Car - PT Khalisa Sumber Rezeki',
    images: [
      {
        url: '/og-cover.jpg',
        width: 1200,
        height: 630,
        alt: 'Syarat dan Ketentuan Rental Mobil Khalisa',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
}

export default function LegalLayout({ children }) {
  return children
}
