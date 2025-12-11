import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        getAll() {
          return cookieStore.getAll().map((c) => ({
            name: c.name,
            value: c.value,
          }));
        },
        /**
         * Supabase SSR requires set/setAll/remove for middleware/server usage.
         * In Next.js app router, writing cookies here mutates the response headers.
         */
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        setAll(cookies: { name: string; value: string; options?: any }[]) {
          cookies.forEach((c) => cookieStore.set(c));
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
