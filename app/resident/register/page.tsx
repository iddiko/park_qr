'use client';

import { useState } from 'react';

export default function ResidentRegisterPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    phone: '',
    unit: '',
    vehicle_plate: '',
    vehicle_type: 'ice' as 'ice' | 'ev',
    hasVehicle: false,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setMessage(null);
    if (
      !form.email ||
      !form.password ||
      !form.passwordConfirm ||
      !form.name ||
      !form.phone ||
      !form.unit
    ) {
      setMessage('이메일, 비밀번호, 이름, 휴대전화, 동/호수는 필수 입력입니다.');
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setMessage('비밀번호가 서로 다릅니다.');
      return;
    }

    const payload = {
      email: form.email,
      password: form.password,
      passwordConfirm: form.passwordConfirm,
      name: form.name,
      phone: form.phone,
      unit: form.unit,
      vehicle_plate: form.hasVehicle ? form.vehicle_plate : '',
      vehicle_type: form.hasVehicle ? form.vehicle_type : null,
    };

    setLoading(true);
    const res = await fetch('/api/residents/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setLoading(false);

    if (!res.ok) {
      const text = await res.text();
      setMessage(text || '회원가입에 실패했습니다.');
      return;
    }
    setMessage('회원가입이 완료되었습니다. 로그인 후 QR 발급을 진행해 주세요.');
  };

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '32px 16px', display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0 }}>회원 가입</h1>

      {/* 1. 이메일 / 비밀번호 */}
      <input
        type="email"
        placeholder="이메일 (필수)"
        value={form.email}
        onChange={(e) => handleChange('email', e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
      />
      <input
        type="password"
        placeholder="비밀번호 (필수)"
        value={form.password}
        onChange={(e) => handleChange('password', e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
      />
      <input
        type="password"
        placeholder="비밀번호 확인 (필수)"
        value={form.passwordConfirm}
        onChange={(e) => handleChange('passwordConfirm', e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
      />

      {/* 2. 이름 */}
      <input
        type="text"
        placeholder="이름 (필수)"
        value={form.name}
        onChange={(e) => handleChange('name', e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
      />

      {/* 3. 휴대번호 */}
      <input
        type="text"
        placeholder="휴대전화 (필수)"
        value={form.phone}
        onChange={(e) => handleChange('phone', e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
      />

      {/* 4. 동/호수 */}
      <input
        type="text"
        placeholder="동/호수 (필수, 예: 101동 202호)"
        value={form.unit}
        onChange={(e) => handleChange('unit', e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
      />

      {/* 5. 차량 유무 */}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
        <input
          type="checkbox"
          checked={form.hasVehicle}
          onChange={(e) => handleChange('hasVehicle', e.target.checked)}
        />
        차량이 있습니다
      </label>

      {form.hasVehicle && (
        <div style={{ display: 'grid', gap: 8 }}>
          <input
            type="text"
            placeholder="차량번호"
            value={form.vehicle_plate}
            onChange={(e) => handleChange('vehicle_plate', e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
          />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="radio"
                name="vehicle_type"
                checked={form.vehicle_type === 'ice'}
                onChange={() => handleChange('vehicle_type', 'ice')}
              />
              내연기관
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="radio"
                name="vehicle_type"
                checked={form.vehicle_type === 'ev'}
                onChange={() => handleChange('vehicle_type', 'ev')}
              />
              전기차
            </label>
          </div>
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={loading}
        style={{ padding: '12px', borderRadius: 10 }}
      >
        {loading ? '가입 중...' : '회원 가입'}
      </button>

      {message && (
        <div style={{ color: '#111827', background: '#f1f5f9', padding: 10, borderRadius: 8 }}>{message}</div>
      )}
    </main>
  );
}
