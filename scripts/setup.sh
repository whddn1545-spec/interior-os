#!/usr/bin/env bash
# InteriorOS 초기 셋업 스크립트
# 사용: bash scripts/setup.sh

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"
ENV_EXAMPLE="$ROOT_DIR/.env.local.example"

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}   InteriorOS 초기 셋업${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# ──────────────────────────────────────────────────
# 0. 사전 조건 확인
# ──────────────────────────────────────────────────
check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "${RED}✗ $1 이 설치되지 않았습니다.${RESET}"
    echo "  설치 후 다시 실행하세요: $2"
    exit 1
  fi
}

check_command node  "https://nodejs.org"
check_command pnpm  "npm install -g pnpm"
echo -e "${GREEN}✓ 사전 조건 확인 완료${RESET}"
echo ""

# ──────────────────────────────────────────────────
# 1. .env.local 생성
# ──────────────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
  echo -e "${YELLOW}! .env.local 파일이 이미 존재합니다.${RESET}"
  read -rp "  덮어쓸까요? (y/N): " overwrite
  if [[ "${overwrite,,}" != "y" ]]; then
    echo "  기존 파일을 유지합니다."
    echo ""
    skip_env=true
  else
    skip_env=false
  fi
else
  skip_env=false
fi

if [[ "$skip_env" == "false" ]]; then
  echo -e "${BOLD}── 1단계: 환경 변수 설정 ──────────────────────${RESET}"
  echo ""
  echo -e "${CYAN}[Supabase]${RESET}"
  echo "  1. https://supabase.com 에서 새 프로젝트 생성"
  echo "  2. Settings → API 에서 URL, anon key, service_role key 복사"
  echo ""
  read -rp "  NEXT_PUBLIC_SUPABASE_URL (예: https://xxx.supabase.co): " SUPABASE_URL
  read -rp "  NEXT_PUBLIC_SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
  read -rp "  SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY

  echo ""
  echo -e "${CYAN}[Claude API]${RESET}"
  echo "  https://console.anthropic.com 에서 API 키 발급"
  echo ""
  read -rp "  ANTHROPIC_API_KEY (sk-ant-...): " ANTHROPIC_API_KEY

  echo ""
  echo -e "${CYAN}[NHN Cloud SMS]${RESET} ${YELLOW}(선택 — 나중에 설정 가능, 그냥 Enter)${RESET}"
  echo "  https://console.nhncloud.com → SMS 서비스 신청 후 발급"
  echo ""
  read -rp "  NHN_APP_KEY (Enter 건너뜀): " NHN_APP_KEY
  read -rp "  NHN_SECRET_KEY (Enter 건너뜀): " NHN_SECRET_KEY
  read -rp "  NHN_SENDER_PHONE 발신번호 예) 01012345678 (Enter 건너뜀): " NHN_SENDER_PHONE

  echo ""
  echo -e "${CYAN}[OpenAI]${RESET} ${YELLOW}(선택 — 무드보드 기능, 나중에 설정 가능)${RESET}"
  read -rp "  OPENAI_API_KEY (sk-..., Enter 건너뜀): " OPENAI_API_KEY

  echo ""
  echo -e "${CYAN}[Toss Payments]${RESET} ${YELLOW}(선택 — 요금제 결제, 나중에 설정 가능)${RESET}"
  echo "  https://developers.tosspayments.com → 테스트 키 사용 권장"
  echo ""
  read -rp "  NEXT_PUBLIC_TOSS_CLIENT_KEY (test_ck_..., Enter 건너뜀): " TOSS_CLIENT_KEY
  read -rp "  TOSS_SECRET_KEY (test_sk_..., Enter 건너뜀): " TOSS_SECRET_KEY

  echo ""
  echo -e "${CYAN}[Instagram]${RESET} ${YELLOW}(선택 — 나중에 설정 가능)${RESET}"
  read -rp "  INSTAGRAM_GRAPH_TOKEN (Enter 건너뜀): " INSTAGRAM_GRAPH_TOKEN
  read -rp "  INSTAGRAM_ACCOUNT_ID (Enter 건너뜀): " INSTAGRAM_ACCOUNT_ID
  read -rp "  INSTAGRAM_VERIFY_TOKEN (임의 문자열, Enter 건너뜀): " INSTAGRAM_VERIFY_TOKEN

  echo ""
  echo -e "${CYAN}[관리자]${RESET}"
  read -rp "  ADMIN_EMAIL (기본값: whddn1545@gmail.com, Enter 건너뜀): " ADMIN_EMAIL
  ADMIN_EMAIL="${ADMIN_EMAIL:-whddn1545@gmail.com}"

  # 랜덤 CRON_SECRET 자동 생성
  CRON_SECRET="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32)"

  # .env.local 파일 작성
  cat > "$ENV_FILE" <<EOF
# Supabase
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# Claude API
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

# NHN Cloud SMS
NHN_APP_KEY=${NHN_APP_KEY}
NHN_SECRET_KEY=${NHN_SECRET_KEY}
NHN_SENDER_PHONE=${NHN_SENDER_PHONE}

# OpenAI (무드보드)
OPENAI_API_KEY=${OPENAI_API_KEY}

