# InteriorOS 🏗️

> **"60대 인테리어 사장님을 위한 3클릭 AI 업무 자동화 플랫폼"**

InteriorOS는 수기 장부와 엑셀에 의존하는 파편화된 영세 인테리어 시공 업계를 타겟으로 한 **B2B Vertical SaaS**입니다. 태블릿과 스마트폰 환경에 극한으로 최적화된 UX(대형 폰트, 직관적 UI)와, 안정적인 결정론적 로직 위에 AI의 편의성(문서 분석, 사진 태깅, 문구 작성)을 우아하게 결합했습니다.

> 개발 방향과 원칙, 사이클별 진행 기록은 **[METAPROMPT.md](./METAPROMPT.md)**, 작업 시 함정·규칙은 **[CLAUDE.md](./CLAUDE.md)** 참고.

## ✨ 핵심 기능 (Features)

1. **아침 브리핑 — 앱을 안 열어도 먼저 일하는 서비스**
   * 매일 아침 7시 30분(KST), 오늘 공사·받을 돈 D-day·답 없는 견적을 사장님 폰으로 SMS 브리핑.
2. **마법사 기반 견적 → 고객 수락 → 계약 → 수금 루프**
   * 12개 공종 단가표 기반 자동 산출, `draft → confirmed → sent → accepted` 상태 머신 + **Human-in-the-loop** 확정 게이트.
   * 고객용 공개 견적서 링크(유효기간 30일, 원탭 수락, 대표에게 전화하기) → 계약서 생성 → 고객 서명 링크.
   * 견적 확정 시 계약금/중도금/잔금 스케줄 자동 생성, 홈에서 원탭 입금 확인, 말투 3단계 독촉 문자(계좌 자동 포함) + 독촉 이력.
3. **일정 펑크 방지**
   * 간트차트 + 선후행 경고, 내일 공사 작업자 원탭 리마인드 문자(노쇼 방지), 밀린 일정 감지 → 후속 공정 원탭 재계산.
4. **경영 가시성**
   * 월간 사장님 리포트(입금·지출·순이익, 수금율, 견적 전환율) — 모든 숫자는 결정론적 계산.
   * 세무사 전달용 월별 장부 CSV 내보내기 (한국어 엑셀 호환).
5. **AI 보조 (계산이 아닌 표현만 담당)**
   * 종이 단가표 사진 스캔 온보딩, 견적 검토 코멘트, 사진 자동 태깅, 인스타그램 자동 포스팅, 통화 상담 노트 자동 문서화.
   * 테넌트별 월 AI 비용 캡으로 폭주 차단.

## 🛠️ 기술 스택 (Tech Stack)

* **Framework**: Next.js 16 (App Router, Turbopack)
* **Language**: TypeScript
* **Styling**: Tailwind CSS v4, oklch 기반 Premium Glassmorphism UI
* **Database & Auth**: Supabase (PostgreSQL, RLS)
* **AI Models**: 
  * `gpt-4o`, `gpt-4o-mini` (단가표 스캔 및 견적 검토)
  * `claude-3-5-sonnet`, `claude-3-opus` (현장 사진 태깅, 메시지 생성)
  * `dall-e-3`, `dall-e-2` (무드보드 시각화 생성)
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
