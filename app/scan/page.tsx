'use client';

import { Html5Qrcode } from 'html5-qrcode';
import { useEffect, useRef, useState } from 'react';

type ParsedQR = {
  phone?: string;
  token?: string;
  resident?: boolean;
};

export default function ScanPage() {
  const [raw, setRaw] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedQR | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  const startScanner = async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          await scannerRef.current.clear();
        } catch {
          // ignore
        }
      }
      const qr = new Html5Qrcode('qr-reader');
      scannerRef.current = qr;
      await qr.start(
        { facingMode: facing },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => handleDecoded(decodedText),
        () => {}
      );
    } catch (err: any) {
      setMessage(err?.message ?? '카메라를 시작하지 못했습니다.');
    } finally {
      isStartingRef.current = false;
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      }
    } catch {
      // ignore
    }
    scannerRef.current = null;
  };

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
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>QR 스캔</h1>
      <p style={{ color: '#6b7280', margin: 0 }}>QR을 비추면 상단에 결과(입주자 여부, 연락처)가 고정 표시됩니다.</p>

      {/* 상단 고정 결과 카드 */}
      <div
        className="card"
        style={{
          position: 'sticky',
          top: 12,
          zIndex: 5,
          padding: 16,
          border: '2px solid #e5e7eb',
          display: 'grid',
          gap: 10,
          background: '#fff',
        }}
      >
        <p style={{ margin: 0, color: '#6b7280' }}>스캔 결과</p>
        {message && <div style={{ color: '#b91c1c', fontSize: 14 }}>{message}</div>}
        {!message && parsed && (
          <div style={{ display: 'grid', gap: 10 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: parsed.resident ? '#2563eb' : '#dc2626',
              }}
            >
              {parsed.resident ? '입주자' : '미확인'}
            </div>
            <div style={{ fontSize: 16 }}>
              연락처: <strong>{parsed.phone || '없음'}</strong>
            </div>
          </div>
        )}
        {!message && !parsed && <div style={{ color: '#6b7280' }}>아직 스캔한 내용이 없습니다.</div>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button
          className="btn"
          style={{ border: '1px solid #e5e7eb', padding: '8px 12px', borderRadius: 10 }}
          onClick={() => setFacing((prev) => (prev === 'environment' ? 'user' : 'environment'))}
        >
          카메라 전환 ({facing === 'environment' ? '후면' : '전면'})
        </button>
      </div>

      <div id="qr-reader" style={{ width: '100%', minHeight: 320, borderRadius: 12, overflow: 'hidden' }} />

      <textarea
        rows={4}
        placeholder='직접 입력: {"v":1,"phone":"01012345678","token":"..."}'
        onChange={handleManual}
        style={{ width: '100%', borderRadius: 10, border: '1px solid #e5e7eb', padding: 10 }}
      />

      <div className="card" style={{ padding: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}>
        <p style={{ margin: 0, color: '#6b7280' }}>원본 데이터</p>
        {raw ? (
          <pre
            style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12, color: '#6b7280' }}
          >
            {raw}
          </pre>
        ) : (
          <div style={{ color: '#6b7280' }}>스캔된 원본이 없습니다.</div>
        )}
      </div>
    </main>
  );
}
