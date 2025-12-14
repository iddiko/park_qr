export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { reading, readAt, note, userId } = await req.json();
    if (!reading || !readAt || !userId) {
      return NextResponse.json({ error: '필수 값(reading, readAt, userId)이 누락되었습니다.' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const valueNum = Number(reading);
    if (Number.isNaN(valueNum)) {
      return NextResponse.json({ error: '검침값은 숫자여야 합니다.' }, { status: 400 });
    }

    const { error } = await supabase.from('gas_readings').insert({
      user_id: userId,
      reading_value: valueNum,
      read_at: new Date(readAt).toISOString(),
      note: note || null,
    });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('gas submit error', err);
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
