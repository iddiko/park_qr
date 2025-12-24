'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../../lib/supabase-browser';

type ResidentIssue = {
  id: string;
  name: string;
  unit: string | null;
  vehicle_plate: string | null;
  vehicle_type?: string | null;
  issued: number;
  lastIssuedAt: string | null;
};

type GasRow = {
  id: string;
  reading_value: number;
  read_at: string;
  note: string | null;
  user_id: string;
  resident?: { id: string; name: string; unit: string | null } | null;
};

type NotificationRow = {
  id: string;
  type: string;
  done: boolean;
  created_at: string;
  payload: any;
};

export default function DashboardPage() {
  const supabase = supabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [role, setRole] = useState<'super_admin' | 'admin'>('admin');
  const [stats, setStats] = useState({ residents: 0, gas: 0, vehicles: 0, qr: 0 });
  const [residentAll, setResidentAll] = useState<{ id: string; status: string | null; unit: string | null }[]>([]);
  const [issues, setIssues] = useState<ResidentIssue[]>([]);
  const [gasRows, setGasRows] = useState<GasRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        window.location.href = '/admin/login?redirect=/admin/dashboard';
        return;
      }

      const { data: admin } = await supabase
        .from('admins')
        .select('user_id, role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!admin?.user_id) {
        window.location.href = '/user/dashboard';
        return;
      }

      setSessionEmail(session.user.email ?? null);
      if (admin.role === 'super_admin') setRole('super_admin');

      const [resCnt, gasCnt, vehCnt, qrCnt] = await Promise.all([
        supabase.from('resident').select('*', { count: 'exact', head: true }),
        supabase.from('gas_readings').select('*', { count: 'exact', head: true }),
        supabase
          .from('resident')
          .select('vehicle_plate', { count: 'exact', head: true })
          .not('vehicle_plate', 'is', null)
          .neq('vehicle_plate', ''),
        supabase.from('qr_tokens').select('*', { count: 'exact', head: true }),
      ]);
      setStats({
        residents: resCnt.count ?? 0,
        gas: gasCnt.count ?? 0,
        vehicles: vehCnt.count ?? 0,
        qr: qrCnt.count ?? 0,
      });

      const { data: residentRows, error: residentErr } = await supabase
        .from('resident')
        .select('id,name,unit,vehicle_plate,vehicle_type,qr_tokens(id,created_at)')
        .order('created_at', { ascending: false, foreignTable: 'qr_tokens' })
        .limit(100);
      if (residentErr) setMessage(residentErr.message);
      if (residentRows) {
        const mapped: ResidentIssue[] = residentRows.map((r: any) => ({
          id: r.id,
          name: r.name,
          unit: r.unit,
          vehicle_plate: r.vehicle_plate,
          vehicle_type: r.vehicle_type ?? null,
          issued: Array.isArray(r.qr_tokens) ? r.qr_tokens.length : 0,
          lastIssuedAt:
            Array.isArray(r.qr_tokens) && r.qr_tokens.length > 0 ? r.qr_tokens[0].created_at : null,
        }));
        mapped.sort((a, b) => (b.issued || 0) - (a.issued || 0));
        setIssues(mapped);
      }

      const { data: residentAllRows } = await supabase.from('resident').select('id,status,unit,vehicle_plate');
      if (residentAllRows) {
        setResidentAll(
          residentAllRows.map((r: any) => ({
            id: r.id,
            status: r.status ?? null,
            unit: r.unit ?? null,
          }))
        );
      }

      const { data: gasData, error: gasErr } = await supabase
        .from('gas_readings')
        .select('id,reading_value,read_at,note,user_id')
        .order('read_at', { ascending: false })
        .limit(30);
      if (gasErr) setMessage((prev) => prev ?? gasErr.message);
      if (gasData && gasData.length > 0) {
        const ids = Array.from(new Set(gasData.map((g: any) => g.user_id))).filter(Boolean);
        let residentMap: Record<string, { id: string; name: string; unit: string | null }> = {};
        if (ids.length) {
          const { data: residentData } = await supabase
            .from('resident')
            .select('id,name,unit')
            .in('id', ids);
          if (residentData) {
            residentMap = residentData.reduce((acc: any, r: any) => {
              acc[r.id] = { id: r.id, name: r.name, unit: r.unit ?? null };
              return acc;
            }, {});
          }
        }
        const merged: GasRow[] = gasData.map((g: any) => ({
          ...g,
          resident: residentMap[g.user_id] ?? null,
        }));
        setGasRows(merged);
      } else {
        setGasRows([]);
      }

      const { data: notifRows, error: notifErr } = await supabase
        .from('notifications')
        .select('id,type,done,created_at,payload')
        .eq('done', false)
        .order('created_at', { ascending: false })
        .limit(10);
      if (notifErr && !message) setMessage(notifErr.message);
      if (notifRows) setNotifications(notifRows as NotificationRow[]);

      setLoading(false);
    };

    init();
  }, [supabase]);

  const formatKST = (value: string | null) => {
    if (!value) return '-';
    try {
      const dt = new Date(value);
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Seoul',
      }).format(dt);
    } catch {
      return value;
    }
  };

  if (loading) {
    return (
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>불러오는 중...</h1>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          {role === 'super_admin' ? '슈퍼관리자 대시보드' : '관리자 대시보드'}
        </h1>
        <p style={{ color: '#4b5563', margin: 0 }}>Welcome, {sessionEmail}</p>
        {message && <div style={{ marginTop: 6, color: '#b91c1c' }}>{message}</div>}
      </div>

      <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatCard
          label="입주자 수 (전입/전출)"
          value={`${stats.residents.toLocaleString()} (${activeCount(residentAll)}/${inactiveCount(residentAll)})`}
        />
        <StatCard label="가스 검침 (입주자/기록)" value={`${stats.residents}/${stats.gas}`} />
        <StatCard label="차량 등록 수" value={stats.vehicles.toLocaleString()} />
        <StatCard label="QR 발급 수" value={stats.qr.toLocaleString()} />
      </section>

      <section className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>알림</h2>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            미처리 {notifications.filter((n) => !n.done).length}건 / 최근 10건
          </span>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {notifications.filter((n) => !n.done).length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>알림이 없습니다.</div>}
          {notifications.filter((n) => !n.done).map((n) => (
            <div
              key={n.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '10px 12px',
                background: n.done ? '#f8fafc' : '#fff',
                display: 'grid',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700 }}>{n.type}</div>
                <span
                  style={{
                    fontSize: 12,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: n.done ? '#e0f2fe' : '#fee2e2',
                    color: n.done ? '#0369a1' : '#b91c1c',
                  }}
                >
                  {n.done ? '완료' : '미처리'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{new Date(n.created_at).toLocaleString('ko-KR')}</div>
              <pre
                style={{
                  background: '#f8fafc',
                  borderRadius: 8,
                  padding: 8,
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}
              >
                {JSON.stringify(n.payload, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>주민별 QR 발급 현황</h2>
          <span style={{ fontSize: 12, color: '#6b7280' }}>최근 100명 기준</span>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', fontSize: 13, fontWeight: 700 }}>
            <span>이름</span>
            <span>동/호</span>
            <span>차량번호(유형)</span>
            <span>발급 횟수</span>
            <span>마지막 발급</span>
          </div>
          {issues.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
                padding: '8px 0',
                fontSize: 13,
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <span>{r.name}</span>
              <span>{r.unit || '-'}</span>
              <span>
                {r.vehicle_plate || '-'}{' '}
                {r.vehicle_type === 'ev'
                  ? '(전기차)'
                  : r.vehicle_type === 'ice'
                  ? '(내연기관)'
                  : ''}
              </span>
              <span>{r.issued}</span>
              <span>{formatKST(r.lastIssuedAt)}</span>
            </div>
          ))}
          {issues.length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>데이터가 없습니다.</div>}
        </div>
      </section>

      <section className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>최근 가스 검침 기록</h2>
          <span style={{ fontSize: 12, color: '#6b7280' }}>최근 30건</span>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', fontSize: 13, fontWeight: 700 }}>
            <span>입주자</span>
            <span>동/호</span>
            <span>검침값</span>
            <span>검침일시</span>
          </div>
          {gasRows.map((g) => (
            <div
              key={g.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
                padding: '8px 0',
                fontSize: 13,
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <span>{g.resident?.name ?? '-'}</span>
              <span>{g.resident?.unit ?? '-'}</span>
              <span>{g.reading_value}</span>
              <span>{formatKST(g.read_at)}</span>
            </div>
          ))}
          {gasRows.length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>데이터가 없습니다.</div>}
        </div>
      </section>

      <DongSummary gasRows={gasRows} residents={residentAll} />
    </main>
  );
}

function activeCount(list: { status: string | null }[]) {
  return list.filter((r) => (r.status ?? 'active') === 'active').length;
}
function inactiveCount(list: { status: string | null }[]) {
  return list.filter((r) => (r.status ?? 'active') !== 'active').length;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        background: '#fff',
        display: 'grid',
        gap: 6,
      }}
    >
      <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 800 }}>{value}</span>
    </div>
  );
}

