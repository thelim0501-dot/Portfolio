# Cloudflare R2 영상 저장 설정

영상 파일은 Cloudflare R2에 저장하고, `projects.json`에는 공개 URL과 제목·순서만 저장합니다. R2 비밀키가 들어가는 `.env`는 Git에서 제외되어 있습니다.

## 1. 버킷 만들기

Cloudflare 대시보드에서 **R2 Object Storage → Create bucket**으로 영상용 버킷을 만듭니다.

- 안내: https://developers.cloudflare.com/r2/get-started/
- 예시 버킷 이름: `portfolio-videos`

## 2. 공개 URL 만들기

버킷의 **Settings → Public access**에서 공개 주소를 연결합니다.

- 실제 포트폴리오 운영: Custom Domain 권장
- 연결 테스트: `r2.dev` 주소 사용 가능
- 안내: https://developers.cloudflare.com/r2/buckets/public-buckets/

발급된 기본 주소를 `R2_PUBLIC_URL`에 넣습니다. 마지막 `/`는 생략해도 됩니다.

## 3. API 토큰 만들기

**R2 → Manage R2 API Tokens → Create API token**에서 다음 권한으로 만듭니다.

- Permission: **Object Read & Write**
- Scope: 위에서 만든 영상 버킷 하나만 선택
- 안내: https://developers.cloudflare.com/r2/api/tokens/

생성 직후 표시되는 Access Key ID와 Secret Access Key를 안전하게 보관합니다. Secret은 다시 표시되지 않습니다.

## 4. 로컬 환경변수 입력

프로젝트 폴더에서 `.env.example`을 복사해 `.env`를 만들고 값을 채웁니다.

```env
R2_ACCOUNT_ID=Cloudflare_Account_ID
R2_ACCESS_KEY_ID=발급받은_Access_Key_ID
R2_SECRET_ACCESS_KEY=발급받은_Secret_Access_Key
R2_BUCKET_NAME=portfolio-videos
R2_PUBLIC_URL=https://pub-example.r2.dev
```

Account ID와 S3 호환 API 주소는 R2 대시보드에서 확인할 수 있습니다.

- S3 호환 API 안내: https://developers.cloudflare.com/r2/get-started/s3/

## 5. 서버 재시작과 업로드

```powershell
npm.cmd start
```

`http://localhost:3000/admin/editor.html`을 열고 **VIDEOS** 탭으로 이동합니다. 연결이 성공하면 `+ Add Videos` 버튼이 활성화됩니다.

- 지원 형식: MP4, WebM
- 한 파일 제한: 2GB
- 업로드 완료 후 제목 수정과 드래그 순서 변경 가능
- `Delete from R2`는 R2 원본과 `projects.json` 메타데이터를 함께 삭제

마지막으로 **PUBLISH**를 누르면 영상 파일이 아니라 갱신된 `projects.json`과 코드만 GitHub에 올라갑니다.
