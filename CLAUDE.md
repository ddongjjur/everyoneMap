# 프로젝트 규칙 (Harness)

## 프로젝트 개요
- 커플 전용 데이트/여행 기록 웹앱
- Next.js 14 (App Router) + TypeScript + Tailwind CSS + Framer Motion
- 배포: Vercel

## 기술 스택
- **Next.js 14** (App Router)
- **Supabase** — DB (PostgreSQL) + Auth (Google OAuth) + Storage (사진)
- **Vercel** — 배포
- **Tailwind CSS** — 스타일
- **Framer Motion** — 애니메이션

## 기술 스택 규칙

### 절대 사용 금지
- `useEffect`로 데이터 fetch 금지 → Server Component 또는 React Query 사용
- `any` 타입 사용 금지 → 명확한 interface/type 정의
- `console.log` 를 커밋에 남기지 말 것
- CSS 인라인 스타일 최소화 → Tailwind 클래스 우선
- `localStorage` 직접 접근 시 반드시 `typeof window !== "undefined"` 체크

### 컴포넌트 규칙
- 클라이언트 컴포넌트는 파일 최상단에 `"use client"` 명시
- 컴포넌트 파일명은 PascalCase (예: `CityDetail.tsx`)
- 페이지 파일명은 `page.tsx` 고정 (Next.js App Router 규칙)
- props interface는 컴포넌트 파일 내부에 정의

### 스타일 규칙
- 색상 테마: rose/pink 계열 (rose-400 기준)
- 모바일 퍼스트: max-width 430px 기준
- 애니메이션: Framer Motion 사용 (CSS transition은 간단한 hover에만 허용)
- 폰트: Pretendard

## 파일 구조
```
app/
  page.tsx              # 랜딩 (코드 생성/입력)
  main/
    layout.tsx          # 하단 네비게이션 포함
    map/page.tsx        # 지도 화면
    screen2/page.tsx    # 추억 화면
    screen3/page.tsx    # 우리 화면
components/
  KoreaMapSVG.tsx       # 전국 SVG 지도
  SeoulMap.tsx          # 서울 핫플 지역
  ProvinceDetail.tsx    # 도 내 시/군 목록
  CityDetail.tsx        # 도시 상세 (사진/메모/경로)
  Navigation.tsx        # 하단 탭 네비게이션
```

## Supabase 사용 규칙
- 클라이언트: `lib/supabase/client.ts` → `createClient()` (브라우저 전용)
- 서버: `lib/supabase/server.ts` → `createClient()` (서버 컴포넌트/라우트)
- `"use client"` 페이지에서 Supabase 사용 시 반드시 `export const dynamic = "force-dynamic"` 추가
- 테이블: `couples`, `city_records`, `places`, `photos`
- 스토리지 버킷: `couple-photos`
- 환경변수: `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 데이터 구조
- couples: 커플 코드 매칭 (creator_id, partner_id)
- city_records: 도시별 기록 (couple_id + city_id 조합이 유니크)
- places: 이동 경로 장소 (city_record_id 참조)
- photos: 사진 (storage_path → Supabase Storage)

## 작업 전 체크리스트
- [ ] 수정할 파일을 먼저 Read로 읽기
- [ ] 기존 컴포넌트 재사용 가능한지 확인
- [ ] 모바일(430px) 기준으로 UI 설계
- [ ] TypeScript 오류 없는지 확인 (`npm run build`)
- [ ] 새 파일 생성보다 기존 파일 수정 우선

## 완료 기준
- `npm run build` 가 오류 없이 통과해야 함
- 모바일 뷰(430px)에서 레이아웃이 깨지지 않아야 함
- localStorage 접근 시 SSR 오류 없어야 함

## Auth 흐름
1. 미로그인 → `/login` 리다이렉트 (middleware가 처리)
2. Google OAuth → `/auth/callback` → 세션 교환 → `/`
3. 랜딩 `/` → 커플 코드 생성 or 입력
4. 커플 연결 완료 → `/main/map` 진입

## 알려진 실수 패턴 (하네스 누적)
- ❌ `useMotionValue`, `useTransform` import 후 미사용 → 빌드 오류 발생한 적 있음
- ❌ CityDetail에서 `cityEmoji` prop을 필수로 정의했다가 오류 → optional로 변경
- ❌ `next dev` 백그라운드 실행 시 포트 충돌 (3000 → 3001) 발생
