export type Role = 'super_admin' | 'admin' | 'manager' | 'member' | 'guest';

export type MenuItem = {
  id: string;
  label: string;
  href: string;
  roles: Role[];
};

// 관리자와 일반 대시보드 중복 노출 방지를 위해
// - member/manager: /user/dashboard
// - admin/super_admin: /admin/dashboard
export const MENU_ITEMS: MenuItem[] = [
  { id: 'home', label: 'Home', href: '/', roles: ['guest'] },
  { id: 'dashboard-user', label: '대시보드', href: '/user/dashboard', roles: ['member', 'manager'] },
  { id: 'dashboard-admin', label: '대시보드', href: '/admin/dashboard', roles: ['admin', 'super_admin'] },
  { id: 'scan', label: 'Scan', href: '/scan', roles: ['guest', 'member', 'manager', 'admin', 'super_admin'] },
  { id: 'resident-manage', label: '입주자 관리', href: '/admin/history', roles: ['member', 'manager', 'admin', 'super_admin'] },
  { id: 'logs', label: '로그', href: '/admin/logs', roles: ['member', 'manager', 'admin', 'super_admin'] },
  { id: 'notifications', label: '알림', href: '/admin/notifications', roles: ['admin', 'super_admin'] },
  { id: 'ads', label: '광고관리', href: '/admin/ads', roles: ['member', 'manager', 'admin', 'super_admin'] },
  { id: 'menu-config', label: '메뉴 설정', href: '/admin/menu', roles: ['member', 'manager', 'admin', 'super_admin'] },
];

export const MENU_VIS_KEY = 'menuVisibility';
