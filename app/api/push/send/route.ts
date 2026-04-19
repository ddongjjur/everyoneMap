import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  const { userId, title, body } = (await req.json()) as {
    userId: string;
    title: string;
    body: string;
  };

  if (!userId || !title || !body) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const supabase = createClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const payload = JSON.stringify({ title, body });
  const staleIds: string[] = [];

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      return sub.id;
    })
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      const status = (result.reason as { statusCode?: number }).statusCode;
      if (status === 410 || status === 404) {
        staleIds.push(subs[i].id);
      } else {
        console.error(`push failed [${subs[i].id}]:`, result.reason);
        return NextResponse.json({ error: String(result.reason) }, { status: 500 });
      }
    }
  }

  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  return NextResponse.json({ sent: subs.length - staleIds.length });
}
