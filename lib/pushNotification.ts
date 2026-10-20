import { SupabaseClient } from "@supabase/supabase-js";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

export function getNotificationStatus(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "default";
  return Notification.permission;
}

export type SubscribeResult = { ok: true } | { ok: false; reason: string };

// 구독이 실제로 저장됐을 때만 ok: true — 실패 사유는 화면에 보여줄 수 있게 반환
export async function subscribePush(supabase: SupabaseClient): Promise<SubscribeResult> {
  if (typeof window === "undefined") {
    return { ok: false, reason: "브라우저에서만 사용할 수 있어요" };
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { ok: false, reason: "이 브라우저는 푸시 알림을 지원하지 않아요" };
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    return { ok: false, reason: "알림 설정(VAPID 키)이 없어요" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      reason:
        permission === "denied"
          ? "브라우저에서 알림이 차단돼 있어요"
          : "알림 허용을 선택하지 않았어요",
    };
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      }));

    const { endpoint, keys } = subscription.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "로그인이 필요해요" };

    const { error } = await supabase.from("push_subscriptions").upsert(
      { user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: "user_id,endpoint" }
    );
    if (error) return { ok: false, reason: "구독 정보를 저장하지 못했어요" };

    return { ok: true };
  } catch (e) {
    const detail = e instanceof Error ? e.message : "";
    return { ok: false, reason: `알림을 켜지 못했어요${detail ? ` (${detail})` : ""}` };
  }
}

export async function unsubscribePush(supabase: SupabaseClient): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
}
