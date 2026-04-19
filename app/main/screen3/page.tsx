"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LogOut, Pencil, Check, Bell, BellOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  subscribePush,
  unsubscribePush,
  getNotificationStatus,
} from "@/lib/pushNotification";

interface CoupleInfo {
  id: string;
  creator_id: string | null;
  creator_name: string | null;
  partner_name: string | null;
}

export default function Screen3Page() {
  const router = useRouter();
  const supabase = createClient();

  const [couple, setCouple] = useState<CoupleInfo | null>(null);
  const [myRole, setMyRole] = useState<"creator" | "partner" | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const [notifStatus, setNotifStatus] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("couples")
        .select("id, creator_id, creator_name, partner_name")
        .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
        .maybeSingle();

      if (!data) return;
      setCouple(data);
      const role = data.creator_id === user.id ? "creator" : "partner";
      setMyRole(role);
      setNameInput(role === "creator" ? (data.creator_name ?? "") : (data.partner_name ?? ""));
    };
    load();

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifStatus(getNotificationStatus());
    }

    const checkSubscription = async () => {
      if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    };
    checkSubscription();
  }, []);

  const handleSaveName = async () => {
    if (!couple || !myRole) return;
    const field = myRole === "creator" ? "creator_name" : "partner_name";
    await supabase.from("couples").update({ [field]: nameInput }).eq("id", couple.id);
    setCouple((prev) => prev ? { ...prev, [field]: nameInput } : prev);
    setEditingName(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleToggleNotif = async () => {
    if (toggling || notifStatus === "denied") return;
    setToggling(true);
    try {
      if (isSubscribed) {
        await unsubscribePush(supabase);
        setIsSubscribed(false);
      } else {
        await subscribePush(supabase);
        const newStatus = getNotificationStatus();
        setNotifStatus(newStatus);
        if (newStatus === "granted") setIsSubscribed(true);
      }
    } finally {
      setToggling(false);
    }
  };

  const myName = myRole === "creator" ? couple?.creator_name : couple?.partner_name;
  const partnerName = myRole === "creator" ? couple?.partner_name : couple?.creator_name;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-gradient-to-b from-rose-50/40 to-white relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xs"
      >
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">💑</div>
          <h2 className="text-2xl font-bold text-gray-700">우리</h2>
        </div>

        {/* 커플 이름 카드 */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5 mb-4">

          {/* 내 이름 */}
          <div>
            <p className="text-xs text-gray-400 font-medium mb-2">나</p>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  maxLength={20}
                  className="flex-1 text-base font-semibold text-gray-700 border-b-2 border-rose-300 focus:border-rose-400 outline-none pb-1"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSaveName}
                  className="w-8 h-8 rounded-full bg-rose-400 flex items-center justify-center shadow-sm"
                >
                  <Check size={15} className="text-white" />
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-base font-semibold text-gray-700">
                  {myName || <span className="text-gray-300">이름을 입력해주세요</span>}
                </span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setEditingName(true)}
                  className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <Pencil size={12} className="text-gray-400" />
                </motion.button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-rose-300 text-lg">♥</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* 상대방 이름 */}
          <div>
            <p className="text-xs text-gray-400 font-medium mb-2">상대방</p>
            <span className="text-base font-semibold text-gray-700">
              {partnerName || <span className="text-gray-300">아직 연결되지 않았어요</span>}
            </span>
          </div>
        </div>

        {/* 알림 설정 카드 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center">
                {isSubscribed ? (
                  <Bell size={16} className="text-rose-400" />
                ) : (
                  <BellOff size={16} className="text-gray-300" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">알림 설정</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {notifStatus === "denied"
                    ? "브라우저 설정에서 허용해주세요"
                    : isSubscribed
                    ? "파트너 활동 알림 켜짐"
                    : "파트너 활동 알림 꺼짐"}
                </p>
              </div>
            </div>

            {/* 토글 스위치 */}
            <motion.button
              onClick={handleToggleNotif}
              disabled={toggling || notifStatus === "denied"}
              className="relative w-12 h-6 rounded-full transition-colors disabled:opacity-40"
              style={{ backgroundColor: isSubscribed ? "#fb7185" : "#e5e7eb" }}
              whileTap={{ scale: 0.92 }}
            >
              <motion.div
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
                animate={{ left: isSubscribed ? "calc(100% - 22px)" : "2px" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>

      {/* 로그아웃 버튼 */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        whileTap={{ scale: 0.96 }}
        onClick={handleLogout}
        className="absolute bottom-28 flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-gray-400 text-sm font-medium hover:border-gray-300 hover:text-gray-500 transition-colors"
      >
        <LogOut size={15} />
        로그아웃
      </motion.button>
    </div>
  );
}
