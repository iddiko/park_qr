'use client';

import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect, useState } from 'react';

type ParsedQR = {
  phone?: string;
  token?: string;
  resident?: boolean;
};

export default function ScanPage() {
  const [raw, setRaw] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedQR | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    const onScanSuccess = (decodedText: string) => {
      handleDecoded(decodedText);
    };

    const onScanError = () => {
      // 스캔 실패는 무시 (연속 오류 출력 방지)
    };

    scanner.render(onScanSuccess, onScanError);

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  const handleDecoded = (text: string) => {
    setRaw(text);
    setMessage(null);
    try {
      const obj = JSON.parse(text);
      const phone = obj.phone ?? obj.tel ?? obj.contact ?? '';
      const token = obj.token ?? '';
      setParsed({ phone, token, resident: !!phone });
    } catch {
      setParsed(null);
      setMessage('QR 내용을 읽었지만 JSON 형식이 아닙니다.');
    }
  };

  const handleManual = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleDecoded(e.target.value);
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0 }}>QR 스캔</h1>
      <p style={{ color: '#6b7280', margin: 0 }}>
        카메라로 QR을 비추면 전화번호를 바로 확인할 수 있습니다. (관리자는 토큰으로 전체 정보를 복호화할 수 있습니다.)
      </p>

      <div id="qr-reader" style={{ width: '100%', minHeight: 320, borderRadius: 12, overflow: 'hidden' }} />

      <textarea
        rows={4}
        placeholder='직접 입력: {"v":1,"phone":"01012345678","token":"..."}'
        onChange={handleManual}
        style={{ width: '100%', borderRadius: 10, border: '1px solid #e5e7eb', padding: 10 }}
      />

      <div className="card" style={{ padding: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}>
        <p style={{ margin: 0, color: '#6b7280' }}>스캔 결과</p>
        {message && <div style={{ color: '#b91c1c', fontSize: 13 }}>{message}</div>}
        {!message && parsed && (
          <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
            <div>
              연락처: <strong>{parsed.phone || '없음'}</strong>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              토큰 앞부분: {parsed.token ? parsed.token.slice(0, 10) + '...' : '없음'}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              QR을 스캔하면 여기 결과가 바로 갱신됩니다.
            </div>
          </div>
        )}
        {!message && !parsed && <div style={{ color: '#6b7280' }}>아직 스캔한 내용이 없습니다.</div>}
        {raw && (
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', color: '#2563eb' }}>원본 데이터 보기</summary>
            <pre
              style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12, color: '#6b7280' }}
            >
              {raw}
            </pre>
          </details>
        )}
      </div>
    </main>
  );
}
