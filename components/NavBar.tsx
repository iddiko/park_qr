'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../lib/supabase-browser';
import { MENU_ITEMS, MENU_VIS_KEY, Role } from '../lib/menu-config';

type MenuVisibility = Partial<Record<Role, Record<string, boolean>>>;

export default function NavBar() {
  const supabase = supabaseBrowser();
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<Role | null>(null); // super_admin | admin | manager | member | guest
  const [menuVis, setMenuVis] = useState<MenuVisibility>({});

  const refreshState = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setSessionEmail(null);
      setAdminRole(null);
      return;
    }
    setSessionEmail(user.email ?? null);
    const { data: admin } = await supabase
      .from('admins')
      .select('user_id, role')
      .eq('user_id', user.id)
      .maybeSingle();
    if (admin?.role === 'super_admin') {
      setAdminRole('super_admin');
    } else if (admin?.role === 'admin') {
      setAdminRole('admin');
    } else if (admin?.role === 'manager') {
      setAdminRole('manager');
    } else {
      setAdminRole('member');
    }
  };

  useEffect(() => {
    refreshState().catch(() => {
      setSessionEmail(null);
      setAdminRole(null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      refreshState().catch(() => {
        setSessionEmail(null);
        setAdminRole(null);
      });
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(MENU_VIS_KEY);
      if (saved) setMenuVis(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  const role: Role = adminRole ?? (sessionEmail ? 'member' : 'guest');
  const roleColor =
    role === 'super_admin' ? '#ef4444' : role === 'admin' ? '#2563eb' : role === 'manager' ? '#16a34a' : '#eab308';
  const roleLabel =
    role === 'super_admin'
      ? '슈퍼관리자'
      : role === 'admin'
      ? '관리자'
      : role === 'manager'
      ? '매니저'
      : role === 'member'
      ? '회원'
      : '게스트';

  const visibleMenus = MENU_ITEMS.filter((item) => {
    if (!item.roles.includes(role)) return false;
    const setting = menuVis[role]?.[item.id];
    return setting !== false;
  });

  const rightGuestLinks = [
    { href: '/resident/register', label: '회원등록' },
    { href: '/login', label: '로그인' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSessionEmail(null);
    setAdminRole(null);
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
        <Link
          href={role === 'guest' ? '/' : visibleMenus[0]?.href ?? '/'}
          style={{ fontWeight: 800, fontSize: 16, color: '#111827', textDecoration: 'none' }}
        >
          PARKSYS
        </Link>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>무료 QR 차량 식별</span>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
        {visibleMenus.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            style={{
              padding: '4px 6px',
              borderRadius: 6,
              textDecoration: 'none',
              color: '#111827',
              fontWeight: 500,
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        {role === 'guest' &&
          rightGuestLinks.map((item) => (
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
        {sessionEmail && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              background: '#f8fafc',
            }}
          >
            <span style={{ fontSize: 13, color: '#6b7280' }}>{sessionEmail} 님 환영합니다.</span>
            <span
              title={roleLabel}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: roleColor,
                display: 'inline-block',
              }}
            />
            <Link
              href="/notifications"
              style={{
                padding: '4px 8px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                textDecoration: 'none',
                color: '#111827',
              }}
            >
              알림
            </Link>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
