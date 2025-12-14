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
        <h1>로그인이 필요합니다.</h1>
      </main>
    );
  }

  const currentPage = Math.max(1, Number(searchParams?.page ?? '1'));
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // 토큰 기준 조회 (각 QR 토큰마다 카드 1개)
  const { data: tokenRows, count: tokenCount } = await supabase
    .from('qr_tokens')
    .select(
      `
      id,
      token,
      token_version,
      expires_at,
      revoked,
      created_at,
      resident:resident (
        id,
        name,
        email,
        phone,
        unit,
        vehicle_plate,
        vehicle_type,
        status,
        created_at
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  const tokenResidentIds =
    tokenRows?.map((r: any) => r.resident?.id).filter((id: string | null) => Boolean(id)) ?? [];
  const uniqueTokenResidentIds = Array.from(new Set(tokenResidentIds));

  // 관리자/슈퍼관리자 역할 맵
  const { data: adminRows } = await supabase.from('admins').select('user_id,email,role');
  const adminRoles: Record<string, string> = {};
  adminRows?.forEach((a) => {
    if (a.email) adminRoles[a.email] = a.role ?? 'admin';
    if (a.user_id) adminRoles[a.user_id] = a.role ?? 'admin';
  });

  const tokenData =
    tokenRows?.map((r: any) => ({
      id: r.id,
      token: r.token ?? null,
      tokenVersion: r.token_version ?? null,
      expiresAt: r.expires_at ?? null,
      revoked: r.revoked ?? null,
      createdAt: r.created_at,
      resident: r.resident
        ? {
            id: r.resident.id,
            name: r.resident.name,
            email: r.resident.email ?? '',
            phone: r.resident.phone,
            unit: r.resident.unit ?? '',
            vehicle_plate: r.resident.vehicle_plate ?? '',
            vehicle_type: r.resident.vehicle_type ?? '',
            status: r.resident.status ?? '',
          }
        : null,
    })) ?? [];

  // 토큰이 없는 주민도 카드에 포함
  let missingResidents: any[] = [];
  if (uniqueTokenResidentIds.length === 0) {
    const { data: resRows } = await supabase
      .from('resident')
      .select('id,name,email,phone,unit,vehicle_plate,vehicle_type,status,created_at');
    missingResidents = resRows ?? [];
  } else {
    const idsParam = `(${uniqueTokenResidentIds.join(',')})`;
    const { data: resRows } = await supabase
      .from('resident')
      .select('id,name,email,phone,unit,vehicle_plate,vehicle_type,status,created_at')
      .not('id', 'in', idsParam);
    missingResidents = resRows ?? [];
  }

  const missingData = missingResidents.map((r) => ({
    id: crypto.randomUUID(),
    token: null,
    tokenVersion: null,
    expiresAt: null,
    revoked: null,
    createdAt: r.created_at,
    resident: {
      id: r.id,
      name: r.name,
      email: r.email ?? '',
      phone: r.phone,
      unit: r.unit ?? '',
      vehicle_plate: r.vehicle_plate ?? '',
      vehicle_type: r.vehicle_type ?? '',
      status: r.status ?? '',
    },
  }));

  const combinedData = [...tokenData, ...missingData];
  const totalCount = (tokenCount ?? 0) + missingResidents.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pagedData = combinedData.slice(from, to + 1);

  return (
    <HistoryClient
      initialData={pagedData}
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={PAGE_SIZE}
      adminRoles={adminRoles}
    />
  );
}
