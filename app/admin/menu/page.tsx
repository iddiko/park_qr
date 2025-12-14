'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../../lib/supabase-browser';
import { MENU_ITEMS, MENU_VIS_KEY, Role, MenuItem } from '../../../lib/menu-config';

type MenuVisibility = Partial<Record<Role, Record<string, boolean>>>;

export default function MenuConfigPage() {
  const supabase = supabaseBrowser();
  const [role, setRole] = useState<Role>('guest');
  const [menuVis, setMenuVis] = useState<MenuVisibility>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setRole('guest');
        setReady(true);
        return;
      }
      const { data: admin } = await supabase
        .from('admins')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      if (admin?.role === 'super_admin') {
        setRole('super_admin');
      } else {
        setRole('guest');
      }
      try {
        const saved = localStorage.getItem(MENU_VIS_KEY);
        if (saved) setMenuVis(JSON.parse(saved));
      } catch {
        /* ignore */
      }
      setReady(true);
    };
    init();
  }, [supabase]);

  const save = (next: MenuVisibility) => {
    setMenuVis(next);
    try {
      localStorage.setItem(MENU_VIS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const toggle = (targetRole: Role, menuId: string) => {
    const current = menuVis[targetRole]?.[menuId];
    const nextValue = !(current ?? true); // 기본 true에서 토글
    save({
      ...menuVis,
      [targetRole]: {
        ...(menuVis[targetRole] ?? {}),
        [menuId]: nextValue,
      },
    });
  };

  if (!ready) {
    return (
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        <h1>로딩 중...</h1>
      </main>
    );
  }

  // 슈퍼관리자 또는 관리자만 접근 허용하도록 완화
  if (role !== 'super_admin' && role !== 'admin') {
    return (
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        <h1>접근 불가</h1>
        <p style={{ color: '#6b7280' }}>슈퍼관리자 또는 관리자만 메뉴 설정을 변경할 수 있습니다.</p>
      </main>
    );
  }

  const rolesToEdit: Role[] = ['admin', 'manager', 'member'];

  // 요청에 따라 모든 역할이 동일한 메뉴 목록을 설정 화면에서 볼 수 있도록 전체 메뉴를 노출
  const menusByRole = (_r: Role) => MENU_ITEMS;

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>메뉴 설정</h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280' }}>
          슈퍼관리자가 관리자/매니저/회원에게 보이는 메뉴를 토글할 수 있습니다. (게스트 메뉴는 고정)
        </p>
      </div>

      {rolesToEdit.map((r) => (
        <section key={r} className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {r === 'admin' ? '관리자' : r === 'manager' ? '매니저' : '일반 회원'}
          </h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {menusByRole(r).map((m: MenuItem) => {
              const checked = menuVis[r]?.[m.id] !== false;
              return (
                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(r, m.id)}
                  />
                  <span>{m.label}</span>
                  <span style={{ color: '#6b7280', fontSize: 12 }}>{m.href}</span>
                </label>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
