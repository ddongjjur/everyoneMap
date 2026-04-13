"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import KoreaMapSVG, { Province } from "@/components/KoreaMapSVG";
import RegionDetailMap from "@/components/RegionDetailMap";
import CityDetail from "@/components/CityDetail";
import { createClient } from "@/lib/supabase/client";

type ViewState =
  | { type: "korea" }
  | { type: "region"; province: Province }
  | { type: "city"; id: string; name: string; province: Province }
  | { type: "island"; id: string; name: string }

export default function MapPage() {
  const supabase = createClient();
  const [view, setView] = useState<ViewState>({ type: "korea" });

  // city_id별 방문 횟수 (날짜 기록 수 기준)
  const [visitCounts, setVisitCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: couple } = await supabase
        .from("couples")
        .select("id")
        .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
        .maybeSingle();
      if (!couple) return;

      const { data: records } = await supabase
        .from("city_records")
        .select("city_id")
        .eq("couple_id", couple.id);

      if (!records) return;

      const counts: Record<string, number> = {};
      records.forEach(({ city_id }) => {
        counts[city_id] = (counts[city_id] ?? 0) + 1;
      });
      setVisitCounts(counts);
    };
    load();
  }, []);

  return (
    <div className={view.type === "korea" ? "h-dvh flex flex-col" : "min-h-dvh"} style={{ background: "#EFF6FF" }}>
      {/* Depth 1: 전국 지도 */}
      {view.type === "korea" && (
        <>
          <div className="flex-none px-5 pt-12 pb-2">
            <p className="text-xs text-rose-300 font-medium tracking-widest uppercase mb-1">Our Journey</p>
            <h1 className="text-2xl font-bold text-gray-800">우리의 지도</h1>
            <p className="text-xs text-gray-400 mt-1">함께 다녀온 지역을 눌러보세요 ✈️</p>
          </div>
          <div className="flex-1 min-h-0 px-2 pb-20">
            <KoreaMapSVG
              onSelectProvince={(province) => setView({ type: "region", province })}
              onSelectIsland={(id, name) => setView({ type: "island", id, name })}
              visitedProvinces={[]}
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
            provinceStroke={view.province.stroke}
            isMetro={!!view.province.isMetro}
            onBack={() => setView({ type: "korea" })}
            onSelectCity={(cityId, cityName) =>
              setView({ type: "city", id: cityId, name: cityName, province: view.province })
            }
            visitCounts={visitCounts}
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
