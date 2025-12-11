'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function DashboardPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (!session) {
        router.replace('/admin/login?redirect=/admin/dashboard');
        return;
      }
      setSessionEmail(session.user.email ?? null);
      setLoading(false);
    });
  }, [router, supabase]);

  if (loading) {
    return (
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 16px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>로딩 중...</h1>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>대시보드</h1>
        <p style={{ color: '#4b5563' }}>환영합니다, {sessionEmail}</p>
      </div>

      <section className="card" style={{ display: 'grid', gap: 8 }}>
        <p style={{ margin: 0, color: '#6b7280' }}>관리 기능 바로가기</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a className="btn" href="/admin/generate">
            QR 생성
          </a>
          <a className="btn" href="/admin/history">
            입주자 관리
          </a>
          <a className="btn" href="/admin/logs">
            로그
          </a>
        </div>
      </section>
    </main>
  );
}
