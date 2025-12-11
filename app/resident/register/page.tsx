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
      setMessage(text || '등록 실패');
      return;
    }
    setMessage('회원 등록이 완료되었습니다. 로그인 후 이용하세요.');
  };

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '32px 16px', display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0 }}>회원 등록</h1>
      {['name', 'phone', 'unit', 'vehicle_plate', 'email', 'password'].map((field) => (
        <input
          key={field}
          type={field === 'password' ? 'password' : 'text'}
          placeholder={field}
          value={(form as any)[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
        />
      ))}
      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ padding: '12px', borderRadius: 10 }}>
        {loading ? '등록 중...' : '회원 등록'}
      </button>
      {message && <div style={{ color: '#111827', background: '#f1f5f9', padding: 10, borderRadius: 8 }}>{message}</div>}
    </main>
  );
}
