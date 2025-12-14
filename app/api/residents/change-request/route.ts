import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: Request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.headers.get('cookie')?.match(new RegExp(`(^|; )${name}=([^;]+)`))?.[2],
        getAll: () => [],
        set: () => {},
        remove: () => {},
      },
    }
  );

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await req.json();
  const payload = {
    email: body.email ?? null,
    phone: body.phone ?? null,
    unit: body.unit ?? null,
    vehicle_plate: body.vehicle_plate ?? null,
    vehicle_type: body.vehicle_type ?? null,
  };

  const { error } = await supabase.from('notifications').insert({
    type: 'resident_change',
    recipient: session.user.email ?? session.user.id,
    payload,
    done: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
