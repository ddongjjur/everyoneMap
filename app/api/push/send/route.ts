import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

interface PartnerSubscription {
  sub_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

export async function POST(req: Request) {
  const supabase = createClient();

  // 미들웨어가 api/ 를 제외하므로 여기서 직접 로그인 여부를 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { userId, title, body, url } = (await req.json()) as {
    userId: string;
    title: string;
    body: string;
    url?: string;
  };

  if (!userId || !title || !body) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // 알림 클릭 시 이동할 경로는 앱 내부 경로("/..." 이면서 "//" 로 시작하지 않는 것)만 허용
  const safeUrl =
    typeof url === "string" && url.startsWith("/") && !url.startsWith("//") ? url : undefined;

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  // RLS 때문에 상대방 구독은 직접 조회할 수 없음 — 같은 커플인지 검사하는 DB 함수로 조회
  const { data, error } = await supabase.rpc("get_partner_push_subscriptions", {
    p_target_user_id: userId,
  });
  if (error) {
    console.error("get_partner_push_subscriptions failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const subs = (data ?? []) as PartnerSubscription[];
  if (subs.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 });
  }

  const payload = JSON.stringify({ title, body, url: safeUrl });
  const staleIds: string[] = [];
  let failed = 0;

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        payload
      )
    )
  );

  results.forEach((result, i) => {
    if (result.status !== "rejected") return;
    const status = (result.reason as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) {
      staleIds.push(subs[i].sub_id);
    } else {
      failed += 1;
      console.error(`push failed [${subs[i].sub_id}]:`, result.reason);
    }
  });

  if (staleIds.length > 0) {
    await supabase.rpc("delete_partner_push_subscriptions", { p_ids: staleIds });
  }

  const sent = subs.length - staleIds.length - failed;
  return NextResponse.json({ sent, failed }, { status: sent === 0 && failed > 0 ? 502 : 200 });
}
