'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../lib/supabase-browser';

type Banner = {
  id: string;
  title: string;
  image_url: string | null;
  link: string | null;
  show_marquee?: boolean | null;
};

export default function AdMarquee() {
  const supabase = supabaseBrowser();
  const [banners, setBanners] = useState<Banner[]>([
    { id: 'fallback-1', title: '무료 QR 차량 식별/검침 관리', image_url: null, link: null },
    { id: 'fallback-2', title: '도시가스 검침 업로드/입력, 만료 관리까지 한 번에', image_url: null, link: null },
    { id: 'fallback-3', title: 'Next.js + Supabase 무료 배포', image_url: null, link: null },
  ]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('banner_ads')
          .select('id,title,image_url,link,show_marquee')
          .or('show_marquee.is.null,show_marquee.eq.true')
          .order('created_at', { ascending: false })
          .limit(10);
        if (!error && data && data.length > 0) {
          setBanners(
            data.map((b: any) => ({
              id: b.id,
              title: b.title,
              image_url: b.image_url ?? null,
              link: b.link ?? null,
              show_marquee: b.show_marquee ?? true,
            }))
          );
        }
      } catch {
        /* ignore */
      }
    };
    load();
  }, [supabase]);

  return (
    <div className="marquee" style={{ overflow: 'hidden', position: 'relative' }}>
      <div className="marquee-track" style={{ display: 'flex', gap: 12, animation: 'marquee 18s linear infinite' }}>
        {[...banners, ...banners].map((banner, idx) => (
          <a
            key={`${banner.id}-${idx}`}
            href={banner.link || '#'}
            style={{
              display: 'grid',
              gap: 6,
              minWidth: 200,
              padding: '12px 14px',
              borderRadius: 12,
              background: '#0f172a',
              color: '#e5e7eb',
              textDecoration: 'none',
              boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
            }}
          >
            {banner.image_url && (
              <img
                src={banner.image_url}
                alt={banner.title}
                style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid #1f2937' }}
              />
            )}
            <span style={{ fontWeight: 700, fontSize: 14 }}>{banner.title}</span>
          </a>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
