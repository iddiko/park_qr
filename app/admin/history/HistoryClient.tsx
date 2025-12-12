'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '../../../lib/supabase-browser';
import QRCode from 'qrcode';

type Resident = {
  id: string;
  name: string;
  phone: string;
  unit: string | null;
  vehicle_plate: string | null;
  status: string | null;
  email?: string | null;
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
};

export default function HistoryClient({ initialData, currentPage, totalPages }: Props) {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [rows, setRows] = useState(
    initialData.map((r) => ({
      ...r,
      expiresAtInput: toLocalInput(r.expiresAt),
      editingExpiry: false,
    }))
  );
  const [savingResidentId, setSavingResidentId] = useState<string | null>(null);
  const [savingTokenId, setSavingTokenId] = useState<string | null>(null);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');

  // 토큰이 있는 행에 대해 QR 이미지를 미리 생성
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
      const dt = new Date(value);
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Seoul',
      }).format(dt);
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

  const handleTokenChange = (id: string, field: 'status' | 'expiresAtInput', value: string | boolean) => {
    setRows((prev) =>
      prev.map((row: any) =>
        row.id === id
          ? {
              ...row,
              revoked: field === 'status' ? Boolean(value) : row.revoked,
              expiresAtInput: field === 'expiresAtInput' ? (value as string) : row.expiresAtInput,
            }
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
          status: resident.status,
        })
        .eq('id', resident.id);
      if (error) throw error;
      setMessage('입주자 정보가 저장되었습니다.');
    } catch (err: any) {
      setMessage(err.message ?? '저장에 실패했습니다.');
    } finally {
      setSavingResidentId(null);
    }
  };

  const handleSaveToken = async (row: any) => {
    setSavingTokenId(row.id);
    setMessage(null);
    try {
      const expiresIso = row.expiresAtInput ? toISOFromInput(row.expiresAtInput) : null;
      const { error } = await supabase
        .from('qr_tokens')
        .update({
          revoked: row.revoked ?? false,
          expires_at: expiresIso,
        })
        .eq('id', row.id);
      if (error) throw error;
      setMessage('토큰 상태/만료일이 저장되었습니다.');
    } catch (err: any) {
      setMessage(err?.message ?? '저장에 실패했습니다.');
    } finally {
      setSavingTokenId(null);
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
      setMessage('삭제했습니다.');
    } catch (err: any) {
      setMessage(err?.message ?? '삭제에 실패했습니다.');
    } finally {
      setSavingTokenId(null);
    }
  };

  const filtered = rows.filter((row: any) => {
    if (!keyword.trim()) return true;
    const kw = keyword.toLowerCase();
    const name = row.resident?.name?.toLowerCase() ?? '';
    const unit = row.resident?.unit?.toLowerCase() ?? '';
    return name.includes(kw) || unit.includes(kw);
  });

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
      expires.setFullYear(expires.getFullYear() + 1); // 기본 1년
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
      if (!resp.ok) throw new Error(data?.error || 'QR 생성 실패');

      const newToken = data?.qrPayload?.token;
      const newExpires = data?.qrTokenRow?.expires_at ?? expires.toISOString();
      // 상태 업데이트
      setRows((prev) =>
        prev.map((r: any) =>
          r.id === row.id
            ? {
                ...r,
                token: newToken,
                expiresAt: newExpires,
                expiresAtInput: toLocalInput(newExpires),
                createdAt: data?.qrTokenRow?.created_at ?? r.createdAt,
              }
            : r
        )
      );
      const url = await regenerateQRImage({ ...row, token: newToken });
      if (url) setQrImages((prev) => ({ ...prev, [row.id]: url }));
      setMessage('QR이 생성되었습니다.');
    } catch (err: any) {
      setMessage(err?.message ?? 'QR 생성 실패');
    } finally {
      setSavingTokenId(null);
    }
  };

  const handleSendEmail = async (row: any) => {
    if (!row.token || !row.resident?.email) {
      setMessage('토큰 또는 이메일이 없습니다.');
      return;
    }
    setSavingTokenId(row.id);
    setMessage(null);
    try {
      let png: string | null = qrImages[row.id] ?? null;
      if (!png) {
        png = await regenerateQRImage(row);
      }
      if (!png) throw new Error('QR 이미지 생성 실패');

      const subject = 'QR 발급 안내';
      const html = `
        <div>
          <p>안녕하세요, ${row.resident.name}님.</p>
          <p>차량번호: ${row.resident.vehicle_plate ?? '-'} / 전화번호: ${row.resident.phone ?? '-'}</p>
          <p>QR 코드가 첨부되었습니다.</p>
        </div>
      `;

      const resp = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: row.resident.email,
          subject,
          html,
          pngDataUrl: png,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || '메일 전송 실패');
      setMessage('메일이 전송되었습니다.');
    } catch (err: any) {
      setMessage(err?.message ?? '메일 전송 실패');
    } finally {
      setSavingTokenId(null);
    }
  };

  const goPage = (page: number) => {
    const safe = Math.min(Math.max(1, page), totalPages);
    router.push(`/admin/history?page=${safe}`);
  };

  const buildPageNumbers = () => {
    const maxButtons = 10;
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxButtons + 1);
    }
    const pages = [];
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  };

  return (
    <main style={{ display: 'grid', gap: 16, maxWidth: 1280, margin: '0 auto' }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>입주자 관리</h1>
        <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 13 }}>
          생성된 QR 이력은 유지되며 토큰은 수정 불가합니다. 입주민 정보만 수정 가능합니다. 새 QR 발급이 필요하면
          이 카드에서 바로 생성하세요.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          style={{
            flex: 1,
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 14,
          }}
          placeholder="이름 또는 동/호 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

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

      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        }}
      >
        {filtered.map((row: any) => (
          <div
            key={row.id}
            className="card"
            style={{
              padding: 14,
              display: 'grid',
              gap: 10,
              border: '1px solid #e5e7eb',
              background: '#fff',
            }}
          >
            <div style={{ display: 'grid', gap: 6, fontSize: 13, color: '#6b7280' }}>
              <span>QR 생성: {formatKST(row.createdAt)}</span>
              {qrImages[row.id] && (
                <div style={{ marginTop: 4 }}>
                  <img
                    src={qrImages[row.id]}
                    alt="QR 코드"
                    style={{ width: '100%', maxWidth: 200, border: '1px solid #e5e7eb', borderRadius: 8 }}
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>만료일:</span>
                {row.editingExpiry ? (
                  <input
                    type="datetime-local"
                    value={row.expiresAtInput || ''}
                    onChange={(e) => handleTokenChange(row.id, 'expiresAtInput', e.target.value)}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: '6px 8px',
                      fontSize: 13,
                    }}
                  />
                ) : (
                  <span>{row.expiresAt ? formatKST(row.expiresAt) : '미설정'}</span>
                )}
                <button
                  onClick={() =>
                    setRows((prev) =>
                      prev.map((r: any) =>
                        r.id === row.id ? { ...r, editingExpiry: !r.editingExpiry } : r
                      )
                    )
                  }
                  style={{
                    border: '1px solid #e5e7eb',
                    background: '#f8fafc',
                    borderRadius: 8,
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  {row.editingExpiry ? '저장' : '수정'}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>상태:</span>
                <button
                  onClick={() => handleTokenChange(row.id, 'status', row.revoked ? false : true)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    background: row.revoked ? '#fee2e2' : '#dcfce7',
                    color: row.revoked ? '#b91c1c' : '#166534',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  {row.revoked ? '비활성' : '활성'}
                </button>
              </div>
            </div>

            {row.resident ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <Field label="ID" value={row.resident.id ?? ''} readOnly />
                <Field
                  label="이메일"
                  value={row.resident.email ?? ''}
                  onChange={(v) => handleResidentChange(row.resident!.id, 'email', v)}
                />
                <Field
                  label={`QR 생성: ${formatKST(row.createdAt)}`}
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
                <Field
                  label="차량번호"
                  value={row.resident.vehicle_plate ?? ''}
                  onChange={(v) => handleResidentChange(row.resident!.id, 'vehicle_plate', v)}
                />
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
                  {savingTokenId === row.id ? '생성 중...' : 'QR 생성'}
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ border: 'none', padding: '10px 14px', borderRadius: 10 }}
                  disabled={savingTokenId === row.id}
                  onClick={() => handleSendEmail(row)}
                >
                  {savingTokenId === row.id ? '발송 중...' : 'QR 메일 보내기'}
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
        ))}
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
            검색 결과가 없습니다.
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
          « 처음
        </button>
        <button onClick={() => goPage(currentPage - 1)} disabled={currentPage === 1} className="btn">
          ‹ 이전
        </button>
        {buildPageNumbers().map((p) => (
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
          다음 ›
        </button>
        <button onClick={() => goPage(totalPages)} disabled={currentPage === totalPages} className="btn">
          끝 »
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
          ...(readOnly ? { backgroundColor: '#f5f5f5' } : {}),
        }}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
      />
    </label>
  );
}
