'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { supabaseBrowser } from '../../../lib/supabase-browser';

type Resident = {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  unit: string | null;
  vehicle_plate: string | null;
  vehicle_type?: string | null;
};

type TokenRow = {
  id: string;
  token: string | null;
  tokenVersion: number | null;
  expiresAt: string | null;
  revoked: boolean | null;
  createdAt: string | null;
  resident: Resident | null;
};

type Props = {
  initialData: TokenRow[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  adminRoles: Record<string, string>; // email/user_id => role(super_admin|admin)
};

export default function HistoryClient({ initialData, currentPage, totalPages, adminRoles }: Props) {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [rows, setRows] = useState(
    initialData.map((r) => ({
      ...r,
      expiresAtInput: toLocalInput(r.expiresAt),
    }))
  );
  const [savingResidentId, setSavingResidentId] = useState<string | null>(null);
  const [savingTokenId, setSavingTokenId] = useState<string | null>(null);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'lt30' | '30to90' | 'gt90'>('all');

  useEffect(() => {
    rows.forEach((row) => {
      if (row.token && !qrImages[row.id]) {
        const payload = { v: 1, phone: row.resident?.phone ?? '', token: row.token };
        QRCode.toDataURL(JSON.stringify(payload))
          .then((url) => setQrImages((prev) => (prev[row.id] ? prev : { ...prev, [row.id]: url })))
          .catch(() => {});
      }
    });
  }, [rows, qrImages]);

  const filtered = useMemo(() => {
    return rows.filter((row: any) => {
      if (keyword.trim()) {
        const kw = keyword.toLowerCase();
        const name = row.resident?.name?.toLowerCase() ?? '';
        const unit = row.resident?.unit?.toLowerCase() ?? '';
        const email = row.resident?.email?.toLowerCase() ?? '';
        if (!name.includes(kw) && !unit.includes(kw) && !email.includes(kw)) return false;
      }
      if (!row.expiresAt) return true;
      const daysLeft = calcDaysLeft(row.expiresAt);
      if (daysLeft === null) return true;
      if (expiryFilter === 'lt30') return daysLeft < 30;
      if (expiryFilter === '30to90') return daysLeft >= 30 && daysLeft <= 90;
      if (expiryFilter === 'gt90') return daysLeft > 90;
      return true;
    });
  }, [rows, keyword, expiryFilter]);

  function toLocalInput(value: string | null): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  }

  function toISOFromInput(value: string | null): string | null {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  const formatKST = (value: string | null) => {
    if (!value) return '-';
    try {
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Seoul',
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const handleResidentChange = (id: string, field: keyof Resident, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.resident && row.resident.id === id
          ? { ...row, resident: { ...row.resident, [field]: value } }
          : row
      )
    );
  };

  const handleSaveResident = async (resident: Resident | null) => {
    if (!resident) return;
    setSavingResidentId(resident.id);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('resident')
        .update({
          name: resident.name,
          email: resident.email,
          phone: resident.phone,
          unit: resident.unit,
          vehicle_plate: resident.vehicle_plate,
          vehicle_type: resident.vehicle_type,
        })
        .eq('id', resident.id);
      if (error) throw error;
      setMessage('입주자 정보가 저장되었습니다.');
    } catch (err: any) {
      setMessage(err.message ?? '입주자 저장에 실패했습니다.');
    } finally {
      setSavingResidentId(null);
    }
  };

  const handleDeleteToken = async (row: any) => {
    const tokenId = row.id;
    const residentId = row.resident?.id;
    setSavingTokenId(tokenId);
    setMessage(null);
    try {
      if (residentId) {
        await supabase.from('resident').delete().eq('id', residentId);
        setRows((prev) => prev.filter((r: any) => r.resident?.id !== residentId));
      } else {
        await supabase.from('qr_tokens').delete().eq('id', tokenId);
        setRows((prev) => prev.filter((r: any) => r.id !== tokenId));
      }
      setMessage('삭제되었습니다.');
    } catch (err: any) {
      setMessage(err?.message ?? '삭제에 실패했습니다.');
    } finally {
      setSavingTokenId(null);
    }
  };

  const regenerateQRImage = async (row: any) => {
    if (!row.token) return null;
    const payload = { v: 1, phone: row.resident?.phone ?? '', token: row.token };
    const url = await QRCode.toDataURL(JSON.stringify(payload));
    setQrImages((prev) => ({ ...prev, [row.id]: url }));
    return url;
  };

  const handleGenerateQr = async (row: any) => {
    if (!row.resident) return;
    setSavingTokenId(row.id);
    setMessage(null);
    try {
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentId: row.resident.id,
          name: row.resident.name,
          carNumber: row.resident.vehicle_plate || '',
          phone: row.resident.phone,
          exp: expires.toISOString(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'QR 발급에 실패했습니다.');

      const newToken = data?.qrPayload?.token;
      const newExpires = data?.qrTokenRow?.expires_at ?? expires.toISOString();
      setRows((prev) =>
        prev.map((r: any) =>
          r.resident?.id === row.resident.id
            ? {
                ...r,
                token: newToken,
                expiresAt: newExpires,
                expiresAtInput: toLocalInput(newExpires),
              }
            : r
        )
      );
      await regenerateQRImage({ ...row, token: newToken });
      alert('QR이 발급되고 이메일 발송을 시도합니다.');
      await handleSendEmail({ ...row, token: newToken });
    } catch (err: any) {
      alert(err?.message ?? 'QR 발급에 실패했습니다.');
    } finally {
      setSavingTokenId(null);
    }
  };

  const handleSendEmail = async (row: any) => {
    if (!row.resident?.email) {
      alert('이메일이 없어 발송할 수 없습니다.');
      return;
    }
    if (!row.token) {
      alert('토큰이 없어 이메일을 보낼 수 없습니다. 먼저 QR을 발급하세요.');
      return;
    }
    setSavingTokenId(row.id);
    setMessage(null);
    try {
      const qrImage = qrImages[row.id] ?? (await regenerateQRImage(row));
      if (!qrImage) {
        throw new Error('QR 이미지를 만들지 못했습니다. 새로고침 후 다시 시도하세요.');
      }
      const resp = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: row.resident.email,
          name: row.resident.name,
          phone: row.resident.phone,
          vehiclePlate: row.resident.vehicle_plate,
          token: row.token,
          qrImage,
          expiresAt: row.expiresAt,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || '이메일 발송에 실패했습니다.');
      setMessage('이메일을 보냈습니다.');
    } catch (err: any) {
      alert(err?.message ?? '이메일 발송에 실패했습니다.');
    } finally {
      setSavingTokenId(null);
    }
  };

  const goPage = (page: number) => {
    router.push(`/admin/history?page=${page}`);
  };

  return (
    <main style={{ display: 'grid', gap: 16, maxWidth: 1280, margin: '0 auto', padding: '0 12px 24px' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          placeholder="이름, 동/호, 이메일 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', width: 260 }}
        />
        <select
          value={expiryFilter}
          onChange={(e) => setExpiryFilter(e.target.value as any)}
          style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', width: 180 }}
        >
          <option value="all">만료일: 전체</option>
          <option value="lt30">30일 미만</option>
          <option value="30to90">30~90일</option>
          <option value="gt90">90일 이상</option>
        </select>
        {message && <span style={{ color: '#2563eb', fontSize: 13 }}>{message}</span>}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 12,
        }}
      >
        {filtered.map((row: any) => {
          const role = row.resident?.email ? adminRoles[row.resident.email] : undefined;
          const roleColor = role === 'super_admin' ? '#dc2626' : role === 'admin' ? '#2563eb' : '#e5e7eb';
          const daysLeftText = renderDaysLeft(row.expiresAt);
          return (
            <div
              key={row.id}
              style={{
                border: `1px solid ${roleColor}`,
                borderRadius: 14,
                padding: 14,
                background: '#fff',
                display: 'grid',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'grid', gap: 2, fontSize: 12, color: '#6b7280' }}>
                  <span>QR 발급: {formatKST(row.createdAt)}</span>
                  <span>만료: {daysLeftText}</span>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{row.tokenVersion ? `버전 v${row.tokenVersion}` : ''}</div>
              </div>

              <div
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  padding: 10,
                  display: 'grid',
                  gap: 8,
                  background: '#f9fafb',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  {qrImages[row.id] ? (
                    <img src={qrImages[row.id]} alt="QR" style={{ width: 180, margin: '0 auto' }} />
                  ) : (
                    <div style={{ color: '#9ca3af', fontSize: 13 }}>QR 이미지 없음</div>
                  )}
                </div>
                <div style={{ display: 'grid', gap: 6, fontSize: 13, color: '#374151' }}>
                  <div>만료일: {row.expiresAt ? formatKST(row.expiresAt) : '-'}</div>
                </div>
              </div>

              {row.resident ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <Field label="ID" value={row.resident.id ?? ''} readOnly />
                  <Field
                    label="이메일"
                    value={row.resident.email ?? ''}
                    onChange={(v) => handleResidentChange(row.resident!.id, 'email', v)}
                  />
                  <Field
                    label="이름"
                    value={row.resident.name ?? ''}
                    onChange={(v) => handleResidentChange(row.resident!.id, 'name', v)}
                  />
                  <Field
                    label="전화번호"
                    value={row.resident.phone ?? ''}
                    onChange={(v) => handleResidentChange(row.resident!.id, 'phone', v)}
                  />
                  <Field
                    label="동/호"
                    value={row.resident.unit ?? ''}
                    onChange={(v) => handleResidentChange(row.resident!.id, 'unit', v)}
                  />
                  <div style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>차량 정보</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 6 }}>
                      <input
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: 10,
                          padding: '10px 10px',
                          fontSize: 14,
                          width: '100%',
                        }}
                        placeholder="차량번호"
                        value={row.resident.vehicle_plate ?? ''}
                        onChange={(e) => handleResidentChange(row.resident!.id, 'vehicle_plate', e.target.value)}
                      />
                      <select
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: 10,
                          padding: '10px 10px',
                          fontSize: 14,
                          width: '100%',
                        }}
                        value={row.resident.vehicle_type ?? ''}
                        onChange={(e) => handleResidentChange(row.resident!.id, 'vehicle_type', e.target.value)}
                      >
                        <option value="">선택</option>
                        <option value="ice">내연기관</option>
                        <option value="ev">전기차</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#b91c1c', fontSize: 13 }}>입주자 정보를 찾을 수 없습니다.</div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {!row.token ? (
                  <button
                    className="btn btn-primary"
                    style={{ border: 'none', padding: '10px 14px', borderRadius: 10 }}
                    disabled={savingTokenId === row.id}
                    onClick={() => handleGenerateQr(row)}
                  >
                    {savingTokenId === row.id ? '발급 중...' : 'QR 발급'}
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ border: 'none', padding: '10px 14px', borderRadius: 10 }}
                    disabled={savingTokenId === row.id}
                    onClick={() => handleSendEmail(row)}
                  >
                    {savingTokenId === row.id ? '이메일 발송 중...' : 'QR 이메일 보내기'}
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  style={{ border: 'none', padding: '10px 14px', borderRadius: 10 }}
                  disabled={!row.resident || savingResidentId === row.resident.id}
                  onClick={() => handleSaveResident(row.resident)}
                >
                  {savingResidentId === row.resident?.id ? '저장 중...' : '입주자 저장'}
                </button>
                <button
                  className="btn"
                  style={{
                    border: '1px solid #e5e7eb',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: '#fee2e2',
                    color: '#b91c1c',
                  }}
                  disabled={savingTokenId === row.id}
                  onClick={() => handleDeleteToken(row)}
                >
                  삭제
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div
            style={{
              padding: 14,
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              background: '#fff',
              color: '#6b7280',
              fontSize: 14,
            }}
          >
            표시할 데이터가 없습니다.
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 12,
          flexWrap: 'wrap',
        }}
      >
        <button onClick={() => goPage(1)} disabled={currentPage === 1} className="btn">
          처음
        </button>
        <button onClick={() => goPage(currentPage - 1)} disabled={currentPage === 1} className="btn">
          이전
        </button>
        {buildPageNumbers({ currentPage, totalPages }).map((p) => (
          <button
            key={p}
            onClick={() => goPage(p)}
            className="btn"
            style={{
              border: '1px solid #e5e7eb',
              background: p === currentPage ? '#111827' : '#fff',
              color: p === currentPage ? '#fff' : '#111827',
              padding: '6px 10px',
              borderRadius: 8,
            }}
          >
            {p}
          </button>
        ))}
        <button onClick={() => goPage(currentPage + 1)} disabled={currentPage === totalPages} className="btn">
          다음
        </button>
        <button onClick={() => goPage(totalPages)} disabled={currentPage === totalPages} className="btn">
          끝
        </button>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 13, color: '#374151' }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <input
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          padding: '10px 10px',
          fontSize: 14,
          width: '100%',
          ...(readOnly ? { backgroundColor: '#f5f5f5' } : {}),
        }}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
      />
    </label>
  );
}

const calcDaysLeft = (expiresAt: string | null) => {
  if (!expiresAt) return null;
  const now = new Date();
  const exp = new Date(expiresAt);
  const diff = exp.getTime() - now.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const renderDaysLeft = (expiresAt: string | null) => {
  const d = calcDaysLeft(expiresAt);
  if (d === null) return '미설정';
  if (d < 0) return `만료(${d}일)`;
  return `D-${d}`;
};

const buildPageNumbers = ({ currentPage, totalPages }: { currentPage: number; totalPages: number }) => {
  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i += 1) pages.push(i);
  return pages;
};
