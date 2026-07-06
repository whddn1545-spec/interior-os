# InteriorOS 작업 지침

이 저장소의 모든 작업은 **`METAPROMPT.md`가 최상위 기준**이다 — 미션, 절대 원칙(계산은 코드로/사람 확정 게이트/3클릭/60대 UX/멱등성), 우선순위 백로그, 사이클별 완료 기록이 거기 있다. 작업 시작 전에 반드시 읽을 것.

## 반드시 알아야 할 함정 (실제 사고 이력)

- **배포는 git push로만.** Vercel 프로젝트 Root Directory가 `.`(저장소 루트)라서 `vercel.json`은 반드시 루트에 있어야 한다 (apps/web에 두면 크론이 등록되지 않는다 — 실제로 서비스 개설 후 2주간 크론이 전혀 안 돌았음). CLI `vercel deploy`는 모노레포 워크스페이스 인식 실패로 항상 에러난다.
- **JWT tenant_id claim.** Supabase custom access token hook이 `users` 행을 보고 JWT에 tenant_id를 주입한다. users 행이 생기기 전 발급된 토큰으로는 RLS가 **모든 쓰기를 거부**한다. 온보딩처럼 users 행을 만드는 흐름 뒤에는 반드시 `supabase.auth.refreshSession()`. (이 버그로 신규 가입자 전원이 첫 견적을 못 만들었음.)
- **ai_invocations INSERT는 service_role 전용** (RLS). 사용자 세션으로 insert하면 조용히 실패한다 — 로깅·집계류는 `createAdminClient()`.
- **없는 컬럼 select = 전체 쿼리 에러.** PostgREST는 select 문자열의 컬럼이 없으면 42703 에러를 내고, `.single()`은 null을 반환해 `notFound()`류 폴백으로 이어진다 (이걸로 공개 견적서 전체가 404였음). select 컬럼 문자열은 마이그레이션과 대조할 것.
- **마이그레이션 적용 여부를 믿지 말 것.** SQL Editor 수동 실행 방식이라 중간에 실패하면 그 뒤가 전부 미적용으로 남는다. 새 기능이 "빈 화면"이면 service_role로 테이블 존재부터 확인하라. 미적용분 통합본: `packages/db/migrations/APPLY_PENDING_004-010.sql` (멱등).
- **날짜는 KST.** 서버는 UTC로 돈다. 사용자에게 보이는 '오늘'·월 경계는 `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" })` 패턴으로 계산한다. Vercel 크론 스케줄도 UTC 표기임을 잊지 말 것 (KST 07:30 = `30 22 * * *`).
- **next-pwa**: 배포 직후 구 서비스 워커가 낡은 청크를 물고 하이드레이션 에러를 낼 수 있다. 클라이언트에서 `navigator.onLine`류 브라우저 상태는 `useSyncExternalStore`(서버 스냅샷 고정)로 구독한다.

## 검증 규칙

- 머지 전: `pnpm test && pnpm typecheck && pnpm lint && pnpm build` 전부 통과.
- 금액·날짜·수량 로직은 `packages/core` 순수 함수 + vitest부터. UI/크론은 소비만 한다.
- 실기능 검증은 프로덕션 E2E 테스트 계정 사용: `e2e-test@interioros.dev` (테넌트 "E2E테스트인테리어") — 삭제하지 말 것.

## 커밋 관행

한국어 커밋 메시지, 기능 단위(사이클)로 커밋, METAPROMPT.md의 사이클 기록을 함께 갱신한다.
