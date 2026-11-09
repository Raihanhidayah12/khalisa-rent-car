import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'File bukti pembayaran tidak ditemukan.' }, { status: 400 })
    }

    const originalName = file.name || 'bukti-transfer.jpg'
    const ext = (originalName.split('.').pop() || 'jpg').toLowerCase()
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'pdf']
    if (!allowedExts.includes(ext)) {
      return NextResponse.json({ error: 'Format file tidak didukung. Harap upload file gambar (JPG, PNG, WEBP) atau PDF.' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file maksimal 10 MB.' }, { status: 400 })
    }

    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const fileName = `proof_${Date.now()}_${uniqueId}.${ext}`
    const contentType = file.type || (ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`)

    const supabase = createClient(supabaseUrl, supabaseKey)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(fileName, buffer, {
        contentType,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Gagal mengunggah ke penyimpanan: ${uploadError.message}` }, { status: 500 })
    }

    const { data: publicData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      publicUrl: publicData.publicUrl,
      fileName,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan sistem saat unggah bukti pembayaran.' }, { status: 500 })
  }
}
