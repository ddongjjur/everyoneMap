"use client";

import { useState, useEffect, useRef } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";

interface SigunguFeature {
  type: string;
  properties: { code: string; name: string };
  geometry: GeoPermissibleObjects;
}

interface CityGroup {
  key: string;       // 그룹 대표 코드 (첫 4자리)
  name: string;      // 표시할 이름 (시/군/구)
  cityId: string;    // onSelectCity에 넘길 ID
  features: SigunguFeature[];
}

interface RegionDetailMapProps {
  provinceCode: string;
  provinceName: string;
  provinceEmoji: string;
  provinceColor: string;
  provinceStroke?: string;
  isMetro: boolean;
  onSelectCity: (cityId: string, cityName: string) => void;
  onBack: () => void;
  visitCounts?: Record<string, number>; // city_id → 방문 횟수
}

// 방문 횟수별 지역 고유색 적용 (hex opacity)
function visitFill(count: number, color: string, stroke: string): string {
  if (count === 0) return "#FFFFFF";
  if (count <= 2)  return color + "55"; // ~33%
  if (count <= 5)  return color + "99"; // ~60%
  if (count <= 8)  return color + "CC"; // ~80%
  return stroke;                         // 9+: stroke색으로 가장 진하게
}

const WIDTH = 400;
const HEIGHT = 400;

// 특정 지역의 투영 범위를 수동으로 제한 (먼 섬 등으로 인한 축소 방지)
// [서쪽경도, 남쪽위도, 동쪽경도, 북쪽위도]
const CLIP_BOUNDS: Record<string, [number, number, number, number]> = {
  "23": [126.05, 37.1, 127.0, 37.95], // 인천: 강화군 포함, 옹진군 먼 섬 제외
};

// 라벨 SVG 좌표 오버라이드 { 시도코드: { 지역명: [x, y] } }
const SVG_LABEL_OVERRIDES: Record<string, Record<string, [number, number]>> = {
  "23": {
    "옹진군": [180, 320],
    "강화군": [170, 117.84617533478942],
    "중구":   [180, 227.72856075280404],
  },
};

/** 도(道) 선택 시: 구 단위 features를 부모 시/군 단위로 그룹핑 */
function groupByCity(features: SigunguFeature[]): CityGroup[] {
  const map = new Map<string, CityGroup>();

  for (const f of features) {
    const code = f.properties.code;
    const name = f.properties.name;
    const lastDigit = parseInt(code.slice(-1));

    // 마지막 자리가 0이면 단독 시/군, 아니면 구 단위 (상위 시의 하위 구)
    const groupKey = lastDigit === 0 ? code : code.slice(0, 4);

    if (!map.has(groupKey)) {
      // 구 단위인 경우 이름에서 시 부분만 추출 ("용인시수지구" → "용인시")
      const cityName = lastDigit === 0
        ? name
        : name.match(/^(.+?시)/)?.[1] ?? name;

      map.set(groupKey, {
        key: groupKey,
        name: cityName,
        cityId: `${code.slice(0, 2)}_${cityName}`,
        features: [],
      });
    }
    map.get(groupKey)!.features.push(f);
  }

  return Array.from(map.values());
}

