export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'gas-readings';
const URL_EXPIRES_SECONDS = 60 * 60 * 24 * 7; // 7일

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const userId = form.get('userId') as string | null;
    const readAt = form.get('readAt') as string | null;
    const note = form.get('note') as string | null;

    if (!file || !userId || !readAt) {
      return NextResponse.json({ error: 'file, userId, readAt가 필요합니다.' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = `${userId}/${Date.now()}-${file.name}`;

    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(filePath, buffer, {
      contentType: file.type || 'image/png',
      upsert: false,
    });
    if (uploadErr) throw uploadErr;

    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, URL_EXPIRES_SECONDS);
    const imageUrl = signed?.signedUrl ?? null;

    // 간단한 OCR 대체: 파일명에서 숫자만 추출 (실제 OCR은 외부 API 연동 필요)
    const digits = file.name.match(/\d+/g);
    const ocrValue = digits ? Number(digits.join('')) : null;

    const { error: insertErr } = await supabase.from('gas_readings').insert({
      user_id: userId,
      reading_value: ocrValue ?? null,
      ocr_value: ocrValue,
      image_url: imageUrl,
      expires_at: new Date(Date.now() + URL_EXPIRES_SECONDS * 1000).toISOString(),
      read_at: new Date(readAt).toISOString(),
      note: note || null,
    });
    if (insertErr) throw insertErr;

    return NextResponse.json({ ok: true, imageUrl, ocrValue });
  } catch (err: any) {
    console.error('gas upload error', err);
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
