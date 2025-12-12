export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

export async function POST(req: NextRequest) {
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY 또는 RESEND_FROM_EMAIL 이 설정되지 않았습니다.' },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { to, subject, html, pngDataUrl } = body ?? {};
    if (!to || !pngDataUrl) {
      return NextResponse.json({ error: '필수 값(to, pngDataUrl)이 없습니다.' }, { status: 400 });
    }

    // data URL -> Buffer
    const matches = pngDataUrl.match(/^data:image\/png;base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: 'pngDataUrl 형식이 잘못되었습니다.' }, { status: 400 });
    }
    const buffer = Buffer.from(matches[1], 'base64');

    const resend = new Resend(RESEND_API_KEY);
    const emailSubject = subject ?? 'QR 발급 안내';

    const { error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to,
      subject: emailSubject,
      html: html ?? '<p>QR 코드가 첨부되었습니다.</p>',
      attachments: [
        {
          filename: 'qr.png',
          content: buffer,
        },
      ],
    });

    if (error) {
      return NextResponse.json({ error: error.message ?? '메일 발송 실패' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('send-email error', err);
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
