export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { name, phone, unit, vehicle_plate, email, password } = await req.json();
    if (!name || !phone || !unit || !email || !password) {
      return NextResponse.json({ error: '필수 값 누락' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !createdUser?.user) {
      return NextResponse.json({ error: createErr?.message ?? '사용자 생성 실패' }, { status: 500 });
    }
    const userId = createdUser.user.id;

    const { error: insertErr } = await supabase
      .from('resident')
      .insert({
        id: userId,
        name,
        phone,
        email,
        unit,
        vehicle_plate: vehicle_plate ?? '',
        status: 'pending',
      })
      .select('id')
      .single();
    if (insertErr) {
      await supabase.auth.admin.deleteUser(userId).catch(() => {});
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, residentId: userId });
  } catch (err: any) {
    console.error('resident register error', err);
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
