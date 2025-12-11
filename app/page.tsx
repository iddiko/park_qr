import Link from 'next/link';

export default function HomePage() {
  const tiles = [
    { label: '주차장 입구', sub: '입주민 전용 동선', gradient: 'linear-gradient(135deg, #0f172a, #111827, #0b1221)' },
    { label: '방문차량 구역', sub: 'QR 확인 후 안내', gradient: 'linear-gradient(135deg, #1d4ed8, #1e3a8a, #0f172a)' },
    { label: '전기차 충전', sub: '충전 슬롯 안내', gradient: 'linear-gradient(135deg, #0f766e, #0f766e, #0b5b55)' },
    { label: '지상 주차', sub: '야간 보안 순찰', gradient: 'linear-gradient(135deg, #334155, #0f172a, #111827)' },
    { label: '지하 주차', sub: 'CCTV 연동', gradient: 'linear-gradient(135deg, #111827, #0f172a, #020617)' },
  ];

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-8">
      <section className="hero">
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>QR Parking ID</p>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>무료 QR 차량 식별 시스템</h1>
          <p style={{ margin: 0, fontSize: 14, maxWidth: 540, lineHeight: 1.6, opacity: 0.95 }}>
            Next.js + Supabase + Edge Functions 기반의 무료 차량 QR 식별 서비스입니다. 전화번호만 공개되고 상세 정보는
            관리자만 확인합니다.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            <Link href="/admin/login" className="btn btn-primary">
              관리자 로그인
            </Link>
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

      <section className="card" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#fff' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>도시가스 검침 현황</h3>
            <p style={{ margin: '6px 0 10px', color: '#6b7280', fontSize: 13 }}>완료 / 미완료</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#111827' }}>12</div>
              <span style={{ color: '#6b7280', fontSize: 13 }}>완료</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#111827' }}>5</div>
              <span style={{ color: '#6b7280', fontSize: 13 }}>미완료</span>
            </div>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#fff' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>차량 등록 현황</h3>
            <p style={{ margin: '6px 0 10px', color: '#6b7280', fontSize: 13 }}>EV / 일반 차량</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#111827' }}>7</div>
              <span style={{ color: '#6b7280', fontSize: 13 }}>전기차</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#111827' }}>22</div>
              <span style={{ color: '#6b7280', fontSize: 13 }}>일반</span>
            </div>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: 16 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>흐르는 주차장 이미지</h2>
        <div className="marquee">
          <div className="marquee-track">
            {[...tiles, ...tiles].map((tile, idx) => (
              <div
                key={idx}
                className="marquee-item"
                style={{
                  background: tile.gradient,
                  color: '#f8fafc',
                  display: 'grid',
                  gap: 6,
                  alignContent: 'center',
                  padding: '14px',
                  minWidth: 180,
                  borderRadius: 12,
                  boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                }}
              >
                <span style={{ fontSize: 13, opacity: 0.8 }}>{tile.sub}</span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{tile.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
