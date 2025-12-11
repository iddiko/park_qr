import { supabaseServer } from '@/lib/supabase-server';
import HistoryClient from './HistoryClient';

export default async function HistoryPage() {
  const supabase = supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return (
      <main style={{ padding: '24px 16px', maxWidth: 1280, margin: '0 auto' }}>
        <h1>로그인이 필요합니다.</h1>
      </main>
    );
  }

  // resident + 최근 QR 토큰 가져오기
  const { data: rows } = await supabase
    .from('resident')
    .select(
      `
      id,
      name,
      phone,
      unit,
      vehicle_plate,
      status,
      created_at,
      qr_tokens (
        id,
        token,
        token_version,
        expires_at,
        revoked,
        created_at
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(200);

  const initialData =
    rows?.map((r: any) => {
      const latestToken = Array.isArray(r.qr_tokens) && r.qr_tokens.length > 0 ? r.qr_tokens[0] : null;
      return {
        id: latestToken?.id ?? crypto.randomUUID(),
        token: latestToken?.token ?? null,
        tokenVersion: latestToken?.token_version ?? null,
        expiresAt: latestToken?.expires_at ?? null,
        revoked: latestToken?.revoked ?? null,
        createdAt: latestToken?.created_at ?? r.created_at,
        resident: {
          id: r.id,
          name: r.name,
          phone: r.phone,
          unit: r.unit ?? '',
          vehicle_plate: r.vehicle_plate ?? '',
          status: r.status ?? '',
        },
      };
    }) ?? [];

  return <HistoryClient initialData={initialData} />;
}
