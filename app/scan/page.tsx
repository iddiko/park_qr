'use client';

import { useEffect, useRef, useState } from 'react';

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [result, setResult] = useState<string | null>(null);

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
        setResult('카메라 접근 불가');
      });
    return () => {
        stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleManual = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setResult(e.target.value);
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0 }}>QR 스캔</h1>
      <p style={{ color: '#6b7280', margin: 0 }}>카메라 접근이 안 되면 수동으로 QR JSON을 붙여넣으세요.</p>
      <video ref={videoRef} style={{ width: '100%', maxHeight: 320, background: '#000' }} muted playsInline />
      <textarea
        rows={4}
        placeholder="수동 입력: QR JSON"
        onChange={handleManual}
        style={{ width: '100%', borderRadius: 10, border: '1px solid #e5e7eb', padding: 10 }}
      />
      <div className="card">
        <p style={{ margin: 0, color: '#6b7280' }}>스캔 결과</p>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{result ?? '아직 결과 없음'}</pre>
      </div>
    </main>
  );
}