# Toss Payments
NEXT_PUBLIC_TOSS_CLIENT_KEY=${TOSS_CLIENT_KEY}
TOSS_SECRET_KEY=${TOSS_SECRET_KEY}

# Instagram
INSTAGRAM_GRAPH_TOKEN=${INSTAGRAM_GRAPH_TOKEN}
INSTAGRAM_ACCOUNT_ID=${INSTAGRAM_ACCOUNT_ID}
INSTAGRAM_VERIFY_TOKEN=${INSTAGRAM_VERIFY_TOKEN}
INSTAGRAM_APP_SECRET=

# 관리자
ADMIN_EMAIL=${ADMIN_EMAIL}

# Cron 시크릿 (자동 생성)
CRON_SECRET=${CRON_SECRET}
EOF

  echo ""
  echo -e "${GREEN}✓ .env.local 생성 완료${RESET}"
fi

# ──────────────────────────────────────────────────
# 2. 패키지 설치
# ──────────────────────────────────────────────────
echo ""
echo -e "${BOLD}── 2단계: 패키지 설치 ─────────────────────────${RESET}"
cd "$ROOT_DIR"
pnpm install
echo -e "${GREEN}✓ 패키지 설치 완료${RESET}"

# ──────────────────────────────────────────────────
# 3. Supabase 마이그레이션 안내
# ──────────────────────────────────────────────────
echo ""
echo -e "${BOLD}── 3단계: Supabase 마이그레이션 ───────────────${RESET}"
echo ""
echo -e "${YELLOW}  아래 SQL 파일들을 Supabase SQL Editor에서 순서대로 실행하세요:${RESET}"
echo "  (Dashboard → 프로젝트 선택 → SQL Editor)"
echo ""
echo -e "  ${CYAN}1. packages/db/migrations/001_initial_schema.sql${RESET}"
echo "     → 전체 테이블 스키마 + 인덱스 + 트리거"
echo ""
echo -e "  ${CYAN}2. packages/db/migrations/002_rls_policies.sql${RESET}"
echo "     → Row Level Security 정책 (테넌트 격리)"
echo ""
echo -e "  ${CYAN}3. packages/db/migrations/003_instagram_hashtags.sql${RESET}"
echo "     → instagram_posts 테이블 컬럼 추가"
echo ""
echo -e "  ${CYAN}4. packages/db/migrations/004_custom_access_token_hook.sql${RESET}"
echo "     → JWT tenant_id 주입 Hook + payment_records 테이블"
echo ""
echo -e "  ${YELLOW}마이그레이션 후 추가 설정:${RESET}"
echo "  → Supabase Dashboard → Authentication → Hooks"
echo "     → Custom Access Token: auth.custom_access_token_hook 선택 후 저장"
echo ""
echo "  → Supabase Dashboard → Storage → New Bucket"
echo "     → 버킷 이름: photos  /  Public: ON"
echo ""

# Supabase CLI 있으면 자동 실행 여부 물어보기
if command -v supabase &>/dev/null; then
  echo -e "  ${GREEN}Supabase CLI가 감지되었습니다.${RESET}"
  read -rp "  CLI로 마이그레이션을 자동 실행할까요? (y/N): " run_migration
  if [[ "${run_migration,,}" == "y" ]]; then
    # .env.local에서 URL/key 읽기
    source "$ENV_FILE" 2>/dev/null || true
    DB_URL="${SUPABASE_URL:-}"

    if [[ -z "$DB_URL" ]]; then
      echo -e "  ${RED}NEXT_PUBLIC_SUPABASE_URL이 비어있어 CLI 실행을 건너뜁니다.${RESET}"
    else
      # project ref 추출 (https://xxxxx.supabase.co → xxxxx)
      PROJECT_REF="${DB_URL#https://}"
      PROJECT_REF="${PROJECT_REF%.supabase.co}"
      echo "  supabase db push --project-ref $PROJECT_REF"
      # supabase CLI는 supabase/migrations 폴더 구조를 사용하므로 직접 psql로 실행
      echo -e "  ${YELLOW}Supabase CLI의 db push는 로컬 개발 환경에 맞게 설정하세요.${RESET}"
      echo "  대신 SQL Editor에서 위 순서로 직접 실행하는 것을 권장합니다."
    fi
  fi
fi

# ──────────────────────────────────────────────────
# 4. 빌드 확인
# ──────────────────────────────────────────────────
echo ""
echo -e "${BOLD}── 4단계: 빌드 확인 ───────────────────────────${RESET}"
echo ""
read -rp "  지금 빌드를 실행해볼까요? (y/N): " run_build
if [[ "${run_build,,}" == "y" ]]; then
  pnpm build && echo -e "${GREEN}✓ 빌드 성공${RESET}" || echo -e "${RED}✗ 빌드 실패 — 위 오류를 확인하세요${RESET}"
fi

# ──────────────────────────────────────────────────
# 완료
# ──────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}${BOLD}   셋업 완료!${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo "  개발 서버 시작:  pnpm dev"
echo "  빌드:           pnpm build"
echo ""
echo -e "  ${YELLOW}Supabase 마이그레이션을 아직 안 했다면 위 3단계를 꼭 먼저 실행하세요.${RESET}"
echo ""
