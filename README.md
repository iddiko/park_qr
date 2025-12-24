# PARKSYS QR 관리 시스템

이 프로젝트는 입주자 QR 차량 식별/가스 검침/알림을 관리하는 Next.js 앱입니다.

## 기술 스택
- Next.js 14 (App Router)
- React 18 + TypeScript
- Supabase (Auth/DB/Storage)
- Resend (이메일 발송)
- html5-qrcode, qrcode

## 실행 방법
1) 의존성 설치
```bash
npm install
```

2) 환경 변수 설정 (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
```

3) 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3000` 접속

## 주요 사용자 흐름
1) 일반 회원 회원가입 (`/resident/register`)
2) 일반 회원 로그인 (`/login`) → 사용자 대시보드(`/user/dashboard`)
3) 관리자 로그인 (`/admin/login`) → 관리자 대시보드(`/admin/dashboard`)
4) 알림 확인: `/admin/notifications`

## 라우트 구조
- 공개
  - `/` 홈
  - `/scan` QR 스캔
  - `/login` 로그인
  - `/resident/register` 회원가입
- 일반 회원
  - `/user/dashboard` 입주자 대시보드
- 관리자
  - `/admin/login`
  - `/admin/dashboard`
  - `/admin/history` 입주자/QR 관리
  - `/admin/ads` 광고 관리
  - `/admin/menu` 메뉴 설정
  - `/admin/notifications` 알림

## API 라우트
- `/api/generate` QR 생성
- `/api/notifications/send-email` QR 이메일 발송
- `/api/notifications/mark-done` 알림 처리
- `/api/residents/register` 회원가입 처리
- `/api/residents/change-request` 정보 수정 요청
- `/api/gas/submit` 가스 검침 제출
- `/api/gas/upload` 가스 검침 이미지 업로드

## 디렉토리 구조 (요약)
```
app/
  layout.tsx
  globals.css
  page.tsx
  login/page.tsx
  resident/register/page.tsx
  user/dashboard/page.tsx
  scan/page.tsx
  admin/
    login/page.tsx
    dashboard/page.tsx
    history/page.tsx
    history/HistoryClient.tsx
    ads/page.tsx
    menu/page.tsx
    generate/page.tsx
    notifications/page.tsx
  api/
    generate/route.ts
    notifications/send-email/route.ts
    notifications/mark-done/route.ts
    residents/register/route.ts
    residents/change-request/route.ts
    gas/submit/route.ts
    gas/upload/route.ts
components/
  NavBar.tsx
  AdMarquee.tsx
lib/
  supabase-browser.ts
  supabase-server.ts
  menu-config.ts
middleware.ts
```

## 작성 요령/규칙
- App Router 기준으로 `app/` 하위에 페이지 구성
- 클라이언트 컴포넌트는 `use client` 선언
- Supabase 접근:
  - 브라우저: `lib/supabase-browser.ts`
  - 서버/미들웨어: `lib/supabase-server.ts`, `middleware.ts`
- 관리자 권한은 `admins` 테이블의 `role` 기준으로 제어

## 참고
- QR 이미지는 `qrcode`로 생성 후 표시/메일 발송
- 알림은 `notifications` 테이블에 기록되며 관리자에서 처리 가능