function DongSummary({
  gasRows,
  residents,
}: {
  gasRows: GasRow[];
  residents: { id: string; status: string | null; unit: string | null }[];
}) {
  const dongStats = new Map<
    string,
    { residents: number; gas: number; lastReadAt: string | null }
  >();

  residents.forEach((r) => {
    const dong = (r.unit ?? '').split(' ')[0] || '기타';
    const item = dongStats.get(dong) ?? { residents: 0, gas: 0, lastReadAt: null };
    item.residents += 1;
    dongStats.set(dong, item);
  });

  gasRows.forEach((g) => {
    const resident = residents.find((r) => r.id === g.user_id);
    const dong = (resident?.unit ?? '').split(' ')[0] || '기타';
    const item = dongStats.get(dong) ?? { residents: 0, gas: 0, lastReadAt: null };
    item.gas += 1;
    item.lastReadAt = item.lastReadAt ?? g.read_at;
    dongStats.set(dong, item);
  });

  const rows = Array.from(dongStats.entries()).sort((a, b) => a[0].localeCompare(b[0], 'ko'));

  return (
    <section className="card" style={{ padding: 16, display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>동별 현황</h2>
        <span style={{ fontSize: 12, color: '#6b7280' }}>입주자 / 검침 기록</span>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: 13, fontWeight: 700 }}>
          <span>동</span>
          <span>입주자 수</span>
          <span>검침 기록 수</span>
        </div>
        {rows.map(([dong, val]) => (
          <div
            key={dong}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              padding: '8px 0',
              fontSize: 13,
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <span>{dong}</span>
            <span>{val.residents}</span>
            <span>{val.gas}</span>
          </div>
        ))}
        {rows.length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>데이터가 없습니다.</div>}
      </div>
    </section>
  );
}
