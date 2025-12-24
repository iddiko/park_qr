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

  // 관리자 여부 확인
  const { data: adminRow } = await supabase
    .from('admins')
    .select('role')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (!adminRow) {
    return NextResponse.json({ error: '관리자만 처리할 수 있습니다.' }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  const { error } = await supabase.from('notifications').update({ done: true }).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

