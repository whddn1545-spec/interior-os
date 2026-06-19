import "server-only";

// NHN Cloud SMS API v3.0
// 문서: https://docs.nhncloud.com/ko/SMS/zh/api-guide/

export interface SmsInput {
  to: string; // 수신 번호 (010-xxx-xxxx)
  body: string; // 본문 (90바이트 이하 = SMS, 이상 = LMS)
  senderPhone?: string; // 발신 번호 (env 기본값 사용)
  idempotencyKey: string; // 중복 발송 방지
}

export interface SmsResult {
  success: boolean;
  providerMsgId?: string;
  errorMessage?: string;
}

interface NhnSmsResponse {
  header: {
    isSuccessful: boolean;
    resultCode: number;
    resultMessage: string;
  };
  body?: {
    data?: {
      requestId?: string;
      statusCode?: string;
      sendResultList?: Array<{
        recipientNo: string;
        resultCode: number;
        resultMessage: string;
        recipientSeq: number;
        messageType: string;
      }>;
    };
  };
}

export async function sendSms(input: SmsInput): Promise<SmsResult> {
  const appKey = process.env.NHN_APP_KEY;
  const secretKey = process.env.NHN_SECRET_KEY;
  const defaultSenderPhone = process.env.NHN_SENDER_PHONE;

  // env 미설정 시 에러 throw 없이 실패 반환
  if (!appKey || !secretKey || (!input.senderPhone && !defaultSenderPhone)) {
    return {
      success: false,
      errorMessage: "SMS 설정이 필요합니다",
    };
  }

  const senderPhone = input.senderPhone ?? defaultSenderPhone!;
  const url = `https://api-sms.cloud.toast.com/sms/v3.0/appKeys/${appKey}/sender/sms`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "X-Secret-Key": secretKey,
      },
      body: JSON.stringify({
        body: input.body,
        sendNo: senderPhone,
        recipientList: [
          {
            recipientNo: input.to,
            countryCode: "82",
          },
        ],
        // 멱등성 키를 statsId로 활용 (NHN Cloud 통계 분류용)
        statsId: input.idempotencyKey,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        errorMessage: `SMS API 오류: HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as NhnSmsResponse;

    if (!data.header.isSuccessful) {
      return {
        success: false,
        errorMessage: `SMS 발송 실패: ${data.header.resultMessage} (코드: ${data.header.resultCode})`,
      };
    }

    const requestId = data.body?.data?.requestId;

    return {
      success: true,
      providerMsgId: requestId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      errorMessage: `SMS 발송 중 오류가 발생했습니다: ${message}`,
    };
  }
}
