export const TUTORIAL_CONTENT = {
  home: {
    icon: "🏠",
    title: "오늘 할 일 한눈에",
    steps: [
      { icon: "📍", text: "맨 위에서 오늘 가야 할 현장을 볼 수 있어요." },
      { icon: "👷", text: "작업자 전화번호를 누르면 바로 전화가 걸려요." },
      { icon: "💰", text: "오늘 받아야 할 돈이 빨간 글씨로 보여요." },
      { icon: "⚡", text: "맨 아래 버튼으로 견적, 문자를 바로 시작해요." },
    ],
  },
  quote_wizard: {
    icon: "📄",
    title: "견적서 만들기",
    steps: [
      { icon: "🏠", text: "먼저 현장 이름과 평수를 입력해요." },
      { icon: "🔧", text: "필요한 공사 항목을 골라서 담아요." },
      { icon: "💵", text: "금액은 자동으로 계산돼요. 직접 고쳐도 돼요." },
      { icon: "📤", text: "다 만들면 고객에게 바로 보낼 수 있어요." },
    ],
  },
  payments: {
    icon: "💰",
    title: "받을 돈 관리",
    steps: [
      { icon: "📋", text: "계약금, 중도금, 잔금을 한 곳에서 봐요." },
      { icon: "🔴", text: "받아야 할 돈은 빨간색으로 표시돼요." },
      { icon: "✅", text: "돈을 받으면 '받음'으로 눌러서 표시해요." },
      { icon: "📅", text: "약정일이 지나면 알아보기 쉽게 보여줘요." },
    ],
  },
  workers: {
    icon: "👷",
    title: "작업자 장부",
    steps: [
      { icon: "📒", text: "같이 일하는 작업자를 모두 적어둬요." },
      { icon: "📞", text: "이름을 누르면 전화번호가 나와요." },
      { icon: "🔨", text: "어떤 공사를 하는 분인지 표시돼요." },
      { icon: "➕", text: "새 작업자는 + 버튼으로 추가해요." },
    ],
  },
  messages: {
    icon: "✉️",
    title: "문자 보내기",
    steps: [
      { icon: "👤", text: "보낼 고객이나 작업자를 골라요." },
      { icon: "✍️", text: "미리 만든 문구를 골라 쓰면 편해요." },
      { icon: "📲", text: "보내기를 누르면 문자가 바로 가요." },
      { icon: "📜", text: "보낸 문자는 기록으로 남아요." },
    ],
  },
  photos: {
    icon: "📷",
    title: "사진 관리",
    steps: [
      { icon: "🏠", text: "현장별로 사진을 모아둘 수 있어요." },
      { icon: "📤", text: "올리기를 눌러 휴대폰 사진을 올려요." },
      { icon: "🗓️", text: "찍은 날짜순으로 정리돼요." },
      { icon: "👀", text: "사진을 누르면 크게 볼 수 있어요." },
    ],
  },
  schedule: {
    icon: "📅",
    title: "공사 일정표",
    steps: [
      { icon: "🗓️", text: "현장의 공사 순서를 한눈에 봐요." },
      { icon: "🔧", text: "어떤 공사가 며칠에 있는지 나와요." },
      { icon: "👷", text: "각 공사에 배정된 작업자가 보여요." },
      { icon: "🔄", text: "날짜를 바꾸면 일정이 다시 정리돼요." },
    ],
  },
} as const;

export type TutorialKey = keyof typeof TUTORIAL_CONTENT;
