'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { supabaseBrowser } from '../../../lib/supabase-browser';
import AdMarquee from '../../../components/AdMarquee';

type GasReading = {
  id: string;
  reading_value: number;
  read_at: string;
  note: string | null;
  image_url?: string | null;
  ocr_value?: number | null;
  expires_at?: string | null;
};

export default function UserDashboardPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [resident, setResident] = useState<any>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [gasReadings, setGasReadings] = useState<GasReading[]>([]);
  const [gasForm, setGasForm] = useState({ reading: '', readAt: '', note: '' });
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [changeForm, setChangeForm] = useState({
    email: '',
    phone: '',
    unit: '',
    vehicle_plate: '',
    vehicle_type: 'ice' as 'ice' | 'ev',
  });

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace('/login?redirect=/user/dashboard');
        return;
      }

      // 관리자는 관리자 대시보드로 우선 이동
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
        vehicle_type,
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
      setChangeForm({
        email: data.email ?? '',
        phone: data.phone ?? '',
        unit: data.unit ?? '',
        vehicle_plate: data.vehicle_plate ?? '',
        vehicle_type: (data.vehicle_type as 'ice' | 'ev') ?? 'ice',
      });
    }
  };

  const loadGasReadings = async (userId: string) => {
    const { data } = await supabase
      .from('gas_readings')
      .select('*')
      .eq('user_id', userId)
      .order('read_at', { ascending: false })
      .limit(20);
    setGasReadings((data as GasReading[]) ?? []);
  };

  const handleGasSubmit = async () => {
    setMessage(null);
    if (!gasForm.readAt) {
      setMessage('검침일시를 입력해 주세요.');
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      router.replace('/login?redirect=/user/dashboard');
      return;
    }
    if (file) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('userId', userId);
      fd.append('readAt', gasForm.readAt);
      fd.append('note', gasForm.note);
      const resp = await fetch('/api/gas/upload', { method: 'POST', body: fd });
      const data = await resp.json();
      if (!resp.ok) {
        setMessage(data?.error || '이미지 업로드에 실패했습니다.');
        return;
      }
      setMessage('검침이 등록되었습니다. (이미지 OCR 시도)');
    } else {
      const readingValue = Number(gasForm.reading);
      if (!readingValue) {
        setMessage('검침값을 숫자로 입력해 주세요.');
        return;
      }
      const resp = await fetch('/api/gas/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          reading: readingValue,
          readAt: gasForm.readAt,
          note: gasForm.note,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setMessage(data?.error || '검침 등록에 실패했습니다.');
        return;
      }
      setMessage('검침이 등록되었습니다.');
    }
    setGasForm({ reading: '', readAt: '', note: '' });
    setFile(null);
    await loadGasReadings(userId);
  };

  const handleChangeRequest = async () => {
    setMessage(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      router.replace('/login?redirect=/user/dashboard');
      return;
    }
    const payload = {
      ...changeForm,
      vehicle_type: changeForm.vehicle_type,
    };
    const resp = await fetch('/api/residents/change-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (!resp.ok) {
      setMessage(data?.error || '변경 요청에 실패했습니다.');
      return;
    }
    setMessage('변경 요청이 접수되었습니다. 관리자가 확인 후 반영합니다.');
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
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>불러오는 중...</h1>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>내 입주자 대시보드</h1>
        <p style={{ color: '#4b5563' }}>내 QR과 가스 검침을 관리할 수 있습니다.</p>
      </div>

      <section className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>광고 / 공지</h2>
        <AdMarquee />
      </section>

      <section
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          alignItems: 'start',
        }}
      >
        {/* 왼쪽: 가스 검침 입력/목록 */}
        <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>가스 검침 입력</h2>
            <span style={{ fontSize: 13, color: '#6b7280' }}>최근 20건</span>
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
              <input
                type="file"
                accept="image/*"
                style={{ flex: 1 }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <span style={{ fontSize: 12, color: '#6b7280' }}>이미지 업로드 시 1주 보관(OCR 시도)</span>
            </div>
            <button className="btn btn-primary" onClick={handleGasSubmit} style={{ padding: '12px', borderRadius: 10 }}>
              검침 제출
            </button>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {gasReadings.length === 0 && <div style={{ color: '#6b7280' }}>등록된 검침이 없습니다.</div>}
            {gasReadings.map((r) => (
              <div
                key={r.id}
                style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', background: '#fff' }}
              >
                <div style={{ fontWeight: 700 }}>{formatDate(r.read_at)}</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: 14 }}>검침값: {r.reading_value}</span>
                  {r.note && <span style={{ fontSize: 13, color: '#6b7280' }}>{r.note}</span>}
                  {r.ocr_value && <span style={{ fontSize: 12, color: '#16a34a' }}>OCR: {r.ocr_value}</span>}
                  {r.image_url && (
                    <a href={r.image_url} style={{ fontSize: 12, color: '#2563eb' }} target="_blank" rel="noreferrer">
                      이미지 보기
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 차량/QR 정보 */}
        <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>차량 정보 & QR</h2>
          {resident ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <div>이름: {resident.name}</div>
              <div>이메일: {resident.email ?? '-'}</div>
              <div>전화번호: {resident.phone}</div>
              <div>동/호: {resident.unit ?? '-'}</div>
              <div>
                차량번호: {resident.vehicle_plate ?? '-'}{' '}
                {resident.vehicle_type === 'ev'
                  ? '(전기차)'
                  : resident.vehicle_type === 'ice'
                  ? '(내연기관)'
                  : ''}
              </div>
              <div>상태: {resident.status ?? '-'}</div>
              {qrImage ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>QR 이미지</div>
                  <img
                    src={qrImage}
                    alt="QR 코드"
                    style={{ width: 200, height: 200, objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: 12 }}
                  />
                </div>
              ) : (
                <div style={{ color: '#b91c1c' }}>
                  QR 발급 기록이 없습니다. 관리자가 QR을 발급해 주면 이곳에 표시됩니다.
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: '#b91c1c' }}>입주자 정보를 찾지 못했습니다.</div>
          )}

          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>정보 수정 요청</h3>
            <input
              type="email"
              placeholder="이메일"
              value={changeForm.email}
              onChange={(e) => setChangeForm((p) => ({ ...p, email: e.target.value }))}
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
            />
            <input
              type="text"
              placeholder="전화번호"
              value={changeForm.phone}
              onChange={(e) => setChangeForm((p) => ({ ...p, phone: e.target.value }))}
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
            />
            <input
              type="text"
              placeholder="동/호"
              value={changeForm.unit}
              onChange={(e) => setChangeForm((p) => ({ ...p, unit: e.target.value }))}
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
            />
            <input
              type="text"
              placeholder="차량번호"
              value={changeForm.vehicle_plate}
              onChange={(e) => setChangeForm((p) => ({ ...p, vehicle_plate: e.target.value }))}
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
            />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="radio"
                  name="vehicle_type"
                  checked={changeForm.vehicle_type === 'ice'}
                  onChange={() => setChangeForm((p) => ({ ...p, vehicle_type: 'ice' }))}
                />
                내연기관
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="radio"
                  name="vehicle_type"
                  checked={changeForm.vehicle_type === 'ev'}
                  onChange={() => setChangeForm((p) => ({ ...p, vehicle_type: 'ev' }))}
                />
                전기차
              </label>
            </div>
            <button className="btn btn-primary" onClick={handleChangeRequest} style={{ padding: '12px', borderRadius: 10 }}>
              변경 요청 보내기
            </button>
          </div>
        </div>
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
