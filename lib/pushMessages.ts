import { withJosa } from "@/lib/josa";

type MessageType =
  | "grape_request"
  | "grape_approved"
  | "grape_rejected"
  | "city_new"
  | "photo_edited"
  | "memo_edited";

export interface PushMessage {
  title: string;
  body: string;
  /** 알림을 눌렀을 때 이동할 앱 내 경로 */
  url: string;
}

const GRAPES_URL = "/main/grapes";
const MAP_URL = "/main/map";

export function buildMessage(
  type: MessageType,
  partnerName: string,
  cityName?: string
): PushMessage {
  const name = withJosa(partnerName, "이/가");
  const city = cityName ? withJosa(cityName, "을/를") : "";

  const messages: Record<MessageType, PushMessage> = {
    grape_request:  { title: "🍇 포도 요청이 왔어요",       body: `${name} 포도를 요청했어요. 확인해볼까요?`, url: GRAPES_URL },
    grape_approved: { title: "🍇 포도가 생겼어요!",          body: `${name} 포도 요청을 승인해줬어요 🎉`, url: GRAPES_URL },
    grape_rejected: { title: "🍇 포도 요청 결과가 왔어요",   body: `아직은 아닌가 봐요. ${name} 요청을 거절했어요.`, url: GRAPES_URL },
    city_new:       { title: "📍 새 여행지가 기록됐어요",     body: `${name} ${city} 기록했어요. 함께 확인해요!`, url: MAP_URL },
    photo_edited:   { title: "📸 여행 사진이 업데이트됐어요", body: `${name} ${cityName ?? ""} 사진을 편집했어요.`, url: MAP_URL },
    memo_edited:    { title: "📝 여행 메모가 업데이트됐어요", body: `${name} ${cityName ?? ""} 메모를 수정했어요.`, url: MAP_URL },
  };

  return messages[type];
}
