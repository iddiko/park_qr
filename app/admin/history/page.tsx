import { supabaseServer } from '../../../lib/supabase-server';
import HistoryClient from './HistoryClient';

const PAGE_SIZE = 20;

type Props = {
  searchParams?: { page?: string };
};

export default async function HistoryPage({ searchParams }: Props) {
  const supabase = supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return (
      <main style={{ padding: '24px 16px', maxWidth: 1280, margin: '0 auto' }}>
        <h1>로그인 후 이용해주세요.</h1>
      </main>
    );
  }

  const currentPage = Math.max(1, Number(searchParams?.page ?? '1'));
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: rows, count } = await supabase
    .from('resident')
    .select(
      `
      id,
      name,
      email,
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
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

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
          email: r.email ?? '',
          phone: r.phone,
          unit: r.unit ?? '',
          vehicle_plate: r.vehicle_plate ?? '',
          status: r.status ?? '',
        },
      };
    }) ?? [];

  const totalPages = count ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1;

  return (
    <HistoryClient
      initialData={initialData}
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={PAGE_SIZE}
    />
  );
}
