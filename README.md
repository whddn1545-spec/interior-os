# InteriorOS 🏗️

> **"60대 인테리어 사장님을 위한 3클릭 AI 업무 자동화 플랫폼"**

InteriorOS는 수기 장부와 엑셀에 의존하는 파편화된 영세 인테리어 시공 업계를 타겟으로 한 **B2B Vertical SaaS**입니다. 태블릿과 스마트폰 환경에 극한으로 최적화된 UX(대형 폰트, 직관적 UI)와, 안정적인 결정론적 로직 위에 AI의 편의성(문서 분석, 사진 태깅, 문구 작성)을 우아하게 결합했습니다.

## ✨ 핵심 기능 (Features)

1. **마법사 기반 견적 생성 및 상태 머신 (Phase 1)**
   * 복잡한 계산 없이, 12개 주요 공종별 단가표를 기반으로 견적을 자동 산출합니다.
   * `작성 중 → 확정 → 계약됨 → 완료/취소` 형태의 안정적인 상태 머신(State Machine)을 따르며, 확정 전에는 AI 계산 실수를 인간이 통제할 수 있는 **Human-in-the-loop** 방식을 적용했습니다.
2. **AI 종이 단가표 스캔 (Onboarding)**
   * 엑셀이나 종이로 된 기존 단가표를 사진으로 찍으면, Claude Vision API가 구조화된 DB 형태로 10초 만에 분석하여 앱에 즉시 온보딩 시킵니다.
3. **간트차트 및 일정 자동 생성 엔진**
   * 현장별 소요일수를 기반으로 일정을 자동으로 잡아주고, 드래그 앤 드롭으로 날짜를 수정할 수 있습니다.
   * 공종 간 선후행 관계(예: 철거가 목공보다 늦으면 경고)를 시스템이 짚어줍니다.
4. **AI 사진 자동 태깅 및 인스타그램 마케팅 연동**
   * 현장에서 찍은 수많은 사진들을 업로드하면, AI가 공사 단계(Before/Progress/After)와 공종을 자동 분류합니다.
   * '확정' 버튼 한 번으로, AI가 쓴 멋진 해시태그와 함께 인스타그램 비즈니스 계정에 현장 포트폴리오가 자동 게시됩니다.
5. **CRM 및 출역 장부 (작업자 / 재무 관리)**
   * 노쇼 방지를 위한 작업자 예약 문자 멱등성 발송 및 이번 달 지급 예정인 인건비 장부 요약.
   * 현장별 고객 결제 스케줄(계약금/중도금/잔금) 미수금 알림.

## 🛠️ 기술 스택 (Tech Stack)

* **Framework**: Next.js 14 (App Router)
* **Language**: TypeScript
* **Styling**: Tailwind CSS v4, oklch 기반 Premium Glassmorphism UI
* **Database & Auth**: Supabase (PostgreSQL, RLS)
* **AI Models**: 
  * `gpt-4o` (종이 단가표 스캔 - Vision)
  * `claude-3-5-sonnet` (현장 사진 태깅 - Vision)
  * `claude-3-opus` (이메일, 문자 메시지 생성)
* **Architecture**: Monorepo (Turborepo), Edge Runtime 기반 AI Gateway
* **Deployment**: Vercel (PWA 지원)

## 🚀 빠른 시작 (Getting Started)

### 1. 환경 변수 설정
\`.env.local.example\` 파일을 복사하여 \`.env.local\`을 만들고, Supabase 키와 AI API 키를 입력합니다.
\`\`\`bash
cp .env.local.example .env.local
\`\`\`

### 2. 패키지 설치 및 실행
\`\`\`bash
pnpm install
pnpm dev
\`\`\`

### 3. 프로덕션 배포
InteriorOS는 Vercel 배포에 최적화되어 있습니다. Vercel 대시보드에 GitHub 레포지토리를 연결하고 환경 변수만 세팅하면 클릭 한 번으로 배포됩니다. iOS/Android 태블릿 사용자들은 Safari/Chrome에서 "홈 화면에 추가"를 통해 Native App처럼 사용할 수 있습니다 (PWA).

## 🔒 보안 및 아키텍처 원칙
* **Multi-tenant RLS 강제**: 모든 쿼리는 \`tenant_id\`를 기준으로 강력하게 격리되어 다른 업체의 데이터 누출을 원천 차단합니다.
* **비용 로깅**: 모든 AI 호출은 \`ai_invocations\` 테이블에 입력 토큰, 출력 토큰, 응답 시간(Latency), 그리고 비용(USD)이 기록되어 완벽한 Unit Economics 트래킹이 가능합니다.
* **단기 서명 URL (Signed URLs)**: AI 분석을 위한 모든 이미지 전송은 5분 만료 서명 URL을 사용하여 보안을 극대화했습니다.
