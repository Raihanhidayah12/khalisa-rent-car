import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import '../index.css'

export const viewport = {
  themeColor: '#0f172a',
}

export const metadata = {
  metadataBase: new URL('https://www.khalisarental.id'),
  title: {
    default: 'PT Khalisa Sumber Rezeki | Rental Mobil Jakarta',
    template: '%s | PT Khalisa Sumber Rezeki',
  },
  description:
    'Rental mobil Jakarta & sekitarnya oleh PT Khalisa Sumber Rezeki. Sewa harian, mingguan, hingga bulanan — dengan supir atau lepas kunci. Harga transparan, armada terawat, siap 24 jam.',
  keywords: [
    'rental mobil jakarta',
    'sewa mobil jakarta barat',
    'sewa innova zenix jakarta',
    'sewa alphard jakarta',
    'rental mobil pengantin jakarta',
    'rental mobil lepas kunci jakarta',
    'sewa mobil dengan supir jakarta',
  ],
  authors: [{ name: 'PT Khalisa Sumber Rezeki' }],
  creator: 'PT Khalisa Sumber Rezeki',
  publisher: 'PT Khalisa Sumber Rezeki',
  icons: {
    icon: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    url: 'https://www.khalisarental.id/',
    siteName: 'PT Khalisa Sumber Rezeki',
    title: 'PT Khalisa Sumber Rezeki | Rental Mobil Jakarta',
    description:
      'Sewa mobil harian, mingguan, hingga bulanan di Jakarta & sekitarnya — dengan supir atau lepas kunci. Harga transparan, armada terawat, siap 24 jam.',
    images: [
      {
        url: '/og-cover.jpg',
        width: 1200,
        height: 630,
        alt: 'PT Khalisa Sumber Rezeki Rental Mobil Jakarta',
      },
    ],
    locale: 'id_ID',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PT Khalisa Sumber Rezeki | Rental Mobil Jakarta',
    description:
      'Sewa mobil harian, mingguan, hingga bulanan di Jakarta & sekitarnya — dengan supir atau lepas kunci.',
    images: ['/og-cover.jpg'],
  },
  other: {
    'geo.region': 'ID-JK',
    'geo.placename': 'Jakarta Barat',
    'geo.position': '-6.1944;106.7778',
    ICBM: '-6.1944, 106.7778',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AutoRental',
  name: 'PT Khalisa Sumber Rezeki',
  image: 'https://www.khalisarental.id/og-cover.jpg',
  url: 'https://www.khalisarental.id/',
  telephone: ['+6281380835156', '+6281277772320'],
  priceRange: 'Rp 850.000 - Rp 3.000.000',
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
        <link rel="icon" type="image/png" href="/favicon.png" />
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
