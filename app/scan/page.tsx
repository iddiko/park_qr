'use client';

import { useEffect, useRef, useState } from 'react';

type ParsedQR = {
  phone?: string;
  token?: string;
  resident?: boolean;
};

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedQR | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      })
      .catch(() => {
        setMessage('카메라 접근이 차단되었습니다. 브라우저 권한을 확인하세요.');
      });
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleManual = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRaw(text);
    setMessage(null);
    try {
      const obj = JSON.parse(text);
      const phone = obj.phone ?? obj.tel ?? obj.contact ?? '';
      const token = obj.token ?? '';
      setParsed({ phone, token, resident: !!phone });
    } catch {
      setParsed(null);
      setMessage('JSON을 읽을 수 없습니다. QR에서 복사한 JSON을 붙여넣어 주세요.');
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0 }}>QR 스캔</h1>
      <p style={{ color: '#6b7280', margin: 0 }}>
        카메라로 QR을 인식하면 연락처와 입주자 여부가 표시됩니다. (테스트용으로 QR JSON을 아래에 붙여넣을 수도 있습니다.)
      </p>
      <video ref={videoRef} style={{ width: '100%', maxHeight: 320, background: '#000' }} muted playsInline />
      <textarea
        rows={4}
        placeholder='테스트용: {"v":1,"phone":"01012345678","token":"..."}'
        onChange={handleManual}
        style={{ width: '100%', borderRadius: 10, border: '1px solid #e5e7eb', padding: 10 }}
      />
      <div className="card" style={{ padding: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}>
        <p style={{ margin: 0, color: '#6b7280' }}>스캔 결과</p>
        {message && <div style={{ color: '#b91c1c', fontSize: 13 }}>{message}</div>}
        {!message && parsed && (
          <div style={{ display: 'grid', gap: 6, fontSize: 14 }}>
            <div>
              입주자 여부: <strong>{parsed.resident ? '입주자' : '확인 불가'}</strong>
            </div>
            <div>
              연락처: <strong>{parsed.phone || '미입력'}</strong>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              (관리자용 토큰: {parsed.token ? parsed.token.slice(0, 8) + '...' : '없음'})
            </div>
          </div>
        )}
        {!message && !parsed && <div style={{ color: '#6b7280' }}>아직 스캔된 내용이 없습니다.</div>}
        {raw && (
          <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12, color: '#6b7280' }}>
            {raw}
          </pre>
        )}
      </div>
    </main>
  );
}
