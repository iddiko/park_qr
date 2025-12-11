import './globals.css';
import type { ReactNode } from 'react';
import NavBar from '@/components/NavBar';

export const metadata = {
  title: '무료 QR 차량 식별 시스템',
  description: 'Next.js + Supabase + Edge Functions 기반 무료 QR 차량 식별 서비스',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, background: '#f7f8fa' }}>
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            borderBottom: '1px solid #e5e7eb',
            background: '#fff',
          }}
        >
          <NavBar />
        </header>
        <main
          style={{
            padding: '80px 16px 32px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: '100%', maxWidth: 1280 }}>{children}</div>
        </main>
      </body>
    </html>
  );
}
