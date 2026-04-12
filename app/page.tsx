"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"home" | "generate" | "enter">("home");
  const [generatedCode, setGeneratedCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // 이미 커플 연결된 경우 바로 이동
  useEffect(() => {
    if (!user) return;
    supabase
      .from("couples")
      .select("id")
      .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
      .maybeSingle()
      .then(({ data }) => {
        if (data) router.push("/main/map");
      });
  }, [user]);

  const handleGenerate = async () => {
    if (!user) return;
    setLoading(true);
    const code = generateCode();

    const { error: err } = await supabase
      .from("couples")
      .insert({ code, creator_id: user.id });

    if (err) {
      setError("코드 생성에 실패했어요. 다시 시도해주세요.");
      setLoading(false);
      return;
    }
    setGeneratedCode(code);
    setMode("generate");
    setLoading(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreatorEnter = () => router.push("/main/map");

  const handleEnterCode = async () => {
    if (!user) return;
    setLoading(true);

    const { data: couple, error: findErr } = await supabase
      .from("couples")
      .select("id, creator_id, partner_id")
      .eq("code", inputCode.toUpperCase())
      .maybeSingle();

    if (findErr || !couple) {
      setError("코드가 맞지 않아요. 다시 확인해주세요.");
      setTimeout(() => setError(""), 2500);
      setLoading(false);
      return;
    }

    if (couple.creator_id === user.id) {
      setError("본인이 생성한 코드예요.");
      setTimeout(() => setError(""), 2500);
      setLoading(false);
      return;
    }

    if (couple.partner_id) {
      setError("이미 연결된 커플 코드예요.");
      setTimeout(() => setError(""), 2500);
      setLoading(false);
      return;
    }

    const { error: joinErr } = await supabase
      .from("couples")
      .update({ partner_id: user.id })
      .eq("id", couple.id);

    if (joinErr) {
      setError("연결에 실패했어요. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    router.push("/main/map");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-rose-50 to-pink-50 px-6">
      {/* 로그아웃 버튼 */}
      {user && (
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 text-xs text-gray-300 hover:text-gray-400"
        >
          로그아웃
        </button>
      )}

      <AnimatePresence mode="wait">
        {/* Home */}
        {mode === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-8 w-full max-w-xs"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <h1 className="text-3xl font-bold text-rose-500 mb-2">우리의 지도</h1>
              <p className="text-gray-400 text-sm">우리만의 데이트 & 여행을 기록해요</p>
            </div>

            {user && (
              <p className="text-xs text-gray-400 bg-white/60 px-4 py-2 rounded-full border border-gray-100">
                {user.user_metadata?.full_name ?? user.email}
              </p>
            )}

            <div className="flex gap-2 text-rose-200 text-2xl">
              <span>♥</span><span>♥</span><span>♥</span>
            </div>

            <div className="flex flex-col gap-4 w-full">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-rose-400 text-white font-semibold text-lg shadow-lg shadow-rose-200 hover:bg-rose-500 transition-colors disabled:opacity-50"
              >
                코드 생성하기
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setMode("enter")}
                className="w-full py-4 rounded-2xl bg-white text-rose-400 font-semibold text-lg border-2 border-rose-200 hover:border-rose-300 transition-colors"
              >
                코드 입력하기
              </motion.button>
            </div>

            <p className="text-gray-300 text-xs text-center">
              한 명이 코드를 생성하고<br />상대방이 코드를 입력하면 연결돼요
            </p>
          </motion.div>
        )}

        {/* Code Generated */}
        {mode === "generate" && (
          <motion.div
            key="generate"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-8 w-full max-w-xs"
          >
            <div className="text-center">
              <div className="text-5xl mb-4">💌</div>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">코드가 생성됐어요!</h2>
              <p className="text-gray-400 text-sm">상대방에게 이 코드를 전달해주세요</p>
            </div>

            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="bg-white rounded-3xl px-10 py-8 shadow-xl border border-rose-100 text-center"
            >
              <p className="text-gray-400 text-xs mb-3 tracking-widest uppercase">커플 코드</p>
              <p className="text-4xl font-bold tracking-[0.3em] text-rose-400">{generatedCode}</p>
            </motion.div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-50 text-rose-400 font-medium border border-rose-200"
            >
              {copied ? "✓ 복사됨!" : "📋 코드 복사하기"}
            </motion.button>

            <div className="flex flex-col gap-3 w-full">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleCreatorEnter}
                className="w-full py-4 rounded-2xl bg-rose-400 text-white font-semibold text-lg shadow-lg shadow-rose-200"
              >
                입장하기
              </motion.button>
              <button
                onClick={() => setMode("home")}
                className="text-gray-400 text-sm hover:text-gray-500 text-center"
              >
                ← 돌아가기
              </button>
            </div>
          </motion.div>
        )}

        {/* Enter Code */}
        {mode === "enter" && (
          <motion.div
            key="enter"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center gap-8 w-full max-w-xs"
          >
            <div className="text-center">
              <div className="text-5xl mb-4">🔑</div>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">코드를 입력해주세요</h2>
              <p className="text-gray-400 text-sm">상대방에게 받은 6자리 코드를 입력해요</p>
            </div>

            <div className="w-full flex flex-col gap-3">
              <input
                type="text"
                maxLength={6}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="코드 입력"
                className="w-full text-center text-3xl font-bold tracking-[0.3em] py-5 px-4 rounded-2xl border-2 border-rose-200 focus:border-rose-400 focus:outline-none bg-white text-rose-400 placeholder-rose-200"
              />

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-rose-400 text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleEnterCode}
                disabled={inputCode.length < 6 || loading}
                className="w-full py-4 rounded-2xl bg-rose-400 text-white font-semibold text-lg shadow-lg shadow-rose-200 disabled:opacity-40 disabled:shadow-none transition-all"
              >
                {loading ? "연결 중..." : "연결하기"}
              </motion.button>

              <button
                onClick={() => setMode("home")}
                className="text-gray-400 text-sm hover:text-gray-500 text-center"
              >
                ← 돌아가기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
