import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PROTECTED_PREFIX = '/admin';
const PUBLIC_ADMIN_PATHS = ['/admin/login'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options?: Parameters<typeof res.cookies.set>[2]) {
          res.cookies.set(name, value, options);
        },
        remove(name: string) {
          res.cookies.delete(name);
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isProtected = req.nextUrl.pathname.startsWith(PROTECTED_PREFIX);
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.includes(req.nextUrl.pathname);

  if (!session) {
    if (isProtected && !isPublicAdminPath) {
      const redirectUrl = new URL('/admin/login', req.nextUrl.origin);
      redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    return res;
  }

  // admins 테이블에 존재하면 관리자/매니저/슈퍼관리자로 취급
  const { data: adminRow } = await supabase
    .from('admins')
    .select('role')
    .eq('user_id', session.user.id)
    .maybeSingle();

  const isAdmin = !!adminRow;

  // 관리자는 홈(/) 접근 시 관리자 대시보드로 보냄
  if (isAdmin && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  // 비관리자가 /admin 이하 접근 시 사용자 대시보드로 이동
  if (isProtected && !isAdmin && !isPublicAdminPath) {
    return NextResponse.redirect(new URL('/user/dashboard', req.url));
  }

  // 로그인한 비관리자가 홈(/)로 접근하면 바로 사용자 대시보드로 이동
  if (!isAdmin && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/user/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
