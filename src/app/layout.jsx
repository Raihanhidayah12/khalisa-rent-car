import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import '../index.css'

export const viewport = {
  themeColor: '#0f172a',
}

export const metadata = {
  metadataBase: new URL('https://www.khalisarental.id'),
  title: {
    default: 'Rental & Sewa Mobil Jakarta Barat Lepas Kunci Murah | Khalisa Rent Car',
    template: '%s | Khalisa Rent Car',
  },
  description:
    'Sewa mobil Jakarta Barat murah 24 jam — lepas kunci atau dengan supir. Pilihan armada lengkap & terawat: Avanza, Innova Reborn, Zenix, Fortuner, Alphard, Hiace. Harga jujur & bisa nego!',
    keywords: [
    'khalisa rental',
    'khalisa',
    'pt khalisa',
    'pt khalisa sumber rezeki',
    'khalisa rent car',
    'khalisa rental mobil',
    'khalisarental.id',
    'rental mobil jakarta',
    'sewa mobil jakarta',
    'rental mobil jakarta barat',
    'sewa mobil jakarta barat',
    'rental mobil terdekat',
    'sewa mobil terdekat',
    'rental mobil lepas kunci jakarta',
    'sewa mobil lepas kunci jakarta',
    'rental mobil dengan supir jakarta',
    'sewa mobil dengan supir jakarta',
    'rental mobil murah jakarta',
    'sewa mobil murah jakarta',
    'rental mobil harian jakarta',
    'sewa mobil mingguan jakarta',
    'sewa mobil bulanan jakarta',
    'rental innova zenix jakarta',
    'sewa innova zenix jakarta',
    'sewa innova reborn jakarta',
    'rental innova reborn jakarta',
    'rental alphard jakarta',
    'sewa alphard jakarta',
    'sewa hiace jakarta',
    'rental hiace premio jakarta',
    'sewa avanza jakarta',
    'rental avanza jakarta barat',
    'rental mobil pengantin jakarta',
    'wedding car rental jakarta',
    'rental mobil mewah jakarta',
    'rental mobil drop off bandara soekarno hatta',
    'rental mobil jabodetabek',
    'sewa mobil tangerang',
    'sewa mobil bekasi',
  ],
  authors: [{ name: 'PT Khalisa Sumber Rezeki' }],
  creator: 'PT Khalisa Sumber Rezeki',
  publisher: 'PT Khalisa Sumber Rezeki',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    url: 'https://www.khalisarental.id/',
    siteName: 'Khalisa Rent Car - PT Khalisa Sumber Rezeki',
    title: 'Rental & Sewa Mobil Jakarta Barat Lepas Kunci Murah | Khalisa Rent Car',
    description:
      'Sewa mobil Jakarta Barat murah 24 jam — lepas kunci atau dengan supir. Pilihan armada lengkap & terawat: Avanza, Innova Reborn, Zenix, Fortuner, Alphard, Hiace. Harga jujur & bisa nego!',
    images: [
      {
        url: '/og-cover.jpg',
        width: 1200,
        height: 630,
        alt: 'Rental Mobil Jakarta Barat Lepas Kunci Murah - Khalisa Rent Car',
      },
    ],
    locale: 'id_ID',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rental & Sewa Mobil Jakarta Barat Lepas Kunci Murah | Khalisa Rent Car',
    description:
      'Sewa mobil Jakarta Barat murah 24 jam — lepas kunci atau dengan supir. Pilihan armada lengkap: Avanza, Innova Reborn, Zenix, Fortuner, Alphard, Hiace. Harga jujur & bisa nego!',
    images: ['/og-cover.jpg'],
  },
  other: {
    thumbnail: 'https://www.khalisarental.id/og-cover.jpg',
    'geo.region': 'ID-JK',
    'geo.placename': 'Jakarta Barat',
    'geo.position': '-6.1944;106.7778',
    ICBM: '-6.1944, 106.7778',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AutoRental',
  name: 'Khalisa Rent Car - PT Khalisa Sumber Rezeki',
  alternateName: ['Khalisa Rental', 'Khalisa Rent Car', 'Khalisa Rental Mobil', 'PT Khalisa', 'Khalisa', 'PT Khalisa Sumber Rezeki'],
  image: 'https://www.khalisarental.id/og-cover.jpg',
  primaryImageOfPage: {
    '@type': 'ImageObject',
    url: 'https://www.khalisarental.id/og-cover.jpg',
    width: 1200,
    height: 630,
  },
  description: 'Sewa mobil Jakarta Barat murah 24 jam — lepas kunci atau dengan supir. Pilihan armada lengkap & terawat: Avanza, Innova Reborn, Zenix, Fortuner, Alphard, Hiace. Harga jujur & bisa nego!',
  url: 'https://www.khalisarental.id/',
  telephone: ['+6281380835156', '+6281277772320'],
  priceRange: 'Rp 850.000 - Rp 3.000.000',
  currenciesAccepted: 'IDR',
  paymentAccepted: 'Cash, Bank Transfer',
  areaServed: [
    { '@type': 'AdministrativeArea', name: 'Jakarta Barat' },
    { '@type': 'AdministrativeArea', name: 'Jakarta Selatan' },
    { '@type': 'AdministrativeArea', name: 'Jakarta Pusat' },
    { '@type': 'AdministrativeArea', name: 'Jakarta Timur' },
    { '@type': 'AdministrativeArea', name: 'Jakarta Utara' },
    { '@type': 'AdministrativeArea', name: 'DKI Jakarta' },
    { '@type': 'AdministrativeArea', name: 'Tangerang' },
    { '@type': 'AdministrativeArea', name: 'Bekasi' },
    { '@type': 'AdministrativeArea', name: 'Depok' },
    { '@type': 'AdministrativeArea', name: 'Bogor' },
    { '@type': 'AdministrativeArea', name: 'Jabodetabek' },
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Layanan Rental Mobil PT Khalisa Sumber Rezeki',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Rental Mobil Lepas Kunci Jakarta' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Sewa Mobil Dengan Supir Jakarta' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Rental Mobil Bulanan Perusahaan' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Sewa Mobil Pengantin Wedding Car Jakarta' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Sewa Innova Zenix dan Innova Reborn Jakarta' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Rental Mobil Alphard Jakarta' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Sewa Hiace Commuter dan Premio Jakarta' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Rental Mobil Drop Off Bandara Soekarno Hatta' } },
    ],
  },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Jl. Gili Sampeng No.26, RT.9/RW.3, Kb. Jeruk',
    addressLocality: 'Jakarta Barat',
    addressRegion: 'DKI Jakarta',
    postalCode: '11530',
    addressCountry: 'ID',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: -6.1944,
    longitude: 106.7778,
  },
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '00:00',
    closes: '23:59',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="image_src" href="https://www.khalisarental.id/og-cover.jpg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
