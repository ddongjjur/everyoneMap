"use client";

import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { Province } from "./KoreaMapSVG";

interface ProvinceDetailProps {
  province: Province;
  onBack: () => void;
  onSelectCity: (cityId: string, cityName: string) => void;
  visitedCities?: string[];
}

export default function ProvinceDetail({
  province,
  onBack,
  onSelectCity,
  visitedCities = [],
}: ProvinceDetailProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="fixed inset-0 bg-white z-40 overflow-y-auto no-scrollbar"
      style={{ maxWidth: 430, margin: "0 auto" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 pt-12 pb-4"
        style={{ background: province.color + "CC", backdropFilter: "blur(8px)" }}
      >
        <div className="flex items-center gap-3 mb-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center shadow-sm"
          >
            <ChevronLeft size={18} className="text-gray-700" />
          </motion.button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{province.emoji}</span>
            <h2 className="text-xl font-bold text-gray-800">{province.name}</h2>
          </div>
        </div>
        <p className="text-xs text-gray-500 pl-11">방문한 지역을 선택해보세요</p>
      </div>

      {/* City grid */}
      <div className="px-4 py-4 grid grid-cols-3 gap-3">
        {province.cities.map((city, idx) => {
          const cityId = `${province.id}_${city}`;
          const isVisited = visitedCities.includes(cityId);

          return (
            <motion.button
              key={city}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectCity(cityId, city)}
              className={`relative rounded-2xl py-4 px-2 flex flex-col items-center gap-1 shadow-sm border transition-all ${
                isVisited
                  ? "bg-rose-400 border-rose-400 text-white shadow-rose-200"
                  : "bg-white border-gray-100 text-gray-700 hover:border-gray-200 hover:shadow-md"
              }`}
            >
              {isVisited && (
                <span className="absolute top-1.5 right-2 text-[10px] text-rose-100">✓</span>
              )}
              <span className="text-base">📍</span>
              <span className={`text-xs font-semibold text-center leading-tight ${isVisited ? "text-white" : "text-gray-700"}`}>
                {city}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="h-8" />
    </motion.div>
  );
}
