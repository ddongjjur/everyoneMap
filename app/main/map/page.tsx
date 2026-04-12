"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import KoreaMapSVG, { Province } from "@/components/KoreaMapSVG";
import RegionDetailMap from "@/components/RegionDetailMap";
import CityDetail from "@/components/CityDetail";

type ViewState =
  | { type: "korea" }
  | { type: "region"; province: Province }
  | { type: "city"; id: string; name: string; province: Province }
  | { type: "island"; id: string; name: string }

export default function MapPage() {
  const [view, setView] = useState<ViewState>({ type: "korea" });

  const [visitedProvinces] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("visitedProvinces") || "[]"); } catch { return []; }
  });

  const [visitedCities] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("visitedCities") || "[]"); } catch { return []; }
  });

  return (
    <div className={view.type === "korea" ? "h-dvh flex flex-col" : "min-h-dvh"} style={{ background: "#EFF6FF" }}>
      {/* Depth 1: 전국 지도 — 화면 전체 채움 */}
      {view.type === "korea" && (
        <>
          {/* 헤더 */}
          <div className="flex-none px-5 pt-12 pb-2">
            <p className="text-xs text-rose-300 font-medium tracking-widest uppercase mb-1">Our Journey</p>
            <h1 className="text-2xl font-bold text-gray-800">우리의 지도</h1>
            <p className="text-xs text-gray-400 mt-1">함께 다녀온 지역을 눌러보세요 ✈️</p>
          </div>

          {/* 지도 — 남은 공간 전부 */}
          <div className="flex-1 min-h-0 px-2 pb-20">
            <KoreaMapSVG
              onSelectProvince={(province) => setView({ type: "region", province })}
              onSelectIsland={(id, name) => setView({ type: "island", id, name })}
              visitedProvinces={visitedProvinces}
            />
          </div>
        </>
      )}

      {/* Depth 2: 시/군/구 지도 */}
      <AnimatePresence>
        {view.type === "region" && (
          <RegionDetailMap
            key={view.province.id}
            provinceCode={view.province.id}
            provinceName={view.province.name}
            provinceEmoji={view.province.emoji}
            provinceColor={view.province.color}
            isMetro={!!view.province.isMetro}
            onBack={() => setView({ type: "korea" })}
            onSelectCity={(cityId, cityName) =>
              setView({ type: "city", id: cityId, name: cityName, province: view.province })
            }
            visitedCities={visitedCities}
          />
        )}
      </AnimatePresence>

      {/* Depth 3: 도시 상세 */}
      <AnimatePresence>
        {view.type === "city" && (
          <CityDetail
            key={view.id}
            cityId={view.id}
            cityName={view.name}
            onBack={() => setView({ type: "region", province: view.province })}
          />
        )}
      </AnimatePresence>

      {/* 울릉도 / 독도 상세 */}
      <AnimatePresence>
        {view.type === "island" && (
          <CityDetail
            key={view.id}
            cityId={view.id}
            cityName={view.name}
            onBack={() => setView({ type: "korea" })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}