export default function RegionDetailMap({
  provinceCode,
  provinceName,
  provinceEmoji,
  provinceColor,
  provinceStroke = "#94A3B8",
  isMetro,
  onSelectCity,
  onBack,
  visitCounts = {},
}: RegionDetailMapProps) {
  const [groups, setGroups] = useState<CityGroup[]>([]);
  const [pathMap, setPathMap] = useState<Record<string, string>>({});
  const [centroidMap, setCentroidMap] = useState<Record<string, [number, number]>>({});
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const loaded = useRef<string>("");

  useEffect(() => {
    if (loaded.current === provinceCode) return;
    loaded.current = provinceCode;

    fetch("/korea-sigungu.json")
      .then((r) => r.json())
      .then((geojson) => {
        const filtered: SigunguFeature[] = geojson.features.filter((f: SigunguFeature) =>
          f.properties.code.startsWith(provinceCode)
        );
        if (filtered.length === 0) return;

        // 광역시: feature 그대로 / 도: 시 단위로 그룹핑
        const cityGroups: CityGroup[] = isMetro
          ? filtered.map((f) => ({
              key: f.properties.code,
              name: f.properties.name,
              cityId: `${provinceCode}_${f.properties.name}`,
              features: [f],
            }))
          : groupByCity(filtered);

        const subCollection = {
          type: "FeatureCollection",
          features: filtered,
        };

        const clip = CLIP_BOUNDS[provinceCode];
        const fitTarget = clip
          ? {
              type: "Feature",
              geometry: {
                type: "MultiPoint",
                coordinates: [
                  [clip[0], clip[1]], // 남서
                  [clip[2], clip[3]], // 북동
                ],
              },
              properties: {},
            }
          : subCollection;

        const projection = geoMercator().fitExtent(
          [[10, 10], [WIDTH - 10, HEIGHT - 10]],
          fitTarget as GeoPermissibleObjects
        );
        const pathGen = geoPath(projection);

        const paths: Record<string, string> = {};
        const centroids: Record<string, [number, number]> = {};

        for (const group of cityGroups) {
          // 그룹 내 features를 합쳐서 대표 path/centroid 계산
          const allCoords: number[][][] = [];

          for (const f of group.features) {
            const d = pathGen(f.geometry);
            if (d) {
              // 대표 path는 첫 번째 feature 사용
              if (!paths[group.key]) paths[group.key] = d;
              else paths[group.key] += " " + d; // 여러 구를 하나의 path로 합침
            }
            const c = pathGen.centroid(f.geometry);
            if (c && !isNaN(c[0])) allCoords.push([c]);
          }

          // centroid: 그룹 내 모든 centroid의 평균
          if (allCoords.length > 0) {
            const avgX = allCoords.reduce((s, c) => s + c[0][0], 0) / allCoords.length;
            const avgY = allCoords.reduce((s, c) => s + c[0][1], 0) / allCoords.length;
            centroids[group.key] = [avgX, avgY];
          }
        }

        setGroups(cityGroups);
        setPathMap(paths);
        setCentroidMap(centroids);
      });
  }, [provinceCode, isMetro]);

  const label = isMetro ? "구/군을 선택해보세요" : "도시를 선택해보세요";

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="fixed inset-0 bg-white z-40 overflow-y-auto no-scrollbar"
      style={{ maxWidth: 430, margin: "0 auto" }}
    >
      {/* 헤더 */}
      <div
        className="sticky top-0 z-10 px-4 pt-12 pb-4"
        style={{ background: provinceColor + "CC", backdropFilter: "blur(8px)" }}
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
            <span className="text-2xl">{provinceEmoji}</span>
            <h2 className="text-xl font-bold text-gray-800">{provinceName}</h2>
          </div>
        </div>
        <p className="text-xs text-gray-500 pl-11">{label}</p>
      </div>

      {/* 지도 */}
      <div className="px-4 py-4">
        {groups.length === 0 ? (
          <div className="flex items-center justify-center h-60 text-gray-300 text-sm">
            지도 불러오는 중...
          </div>
        ) : (
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ maxHeight: "55dvh" }}>
            <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="#F8FAFC" rx="8" />

            {groups.map((group) => {
              const isHovered = hoveredKey === group.key;
              const count = visitCounts[group.cityId] ?? 0;
              const isVisited = count > 0;
              const centroid = centroidMap[group.key];
              if (!pathMap[group.key]) return null;

              const displayName = isMetro
                ? group.name
                : group.name.replace(/[시군]$/, "");

              const labelOverride = SVG_LABEL_OVERRIDES[provinceCode]?.[group.name];
              const lx = labelOverride ? labelOverride[0] : centroid?.[0];
              const ly = labelOverride ? labelOverride[1] : centroid?.[1];

              const baseFill = visitFill(count, provinceColor, provinceStroke);
              const fill = isHovered
                ? (isVisited ? provinceStroke : provinceColor)
                : baseFill;

              return (
                <g key={group.key}>
                  <path
                    d={pathMap[group.key]}
                    fill={fill}
                    stroke={isHovered ? provinceStroke : (isVisited ? provinceColor : "#CBD5E1")}
                    strokeWidth={isHovered ? 1.5 : (isVisited ? 1 : 0.8)}
                    strokeLinejoin="round"
                    style={{ cursor: "pointer", transition: "fill 0.15s ease" }}
                    onClick={() => onSelectCity(group.cityId, group.name)}
                    onMouseEnter={() => setHoveredKey(group.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                  />
                  {lx && ly && (
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={isMetro ? 8 : 9}
                      fontWeight="bold"
                      fill={isVisited ? "#1E293B" : isHovered ? "#1E293B" : "#94A3B8"}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                      paintOrder="stroke"
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth={2}
                    >
                      {displayName}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* 전체 목록 */}
      <div className="px-4 pb-6">
        <p className="text-xs text-gray-400 mb-3 font-medium">전체 목록</p>
        <div className="grid grid-cols-3 gap-2">
          {groups.map((group) => {
            const isVisited = (visitCounts[group.cityId] ?? 0) > 0;
            return (
              <motion.button
                key={group.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectCity(group.cityId, group.name)}
                className={`rounded-xl py-3 px-2 text-xs font-semibold border transition-all ${
                  isVisited
                    ? "bg-rose-400 border-rose-400 text-white"
                    : "bg-white border-gray-100 text-gray-600 hover:border-gray-300"
                }`}
              >
                {group.name}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}