"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export interface Region {
  id: string;
  name: string;
  emoji: string;
  // SVG path approximate position (percentage)
  x: number;
  y: number;
  width: number;
  height: number;
  isSeoul?: boolean;
}

const KOREA_REGIONS: Region[] = [
  // 수도권
  { id: "seoul", name: "서울", emoji: "🏙️", x: 28, y: 23, width: 12, height: 9, isSeoul: true },
  { id: "incheon", name: "인천", emoji: "✈️", x: 18, y: 25, width: 10, height: 8 },
  { id: "gyeonggi", name: "경기도", emoji: "🌿", x: 22, y: 18, width: 20, height: 18 },
  // 강원도
  { id: "gangwon", name: "강원도", emoji: "🏔️", x: 48, y: 15, width: 22, height: 22 },
  // 충청
  { id: "chungbuk", name: "충청북도", emoji: "🌾", x: 42, y: 37, width: 16, height: 14 },
  { id: "chungnam", name: "충청남도", emoji: "🌊", x: 22, y: 38, width: 18, height: 14 },
  { id: "daejeon", name: "대전", emoji: "🌆", x: 36, y: 43, width: 8, height: 7 },
  { id: "sejong", name: "세종", emoji: "🏛️", x: 33, y: 39, width: 6, height: 6 },
  // 전라
  { id: "jeonbuk", name: "전라북도", emoji: "🌻", x: 22, y: 52, width: 18, height: 14 },
  { id: "jeonnam", name: "전라남도", emoji: "🌺", x: 18, y: 64, width: 22, height: 18 },
  { id: "gwangju", name: "광주", emoji: "🌸", x: 28, y: 66, width: 8, height: 7 },
  // 경상
  { id: "gyeongbuk", name: "경상북도", emoji: "🍎", x: 52, y: 37, width: 20, height: 22 },
  { id: "daegu", name: "대구", emoji: "🍑", x: 52, y: 54, width: 10, height: 9 },
  { id: "gyeongnam", name: "경상남도", emoji: "🎋", x: 46, y: 62, width: 20, height: 16 },
  { id: "busan", name: "부산", emoji: "⚓", x: 62, y: 70, width: 10, height: 9 },
  { id: "ulsan", name: "울산", emoji: "🏭", x: 63, y: 62, width: 9, height: 8 },
  // 제주
  { id: "jeju", name: "제주도", emoji: "🌴", x: 26, y: 86, width: 14, height: 9 },
];

interface KoreaMapProps {
  onSelectRegion: (region: Region) => void;
  visitedRegions?: string[];
}

export default function KoreaMap({ onSelectRegion, visitedRegions = [] }: KoreaMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="relative w-full" style={{ paddingBottom: "120%" }}>
      {/* Korea outline background */}
      <div className="absolute inset-0">
        <svg viewBox="0 0 100 120" className="w-full h-full opacity-10">
          {/* Simplified Korea outline */}
          <path
            d="M 38 8 L 72 12 L 78 22 L 76 35 L 72 45 L 74 55 L 70 65 L 72 72 L 68 80 L 55 82 L 48 78 L 40 82 L 30 82 L 22 75 L 18 68 L 16 58 L 18 48 L 20 38 L 18 28 L 22 20 L 30 14 Z"
            fill="#fda4af"
            stroke="#fb7185"
            strokeWidth="0.5"
          />
          {/* Jeju island */}
          <ellipse cx="34" cy="92" rx="7" ry="4" fill="#fda4af" stroke="#fb7185" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Region buttons */}
      {KOREA_REGIONS.map((region) => {
        const isVisited = visitedRegions.includes(region.id);
        const isHovered = hoveredId === region.id;

        return (
          <motion.button
            key={region.id}
            style={{
              position: "absolute",
              left: `${region.x}%`,
              top: `${region.y}%`,
              width: `${region.width}%`,
              height: `${region.height}%`,
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onHoverStart={() => setHoveredId(region.id)}
            onHoverEnd={() => setHoveredId(null)}
            onClick={() => onSelectRegion(region)}
            className="flex flex-col items-center justify-center rounded-xl transition-all"
          >
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 bg-rose-100 rounded-xl border-2 border-rose-300 shadow-lg"
                />
              )}
            </AnimatePresence>

            <div
              className={`relative z-10 rounded-xl transition-all ${
                isVisited
                  ? "bg-rose-400 shadow-md shadow-rose-200"
                  : "bg-white/80 border border-gray-100 shadow-sm"
              } px-1 py-0.5 flex flex-col items-center`}
            >
              <span className="text-xs leading-tight">{region.emoji}</span>
              <span
                className={`text-[8px] font-semibold leading-tight ${
                  isVisited ? "text-white" : "text-gray-600"
                }`}
              >
                {region.name}
              </span>
              {isVisited && (
                <span className="text-[6px] text-rose-100">✓</span>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
