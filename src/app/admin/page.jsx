'use client'

import dynamic from 'next/dynamic'

const AdminDashboard = dynamic(() => import('../../AdminDashboard'), {
  ssr: false,
  loading: () => (
    <main className="grid min-h-screen place-items-center bg-slate-ice text-muted" role="status">
      <div className="grid justify-items-center gap-3">
        <span className="size-8 animate-spin rounded-full border-2 border-line border-t-crimson" aria-hidden="true" />
        <p className="text-[.85rem] font-medium">Memuat Dashboard Admin...</p>
      </div>
    </main>
  ),
})

export default function AdminPage() {
  return <AdminDashboard />
}
