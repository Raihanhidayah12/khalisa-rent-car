import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

export async function POST(request) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Konfigurasi Supabase Storage server belum lengkap.' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'File bukti pembayaran tidak ditemukan.' }, { status: 400 })
    }

    const originalName = file.name || 'bukti-transfer.jpg'
    const ext = (originalName.split('.').pop() || 'jpg').toLowerCase()
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'pdf']
    if (!allowedExts.includes(ext)) {
      return NextResponse.json({
        error: 'Format file tidak didukung. Harap upload file gambar (JPG, PNG, WEBP) atau dokumen PDF.',
      }, { status: 400 })
    }

    // Batas aman serverless payload (4.5 MB)
    const MAX_FILE_BYTES = 4.5 * 1024 * 1024
    if (file.size > MAX_FILE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      return NextResponse.json({
        error: `Ukuran file bukti pembayaran terlalu besar (${sizeMB} MB). Maksimal ukuran file yang diizinkan server adalah 4.5 MB. Harap kompresi foto atau gunakan foto dengan resolusi lebih kecil.`,
      }, { status: 413 })
    }

    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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
      const errMsg = uploadError.message || ''
      if (
        errMsg.toLowerCase().includes('size') ||
        errMsg.toLowerCase().includes('payload') ||
        uploadError.statusCode === '413'
      ) {
        return NextResponse.json({
          error: 'Ukuran file bukti pembayaran melebihi batas kuota penyimpanan Supabase. Harap pilih foto yang lebih kecil.',
        }, { status: 413 })
      }
      return NextResponse.json({
        error: `Gagal mengunggah ke penyimpanan cloud: ${uploadError.message || 'Penyimpanan menolak file'}`,
      }, { status: 500 })
    }

    const { data: publicData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      publicUrl: publicData.publicUrl,
      fileName,
    })
  } catch (err) {
    return NextResponse.json({
      error: err.message || 'Terjadi kesalahan sistem saat memproses bukti pembayaran.',
    }, { status: 500 })
  }
}
