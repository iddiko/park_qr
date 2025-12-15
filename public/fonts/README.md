DINPro 폰트 사용 안내
=====================

이 프로젝트는 영문 기본 폰트로 DINPro를 우선 지정했습니다. 폰트 파일은 라이선스 문제로 저장소에 포함할 수 없으니, 아래와 같이 파일을 직접 추가해 주세요.

1. 준비물
   - `DINPro-Regular.woff2`, `DINPro-Regular.woff`
   - `DINPro-Bold.woff2`, `DINPro-Bold.woff`
   (정품 라이선스를 보유한 파일을 사용하세요.)

2. 배치 경로
   - 이 README가 있는 `public/fonts/` 폴더에 위 4개 파일을 넣습니다.

3. 적용
   - `app/globals.css`에 `@font-face`가 이미 추가되어 있습니다.
   - 파일을 배치하면 자동으로 `body { font-family: 'DINPro', ... }`가 적용됩니다.

4. 배포
   - Vercel 등에 배포할 때도 `public/fonts/`가 그대로 올라갑니다.
   - 폰트 파일을 추가한 뒤에는 커밋/배포를 다시 수행하세요.

※ 폰트 미배치 시에는 시스템 기본 폰트로 폴백됩니다.
