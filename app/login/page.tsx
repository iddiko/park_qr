'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '../../lib/supabase-browser';

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }

    // 관리자라면 대시보드로, 아니면 사용자 대시보드로
    const user = data.user;
    if (user) {
      const { data: admin } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
      if (admin?.user_id) {
        router.replace('/admin/dashboard');
        return;
      }
    }
    router.replace(redirect || '/user/dashboard');
  };

  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: '32px 16px', display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>로그인</h1>
      <input
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
      />
      <input
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
