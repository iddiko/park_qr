'use client';

import { useState } from 'react';
import QRCode from 'qrcode';

type GenerateResponse = {
  qrPayload: { v: number; phone: string; token: string };
  qrString: string;
};

export default function GeneratePage() {
  const [residentId, setResidentId] = useState('');
  const [name, setName] = useState('');
  const [carNumber, setCarNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [exp, setExp] = useState('');
  const [qrJson, setQrJson] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setError(null);
    setQrJson(null);
    setQrImage(null);
    setLoading(true);
    try {
      const id = residentId || crypto.randomUUID();
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residentId: id, name, carNumber, phone, exp }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: GenerateResponse = await res.json();
      setQrJson(JSON.stringify(data.qrPayload));
      const url = await QRCode.toDataURL(JSON.stringify(data.qrPayload));
      setQrImage(url);
    } catch (e: any) {
      setError(e?.message ?? 'QR 생성 오류');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrImage) return;
    const a = document.createElement('a');
    a.href = qrImage;
    a.download = 'qr.png';
    a.click();
  };

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">QR 생성</h1>
      <div className="grid gap-3">
        <input
          className="border p-2 rounded"
          placeholder="주민 ID (비워두면 자동 생성)"
          value={residentId}
          onChange={(e) => setResidentId(e.target.value)}
        />
        <input className="border p-2 rounded" placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          className="border p-2 rounded"
          placeholder="차량번호"
          value={carNumber}
          onChange={(e) => setCarNumber(e.target.value)}
        />
        <input className="border p-2 rounded" placeholder="전화번호" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input
          className="border p-2 rounded"
          type="datetime-local"
          placeholder="만료일"
          value={exp}
          onChange={(e) => setExp(e.target.value)}
        />
        <button className="bg-black text-white py-2 rounded disabled:opacity-60" onClick={handleGenerate} disabled={loading}>
          {loading ? '생성 중...' : 'QR 생성'}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {qrJson && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold mb-1">QR JSON</p>
            <pre className="text-xs bg-gray-100 p-3 rounded whitespace-pre-wrap break-all">{qrJson}</pre>
          </div>
          {qrImage && (
            <div className="space-y-2">
              <img src={qrImage} alt="QR Code" className="border inline-block" />
              <div>
                <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={handleDownload}>
                  QR 다운로드
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
