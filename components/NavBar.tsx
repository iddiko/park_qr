'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../lib/supabase-browser';

export default function NavBar() {
  const supabase = supabaseBrowser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const refreshState = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setSessionEmail(null);
      setIsAdmin(false);
      return;
    }
    setSessionEmail(user.email ?? null);
    const { data: admin } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
    setIsAdmin(Boolean(admin?.user_id));
  };

  useEffect(() => {
    refreshState().catch(() => {
      setSessionEmail(null);
      setIsAdmin(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      refreshState().catch(() => {
        setSessionEmail(null);
        setIsAdmin(false);
      });
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const baseLinks = [
    { href: '/', label: 'Home' },
    { href: '/scan', label: 'Scan' },
  ];
  const userLinks = [{ href: '/user/dashboard', label: '내 대시보드' }];
  const adminLinks = [
    { href: '/admin/dashboard', label: '관리자 대시보드' },
    { href: '/admin/generate', label: 'QR 생성' },
    { href: '/admin/history', label: '입주자 관리' },
    { href: '/admin/logs', label: '로그' },
  ];
  const guestLinks = [
    { href: '/resident/register', label: '회원등록' },
    { href: '/login', label: '로그인' },
    { href: '/admin/login', label: '관리자' },
  ];

  const linksToShow = sessionEmail
    ? [...baseLinks, ...userLinks, ...(isAdmin ? adminLinks : [])]
    : [...baseLinks, ...guestLinks];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setSessionEmail(null);
    window.location.href = '/';
  };

  return (
    <nav
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '12px 16px',
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 12 }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: 16, color: '#111827', textDecoration: 'none' }}>
          QR Admin
        </Link>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>무료 QR 차량 식별</span>
      </div>

      {linksToShow.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            textDecoration: 'none',
            color: '#111827',
          }}
        >
          {item.label}
        </Link>
      ))}

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        {sessionEmail && <span style={{ fontSize: 13, color: '#6b7280' }}>{sessionEmail}</span>}
        {sessionEmail && (
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#f8fafc',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
