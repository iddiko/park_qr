'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '../../../lib/supabase-browser';

type NotificationRow = {
  id: string;
  type: string;
  recipient: string;
  payload: any;
  done: boolean;
  created_at: string;
};

export default function AdminNotificationsPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace('/admin/login?redirect=/admin/notifications');
        return;
      }
      // 관리자 여부 확인
      const { data: adminRow } = await supabase
        .from('admins')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (!adminRow) {
        router.replace('/admin/login?redirect=/admin/notifications');
        return;
      }

      await loadNotifications();
      setLoading(false);
    };
    init();
  }, [router, supabase]);

  const loadNotifications = async () => {
    setError(null);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('done', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      setError(error.message);
      return;
    }
    setRows((data as NotificationRow[]) ?? []);
  };

  const handleMarkDone = async (id: string) => {
    setError(null);
    const resp = await fetch('/api/notifications/mark-done', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      setError(json?.error || '처리 중 오류가 발생했습니다.');
      return;
    }
    await loadNotifications();
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
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>알림</h1>
        <p style={{ color: '#4b5563' }}>회원 등록·수정·QR 요청 등 알림을 확인하고 완료 처리하세요.</p>
      </div>

      {error && (
        <div style={{ padding: 12, borderRadius: 8, border: '1px solid #fecdd3', background: '#fff1f2', color: '#b91c1c' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {rows.length === 0 && <div style={{ color: '#6b7280' }}>알림이 없습니다.</div>}
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 12,
              background: row.done ? '#f8fafc' : '#fff',
              display: 'grid',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>{row.type}</span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{new Date(row.created_at).toLocaleString('ko-KR')}</span>
              </div>
              <span
                style={{
                  fontSize: 12,
                  padding: '4px 8px',
                  borderRadius: 999,
                  background: row.done ? '#e0f2fe' : '#fee2e2',
                  color: row.done ? '#0369a1' : '#b91c1c',
                }}
              >
                {row.done ? '완료' : '미처리'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#374151' }}>받는이: {row.recipient}</div>
            <pre
              style={{
                background: '#f8fafc',
                borderRadius: 8,
                padding: 10,
                fontSize: 13,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {JSON.stringify(row.payload, null, 2)}
            </pre>
            {!row.done && (
              <button
                onClick={() => handleMarkDone(row.id)}
                style={{
                  alignSelf: 'start',
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  background: '#0f172a',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                완료 처리
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

