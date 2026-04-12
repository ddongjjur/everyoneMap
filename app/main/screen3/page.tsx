"use client";

export const dynamic = "force-dynamic";

import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Screen3Page() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-gradient-to-b from-rose-50/40 to-white relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="text-6xl mb-5">💑</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">우리</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          곧 업데이트될 예정이에요<br />
          우리 둘만의 공간이 될 거예요
        </p>
        <div className="mt-8 flex gap-2 justify-center">
          <div className="w-2 h-2 rounded-full bg-rose-200" />
          <div className="w-2 h-2 rounded-full bg-rose-300" />
          <div className="w-2 h-2 rounded-full bg-rose-200" />
        </div>
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