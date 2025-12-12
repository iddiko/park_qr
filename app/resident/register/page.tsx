'use client';

import { useState } from 'react';

export default function ResidentRegisterPage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    unit: '',
    vehicle_plate: '',
    email: '',
    password: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setMessage(null);
    setLoading(true);
    const res = await fetch('/api/residents/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const text = await res.text();
      setMessage(text || '회원등록에 실패했습니다.');
      return;
    }
    setMessage('회원등록이 완료되었습니다. 관리자 승인 후 QR 발급이 진행됩니다.');
  };

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '32px 16px', display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0 }}>회원등록</h1>
      <input
        type="text"
        placeholder="이름"
        value={form.name}
        onChange={(e) => handleChange('name', e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
      />
      <input
        type="text"
        placeholder="휴대전화"
        value={form.phone}
        onChange={(e) => handleChange('phone', e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
      />
      <input
        type="text"
        placeholder="동/호"
        value={form.unit}
        onChange={(e) => handleChange('unit', e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
      />
      <input
        type="text"
        placeholder="차량번호"
        value={form.vehicle_plate}
        onChange={(e) => handleChange('vehicle_plate', e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
      />
      <input
        type="text"
        placeholder="이메일"
        value={form.email}
        onChange={(e) => handleChange('email', e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
      />
      <input
        type="password"
        placeholder="비밀번호"
        value={form.password}
        onChange={(e) => handleChange('password', e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
      />
      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={loading}
        style={{ padding: '12px', borderRadius: 10 }}
      >
        {loading ? '등록 중...' : '회원등록'}
      </button>
      {message && <div style={{ color: '#111827', background: '#f1f5f9', padding: 10, borderRadius: 8 }}>{message}</div>}
    </main>
  );
}
