"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";

const tabs = [
  { href: "/main/map", label: "지도", icon: "🗺️" },
  { href: "/main/screen2", label: "추억", icon: "📷" },
  { href: "/main/screen3", label: "우리", icon: "💑" },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-4 py-2 z-50">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              className="flex flex-col items-center gap-1 px-6 py-1 relative"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-rose-50 rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="text-2xl relative z-10">{tab.icon}</span>
              <span
                className={`text-xs font-medium relative z-10 transition-colors ${
                  isActive ? "text-rose-400" : "text-gray-400"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
