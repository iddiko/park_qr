'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { supabaseBrowser } from '../../../lib/supabase-browser';

type GasReading = {
  id: string;
  reading_value: number;
  read_at: string;
  note: string | null;
};

export default function UserDashboardPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [resident, setResident] = useState<any>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [gasReadings, setGasReadings] = useState<GasReading[]>([]);
  const [gasForm, setGasForm] = useState({ reading: '', readAt: '', note: '' });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace('/login?redirect=/user/dashboard');
        return;
      }

      // 관리자면 관리자 대시보드로
      const { data: admin } = await supabase.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
      if (admin?.user_id) {
        router.replace('/admin/dashboard');
        return;
      }

      await loadResident(session.user.id);
      await loadGasReadings(session.user.id);
      setLoading(false);
    };
    init();
  }, [router, supabase]);

  const loadResident = async (userId: string) => {
    const { data } = await supabase
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
        qr_tokens (
          token,
          expires_at,
          created_at
        )
      `
      )
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setResident(data);
      const token = data.qr_tokens?.[0]?.token;
      if (token) {
        const payload = { v: 1, phone: data.phone ?? '', token };
        const url = await QRCode.toDataURL(JSON.stringify(payload));
        setQrImage(url);
      }
    }
  };

  const loadGasReadings = async (userId: string) => {
    const { data } = await supabase
      .from('gas_readings')
      .select('*')
      .eq('user_id', userId)
      .order('read_at', { ascending: false })
      .limit(12);
    setGasReadings((data as GasReading[]) ?? []);
  };

  const handleGasSubmit = async () => {
    setMessage(null);
    const readingValue = Number(gasForm.reading);
    if (!readingValue || !gasForm.readAt) {
      setMessage('검침값과 검침일시를 입력해 주세요.');
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      router.replace('/login?redirect=/user/dashboard');
      return;
    }
    const { error } = await supabase.from('gas_readings').insert({
      user_id: userId,
      reading_value: readingValue,
      read_at: new Date(gasForm.readAt).toISOString(),
      note: gasForm.note || null,
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    setGasForm({ reading: '', readAt: '', note: '' });
    await loadGasReadings(userId);
    setMessage('검침이 등록되었습니다.');
  };

  const formatDate = (value: string | null) => {
    if (!value) return '-';
    try {
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Seoul',
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

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
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>내 대시보드</h1>
        <p style={{ color: '#4b5563' }}>도시가스 검침 및 차량 QR 정보를 확인하세요.</p>
      </div>

      <section className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>도시가스 검침</h2>
          <span style={{ fontSize: 13, color: '#6b7280' }}>최근 12건</span>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <input
            type="number"
            placeholder="검침값 (숫자)"
            value={gasForm.reading}
            onChange={(e) => setGasForm((p) => ({ ...p, reading: e.target.value }))}
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
          />
          <input
            type="datetime-local"
            placeholder="검침일시"
            value={gasForm.readAt}
            onChange={(e) => setGasForm((p) => ({ ...p, readAt: e.target.value }))}
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
          />
          <textarea
            placeholder="비고 (선택)"
            value={gasForm.note}
            onChange={(e) => setGasForm((p) => ({ ...p, note: e.target.value }))}
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb', minHeight: 60 }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="file" accept="image/*" style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: '#6b7280' }}>사진 인식(OCR)은 추후 연동 예정</span>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleGasSubmit}
            style={{ padding: '12px', borderRadius: 10 }}
          >
            검침 입력
          </button>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {gasReadings.length === 0 && <div style={{ color: '#6b7280' }}>등록된 검침 내역이 없습니다.</div>}
          {gasReadings.map((r) => (
            <div
              key={r.id}
              style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', background: '#fff' }}
            >
              <div style={{ fontWeight: 700 }}>{formatDate(r.read_at)}</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 14 }}>검침값: {r.reading_value}</span>
                {r.note && <span style={{ fontSize: 13, color: '#6b7280' }}>{r.note}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>차량/QR 정보</h2>
        {resident ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <div>이름: {resident.name}</div>
            <div>이메일: {resident.email ?? '-'}</div>
            <div>전화번호: {resident.phone}</div>
            <div>동/호: {resident.unit ?? '-'}</div>
            <div>차량번호: {resident.vehicle_plate ?? '-'}</div>
            <div>상태: {resident.status ?? '-'}</div>
            {qrImage ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>QR 코드</div>
                <img
                  src={qrImage}
                  alt="QR 코드"
                  style={{ width: 200, height: 200, objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: 12 }}
                />
              </div>
            ) : (
              <div style={{ color: '#b91c1c' }}>QR 토큰이 없습니다. 관리자에게 발급을 요청해 주세요.</div>
            )}
          </div>
        ) : (
          <div style={{ color: '#b91c1c' }}>입주자 정보가 없습니다.</div>
        )}
      </section>

      {message && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            background: '#f8fafc',
            color: '#0f172a',
            fontSize: 13,
          }}
        >
          {message}
        </div>
      )}
    </main>
  );
}
