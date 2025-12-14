'use client';

'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../../lib/supabase-browser';

type AdItem = {
  id: string;
  title: string;
  link: string | null;
  image_url: string | null;
  show_marquee?: boolean | null;
  created_at?: string;
};

export default function AdsPage() {
  const supabase = supabaseBrowser();
  const [items, setItems] = useState<AdItem[]>([]);
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [showMarquee, setShowMarquee] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAds = async () => {
    const { data, error } = await supabase
      .from('banner_ads')
      .select('id,title,link,image_url,show_marquee,created_at')
      .order('created_at', { ascending: false });
    if (!error && data) setItems(data as AdItem[]);
  };

  useEffect(() => {
    loadAds();
  }, []);

  const uploadToStorage = async (): Promise<string | null> => {
    if (!file) return imageUrl.trim() || null;
    const path = `ads/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('banner-ads').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (upErr) {
      setMessage(`이미지 업로드 실패: ${upErr.message}`);
      return null;
    }
    const { data } = supabase.storage.from('banner-ads').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleAdd = async () => {
    setMessage(null);
    if (!title.trim()) {
      setMessage('제목은 필수입니다.');
      return;
    }
    setLoading(true);
    const publicUrl = await uploadToStorage();
    if (publicUrl === null && file) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('banner_ads')
      .insert({
        title: title.trim(),
        link: link.trim() || null,
        image_url: publicUrl || imageUrl.trim() || null,
        show_marquee: showMarquee,
      })
      .select('*')
      .single();
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (data) setItems((prev) => [data as AdItem, ...prev]);
    setTitle('');
    setLink('');
    setImageUrl('');
    setFile(null);
    setShowMarquee(true);
    setMessage('추가되었습니다.');
  };

  const handleDelete = async (id: string) => {
    setMessage(null);
    const prev = items;
    setItems((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from('banner_ads').delete().eq('id', id);
    if (error) {
      setItems(prev);
      setMessage('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleMarquee = async (id: string, current?: boolean | null) => {
    const next = !current;
    const prev = items;
    setItems((p) => p.map((ad) => (ad.id === id ? { ...ad, show_marquee: next } : ad)));
    const { error } = await supabase.from('banner_ads').update({ show_marquee: next }).eq('id', id);
    if (error) {
      setItems(prev);
      setMessage('노출 설정 변경 중 오류가 발생했습니다.');
    }
  };

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px', display: 'grid', gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>광고 관리</h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280' }}>배너 광고를 추가/삭제할 수 있습니다.</p>
      </div>

      <section className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>광고 추가</h2>
        <input
          type="text"
          placeholder="제목 (필수)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
        />
        <input
          type="text"
          placeholder="이동 링크 (선택)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
        />
        <input
          type="text"
          placeholder="이미지 URL (선택, 또는 파일 업로드)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={showMarquee} onChange={(e) => setShowMarquee(e.target.checked)} />
          흐르는 광고(마키) 영역에 노출
        </label>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>또는 이미지 파일 업로드</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={loading}
          style={{ padding: '12px', borderRadius: 10, width: 'fit-content' }}
        >
          {loading ? '저장 중...' : '추가'}
        </button>
        {message && <div style={{ color: '#111827', background: '#f1f5f9', padding: 10, borderRadius: 8 }}>{message}</div>}
      </section>

      <section className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>등록된 광고</h2>
        {items.length === 0 && <div style={{ color: '#6b7280' }}>등록된 광고가 없습니다.</div>}
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {items.map((ad) => (
            <div
              key={ad.id}
              style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff', display: 'grid', gap: 8 }}
            >
              <div style={{ fontWeight: 700 }}>{ad.title}</div>
              {ad.image_url && (
                <img
                  src={ad.image_url}
                  alt={ad.title}
                  style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }}
                />
              )}
              {ad.link && (
                <a href={ad.link} style={{ color: '#2563eb', fontSize: 13, wordBreak: 'break-all' }} target="_blank" rel="noreferrer">
                  {ad.link}
                </a>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                <span style={{ color: ad.show_marquee ? '#16a34a' : '#6b7280' }}>
                  {ad.show_marquee ? '마키 노출' : '마키 미노출'}
                </span>
                <button
                  onClick={() => handleToggleMarquee(ad.id, ad.show_marquee)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  노출 전환
                </button>
              </div>
              <button
                onClick={() => handleDelete(ad.id)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  background: '#fff1f2',
                  color: '#b91c1c',
                  cursor: 'pointer',
                  width: 'fit-content',
                }}
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
