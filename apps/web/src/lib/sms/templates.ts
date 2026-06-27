import "server-only";

// 문자 템플릿 변수 치환 — 모든 문자 본문은 이 파일의 빌더 함수가 단일 출처(single source)다.
// actions.ts/previewMessage 는 본문을 직접 만들지 말고 반드시 아래 함수를 호출한다.

const HEADER = "[인테리어OS]";

/** 금액을 "1,200,000원" 형태로 */
function won(amount: number): string {
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
}

// ──────────────────────────────────────────────
// 1. 작업자 섭외·안내
// ──────────────────────────────────────────────
export interface WorkerNotifyInput {
  workerName: string;
  siteName: string;
  siteAddress: string;
  workDate: string; // "6월 20일 (목)" 형태로 가공된 문자열
  tradeName: string;
  mainDoorCode?: string | null; // 공동현관 비번 (있으면 포함)
  unitDoorCode?: string | null; // 세대 비번
  contactName?: string | null; // 담당자(상호/대표) 이름 — 문의 안내에 표시
  contactPhone?: string | null; // 담당자 연락처 — '문의: 010-...'로 본문에 포함
}

export function buildWorkerNotifyMessage(input: WorkerNotifyInput): {
  body: string;
  maskedBody: string;
} {
  const {
    workerName,
    siteName,
    siteAddress,
    workDate,
    tradeName,
    mainDoorCode,
    unitDoorCode,
    contactName,
    contactPhone,
  } = input;

  const tradePart = tradeName ? `${tradeName} ` : "";

  // 담당자 연락처가 있으면 '문의: 홍길동인테리어 010-...'로 구체적으로 안내한다.
  // 번호가 없으면 기존 문구(담당자에게 연락 바랍니다)로 자연스럽게 폴백한다.
  const contactPrefix = contactName ? `${contactName} ` : "";
  const contactLine = contactPhone
    ? `문의: ${contactPrefix}${contactPhone}`
    : "문의사항은 담당자에게 연락 바랍니다.";

  const doorLines: string[] = [];
  const maskedDoorLines: string[] = [];

  if (mainDoorCode) {
    doorLines.push(`공동현관: ${mainDoorCode}`);
    maskedDoorLines.push("공동현관: ****");
  }
  if (unitDoorCode) {
    doorLines.push(`세대 비번: ${unitDoorCode}`);
    maskedDoorLines.push("세대 비번: ****");
  }

  const doorSection =
    doorLines.length > 0 ? `\n[출입 정보]\n${doorLines.join("\n")}` : "";
  const maskedDoorSection =
    maskedDoorLines.length > 0
      ? `\n[출입 정보]\n${maskedDoorLines.join("\n")}`
      : "";

  const template = (doors: string) =>
    `${HEADER} ${workerName} 기사님,
${workDate} ${tradePart}작업 안내드립니다.

현장명: ${siteName}
주소: ${siteAddress}${doors}

${contactLine}`;

  return {
    body: template(doorSection),
    maskedBody: template(maskedDoorSection),
  };
}

// ──────────────────────────────────────────────
// 2. 고객 진행 알림 (현장명·공종·예정일 변수)
// ──────────────────────────────────────────────
export interface CustomerProgressInput {
  customerName: string;
  siteName: string;
  tradeName?: string; // 진행 중/예정 공종 (예: 도배)
  scheduledDate?: string; // "6월 20일 (목)" 형태로 가공된 예정일
  businessName?: string | null; // 사업자 상호 (설정 > 사업자 정보)
  ownerName?: string | null; // 대표자명 (설정 > 사업자 정보)
}

export function buildCustomerProgressMessage(input: CustomerProgressInput): {
  body: string;
  maskedBody: string;
} {
  const { customerName, siteName, tradeName, scheduledDate, businessName, ownerName } =
    input;

  // 본문 가운데 안내 문장은 공종·예정일 유무에 따라 자연스럽게 구성한다.
  let progressLine: string;
  if (tradeName && scheduledDate) {
    progressLine = `${scheduledDate}에 ${tradeName} 작업이 예정되어 있습니다.`;
  } else if (tradeName) {
    progressLine = `현재 ${tradeName} 작업이 진행 중입니다.`;
  } else if (scheduledDate) {
    progressLine = `다음 작업은 ${scheduledDate}에 예정되어 있습니다.`;
  } else {
    // 공종·예정일이 모두 비면 단조로운 한 줄로 수렴하지 않도록,
    // 사업자(상호/대표)·현장명 등 기존 데이터로 좀 더 구체적인 변형을 만든다.
    progressLine = buildGenericProgressLine({ siteName, businessName, ownerName });
  }

  const body = `${HEADER} ${customerName} 고객님,
${siteName} 현장 공사 진행 상황을 안내드립니다.

${progressLine}

궁금하신 점은 언제든 담당자에게 연락 주세요. 감사합니다.`;

  // 고객 알림에는 민감 정보가 없으므로 maskedBody = body
  return { body, maskedBody: body };
}

