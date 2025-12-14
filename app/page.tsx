import Link from 'next/link';
import AdMarquee from '../components/AdMarquee';
import { supabaseServer } from '../lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const supabase = supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let dashboardHref: string | null = null;
  if (session) {
    const { data: admin } = await supabase.from('admins').select('role').eq('user_id', session.user.id).maybeSingle();
    dashboardHref = admin?.role ? '/admin/dashboard' : '/user/dashboard';
    // 로그인 사용자는 홈을 보지 않고 역할별 대시보드로 이동
    redirect(dashboardHref);
  }

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-12">
      <section className="hero">
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>QR Parking ID</p>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>무료 QR 차량 식별·검침 관리</h1>
          <p style={{ margin: 0, fontSize: 15, maxWidth: 640, lineHeight: 1.6, opacity: 0.95 }}>
            QR로 차량 연락처 노출, 도시가스 검침 업로드/입력, 만료 관리까지 한 번에 처리하세요. Supabase와 Next.js 기반으로 손쉽게 배포/운영할 수 있습니다.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            {dashboardHref ? (
              <Link href={dashboardHref} className="btn btn-primary">
                내 대시보드 가기
              </Link>
            ) : (
              <Link href="/login" className="btn btn-primary">
                회원 로그인
              </Link>
            )}
            <Link
              href="/scan"
              className="btn"
              style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
            >
              QR 스캔
            </Link>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>실시간 광고/공지</h2>
        <AdMarquee />
      </section>
    </main>
  );
}
