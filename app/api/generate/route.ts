export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { residentId, name, carNumber, phone, exp } = body ?? {};
    if (!residentId || !name || !carNumber || !phone || !exp) {
      return NextResponse.json({ error: '필수 값 누락' }, { status: 400 });
    }

    const expiresAt = new Date(exp);
    if (Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json({ error: '유효하지 않은 exp' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 주민 정보 upsert
    const { error: residentErr } = await supabase
      .from('resident')
      .upsert(
        {
          id: residentId,
          name,
          phone,
          unit: '',
          vehicle_plate: carNumber,
          status: 'active',
        },
        { onConflict: 'id' }
      );
    if (residentErr) throw residentErr;

    const token = crypto.randomUUID();
    const qrPayload = { v: 1, phone, token };
    const qrString = JSON.stringify(qrPayload);

    const { data: qrRow, error: tokenErr } = await supabase
      .from('qr_tokens')
      .insert({
        id: crypto.randomUUID(),
        resident_id: residentId,
        token,
        token_version: 1,
        expires_at: expiresAt.toISOString(),
        revoked: false,
      })
      .select()
      .single();
    if (tokenErr) throw tokenErr;

    return NextResponse.json({ qrPayload, qrString, qrTokenRow: qrRow });
  } catch (err: any) {
    console.error('qr generation error', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
