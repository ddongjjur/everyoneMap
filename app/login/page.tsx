"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState, Suspense } from "react";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";

// 설정돼 있으면 Google Identity Services 로 로그인, 없으면 기존 Supabase 리다이렉트 방식으로 대체
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdApi {
  initialize: (config: {
    client_id: string;
    nonce: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type: "standard";
      theme: "outline" | "filled_blue" | "filled_black";
      size: "large" | "medium" | "small";
      text: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape: "rectangular" | "pill";
      locale: string;
      width: number;
    }
  ) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

// GIS 에는 SHA-256 해시한 nonce, Supabase 에는 원본 nonce 를 전달
async function createNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = btoa(String.fromCharCode(...Array.from(bytes)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hashed };
}

function LoginContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [signInFailed, setSignInFailed] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || signInFailed;

  useEffect(() => {
    const container = googleButtonRef.current;
    if (!GOOGLE_CLIENT_ID || !scriptReady || !container) return;
    let cancelled = false;

    const init = async () => {
      const { raw, hashed } = await createNonce();
      if (cancelled || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        nonce: hashed,
        callback: async ({ credential }) => {
          setLoading(true);
          setSignInFailed(false);
          const { error: signInError } = await createClient().auth.signInWithIdToken({
            provider: "google",
            token: credential,
            nonce: raw,
          });
          if (signInError) {
            setLoading(false);
            setSignInFailed(true);
            return;
          }
          router.replace("/");
          router.refresh();
        },
      });

      window.google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        locale: "ko",
        width: 280,
      });
    };
    init();

    return () => {
      cancelled = true;
    };
  }, [scriptReady, router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-rose-50 to-pink-50 px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-8 w-full max-w-xs"
      >
        {/* Logo */}
        <div className="text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <h1 className="text-3xl font-bold text-rose-500 mb-2">우리의 지도</h1>
          <p className="text-gray-400 text-sm">우리만의 데이트 & 여행을 기록해요</p>
        </div>

        <div className="flex gap-2 text-rose-200 text-xl">
          <span>♥</span><span>♥</span><span>♥</span>
        </div>

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-rose-400 text-sm text-center bg-rose-50 border border-rose-200 rounded-xl px-4 py-2"
          >
            로그인 중 문제가 생겼어요. 다시 시도해주세요.
          </motion.p>
        )}

        {/* Google Login */}
        {GOOGLE_CLIENT_ID ? (
          <div className="w-full flex flex-col items-center justify-center min-h-[44px]">
            <Script
              src="https://accounts.google.com/gsi/client"
              strategy="afterInteractive"
              onReady={() => setScriptReady(true)}
            />
            {/* Google 이 렌더링하는 버튼 — 로딩 중에도 DOM 을 유지해 다시 그릴 필요가 없게 함 */}
            <div ref={googleButtonRef} className={loading ? "hidden" : ""} />
            {loading && <span className="text-sm text-gray-400">로그인 중...</span>}
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white border-2 border-gray-200 shadow-sm font-semibold text-gray-700 hover:border-gray-300 hover:shadow-md transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="text-sm">로그인 중...</span>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Google로 시작하기</span>
              </>
            )}
          </motion.button>
        )}

        <p className="text-gray-300 text-xs text-center">
          로그인하면 커플 코드로 연결해<br />우리만의 지도를 만들 수 있어요
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
