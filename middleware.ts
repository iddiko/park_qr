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
        get: (name: string) => req.cookies.get(name)?.value,
        getAll: () => req.cookies.getAll(),
        set: (name: string, value: string, options: any) => {
          res.cookies.set(name, value, options);
        },
        setAll: (cookies: { name: string; value: string; options?: any }[]) => {
          cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
        remove: (name: string, _options: any) => {
          res.cookies.delete(name);
        },
      },
    }
  );

  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const isProtected = req.nextUrl.pathname.startsWith(PROTECTED_PREFIX);
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.includes(req.nextUrl.pathname);

  if (isProtected && !session && !isPublicAdminPath) {
    const redirectUrl = new URL('/admin/login', req.nextUrl.origin);
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