/**
 * 공종·예정일이 모두 비었을 때 쓰는 일반 진행 안내 문장.
 * 사업자(상호/대표)·현장명 같은 기존 데이터로 변형을 만들어,
 * 모든 진행 알림이 "공사가 순조롭게 진행되고 있습니다." 한 줄로 수렴하는 것을 막는다.
 */
function buildGenericProgressLine(args: {
  siteName: string;
  businessName?: string | null;
  ownerName?: string | null;
}): string {
  const businessName = args.businessName?.trim();
  const ownerName = args.ownerName?.trim();

  // 1순위: 상호 + 대표가 있으면 책임 시공 느낌의 안내
  if (businessName && ownerName) {
    return `${businessName} ${ownerName} 대표가 현장을 직접 챙기며 공사를 진행하고 있습니다.`;
  }
  // 2순위: 상호만 있으면 상호 기준 안내
  if (businessName) {
    return `${businessName}에서 현장 공사를 순조롭게 진행하고 있습니다.`;
  }
  // 3순위: 사업자 정보가 없으면 현장명 기반으로라도 구체화
  if (args.siteName.trim()) {
    return `${args.siteName} 현장 공사를 차질 없이 진행하고 있습니다.`;
  }
  // 최후 폴백 (기존 문구)
  return "공사가 순조롭게 진행되고 있습니다.";
}

// ──────────────────────────────────────────────
// 3. 대금 청구 (계약금/중도금/잔금 + 금액 + 계좌)
// ──────────────────────────────────────────────
export interface PaymentRequestInput {
  customerName: string;
  siteName: string;
  stageLabel: string; // "계약금" | "중도금" | "잔금"
  amount: number; // 미수 금액
  dueDate?: string; // "6월 20일 (목)" 형태 약정일 (있으면 포함)
  bankAccount?: string | null; // "OO은행 123-456-789 홍길동" 형태
}

export function buildPaymentRequestMessage(input: PaymentRequestInput): {
  body: string;
  maskedBody: string;
} {
  const { customerName, siteName, stageLabel, amount, dueDate, bankAccount } =
    input;

  const dueLine = dueDate ? `\n약정일: ${dueDate}` : "";
  // 계좌가 등록돼 있으면 본문에 넣고, 미리보기(masked)에서는 일부를 가린다.
  const accountLine = bankAccount
    ? `\n입금계좌: ${bankAccount}`
    : "\n입금계좌는 설정 > 사업자 정보에 등록해 주세요.";
  const maskedAccountLine = bankAccount
    ? `\n입금계좌: ${maskAccount(bankAccount)}`
    : accountLine;

  const template = (acct: string) =>
    `${HEADER} ${customerName} 고객님,
${siteName} 현장 ${stageLabel} 입금 안내드립니다.

${stageLabel}: ${won(amount)}${dueLine}${acct}

입금 후 알려주시면 확인해 드리겠습니다. 감사합니다.`;

  return {
    body: template(accountLine),
    maskedBody: template(maskedAccountLine),
  };
}

/** 계좌번호 가운데 자릿수를 가린다 (미리보기 노출 최소화) */
function maskAccount(account: string): string {
  // 숫자 묶음 중 가장 긴 부분(계좌번호)을 마스킹
  return account.replace(/\d[\d-]{5,}\d/, (digits) => {
    const onlyNums = digits.replace(/\D/g, "");
    if (onlyNums.length <= 4) return digits;
    const head = onlyNums.slice(0, 3);
    const tail = onlyNums.slice(-2);
    return `${head}***${tail}`;
  });
}

// ──────────────────────────────────────────────
// 4. 공사 완료 / 하자보수 안내
// ──────────────────────────────────────────────
export interface WorkDoneInput {
  customerName: string;
  siteName: string;
  variant: "completed" | "warranty"; // 완료 / 하자보수
  tradeName?: string;
  scheduledDate?: string; // 하자보수 방문 예정일 등
}

export function buildWorkDoneMessage(input: WorkDoneInput): {
  body: string;
  maskedBody: string;
} {
  const { customerName, siteName, variant, tradeName, scheduledDate } = input;

  let body: string;

  if (variant === "completed") {
    const tradePart = tradeName ? `${tradeName} ` : "";
    body = `${HEADER} ${customerName} 고객님,
${siteName} 현장 ${tradePart}공사가 모두 완료되었습니다.

마무리 상태를 확인해 주시고, 미흡한 부분이 있으면 언제든 말씀해 주세요.
그동안 믿고 맡겨 주셔서 진심으로 감사드립니다.`;
  } else {
    const visitLine = scheduledDate
      ? `\n방문 예정일: ${scheduledDate}`
      : "";
    const tradePart = tradeName ? `${tradeName} ` : "";
    body = `${HEADER} ${customerName} 고객님,
${siteName} 현장 ${tradePart}하자보수 안내드립니다.

말씀해 주신 부분을 점검 후 보수해 드리겠습니다.${visitLine}
편하신 일정 알려주시면 방문 시간을 맞춰 드리겠습니다.`;
  }

  return { body, maskedBody: body };
}

// ──────────────────────────────────────────────
// 공통 유틸: 날짜 문자열 가공 ("2025-06-20" → "6월 20일 (목)")
// ──────────────────────────────────────────────
export function formatKoreanDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}
