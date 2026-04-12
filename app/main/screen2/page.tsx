"use client";

import { motion } from "framer-motion";

export default function Screen2Page() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-gradient-to-b from-purple-50/40 to-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="text-6xl mb-5">📷</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">추억</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          곧 업데이트될 예정이에요<br />
          우리의 특별한 순간들을 모아볼 수 있어요
        </p>
        <div className="mt-8 flex gap-2 justify-center">
          <div className="w-2 h-2 rounded-full bg-rose-200" />
          <div className="w-2 h-2 rounded-full bg-rose-300" />
          <div className="w-2 h-2 rounded-full bg-rose-200" />
        </div>
      </motion.div>
    </div>
  );
}
