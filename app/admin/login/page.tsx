'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '../../../lib/supabase-browser';

export default function AdminLoginPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/admin/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.replace(redirect);
  };

  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: '32px 16px', display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>관리자 로그인</h1>
      <input
        className="border p-2 rounded"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
      />
      <input
        className="border p-2 rounded"
        placeholder="비밀번호"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
      />
      {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}
      <button
        className="btn btn-primary"
        onClick={handleLogin}
        disabled={loading}
        style={{ padding: '12px', borderRadius: 10 }}
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>
    </main>
  );
}
