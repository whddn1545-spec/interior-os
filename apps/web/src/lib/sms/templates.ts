import "server-only";

// 문자 템플릿 변수 치환

export interface WorkerNotifyInput {
  workerName: string;
  siteName: string;
  siteAddress: string;
  workDate: string; // "2025-06-20(목)" 형태
  tradeName: string;
  mainDoorCode?: string; // 공동현관 비번 (있으면 포함)
  unitDoorCode?: string; // 세대 비번
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
  } = input;

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
    `[인테리어OS] ${workerName} 기사님,
${workDate} ${tradeName} 작업 안내드립니다.

현장명: ${siteName}
주소: ${siteAddress}${doors}

문의사항은 담당자에게 연락 바랍니다.`;

  return {
    body: template(doorSection),
    maskedBody: template(maskedDoorSection),
  };
}

export interface CustomerProgressInput {
  customerName: string;
  siteName: string;
  progressMessage: string; // 진행 상황 메시지
  estimatedCompletion?: string;
}

export function buildCustomerProgressMessage(input: CustomerProgressInput): {
  body: string;
  maskedBody: string;
} {
  const { customerName, siteName, progressMessage, estimatedCompletion } =
    input;

  const completionLine = estimatedCompletion
    ? `\n예상 완공일: ${estimatedCompletion}`
    : "";

  const body = `[인테리어OS] ${customerName} 고객님,
${siteName} 현장 공사 진행 상황을 안내드립니다.

${progressMessage}${completionLine}

추가 문의사항은 담당자에게 연락 주세요. 감사합니다.`;

  // 고객 알림에는 민감 정보가 없으므로 maskedBody = body
  return {
    body,
    maskedBody: body,
  };
}
