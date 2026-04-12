"use client";

import { useState, useEffect, useRef } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";

export interface Province {
  id: string;
  name: string;
  color: string;
  stroke: string;
  labelX: number;
  labelY: number;
  fontSize?: number;
  isSeoul?: boolean;
  isMetro?: boolean;
  cities: string[];
  emoji: string;
}

const PROVINCE_META: Record<string, Omit<Province, "id" | "name" | "labelX" | "labelY">> = {
  "11": { color: "#F9A8D4", stroke: "#BE185D", emoji: "🏙️", isSeoul: true, isMetro: true, fontSize: 7, cities: [] },
  "21": { color: "#BFDBFE", stroke: "#1D4ED8", emoji: "⚓", isMetro: true, fontSize: 7, cities: ["중구", "서구", "동구", "영도구", "부산진구", "동래구", "남구", "북구", "해운대구", "사하구", "금정구", "강서구", "연제구", "수영구", "사상구", "기장군"] },
  "22": { color: "#FEF08A", stroke: "#A16207", emoji: "🍑", isMetro: true, fontSize: 7, cities: ["중구", "동구", "서구", "남구", "북구", "수성구", "달서구", "달성군"] },
  "23": { color: "#DDD6FE", stroke: "#7C3AED", emoji: "✈️", isMetro: true, fontSize: 7, cities: ["중구", "동구", "미추홀구", "연수구", "남동구", "부평구", "계양구", "서구", "강화군", "옹진군"] },
  "24": { color: "#FBCFE8", stroke: "#9D174D", emoji: "🌸", isMetro: true, fontSize: 7, cities: ["동구", "서구", "남구", "북구", "광산구"] },
  "25": { color: "#FCA5A5", stroke: "#B91C1C", emoji: "🌆", isMetro: true, fontSize: 7, cities: ["동구", "중구", "서구", "유성구", "대덕구"] },
  "26": { color: "#99F6E4", stroke: "#0F766E", emoji: "🏭", isMetro: true, fontSize: 7, cities: ["중구", "남구", "동구", "북구", "울주군"] },
  "29": { color: "#FDE68A", stroke: "#92400E", emoji: "🏛️", isMetro: true, fontSize: 6, cities: ["세종시"] },
  "31": { color: "#FBCFE8", stroke: "#DB2777", emoji: "🌿", cities: ["수원", "성남", "고양", "용인", "부천", "안산", "안양", "남양주", "화성", "평택", "파주", "김포", "하남", "가평", "양평", "의왕", "과천", "구리", "포천", "이천", "여주", "동두천", "안성"] },
  "32": { color: "#FDE68A", stroke: "#D97706", emoji: "🏔️", cities: ["춘천", "원주", "강릉", "동해", "태백", "속초", "삼척", "홍천", "횡성", "영월", "평창", "정선", "고성", "양양", "인제", "화천", "양구", "철원"] },
  "33": { color: "#BBF7D0", stroke: "#15803D", emoji: "🌾", cities: ["청주", "충주", "제천", "보은", "옥천", "영동", "증평", "진천", "괴산", "음성", "단양"] },
  "34": { color: "#FED7AA", stroke: "#C2410C", emoji: "🌊", cities: ["천안", "공주", "보령", "아산", "서산", "논산", "당진", "금산", "부여", "서천", "청양", "홍성", "예산", "태안", "계룡"] },
  "35": { color: "#BAE6FD", stroke: "#0369A1", emoji: "🌻", cities: ["전주", "군산", "익산", "정읍", "남원", "김제", "완주", "진안", "무주", "장수", "임실", "순창", "고창", "부안"] },
  "36": { color: "#E9D5FF", stroke: "#7E22CE", emoji: "🌺", cities: ["목포", "여수", "순천", "나주", "광양", "담양", "곡성", "구례", "고흥", "보성", "화순", "장흥", "강진", "해남", "영암", "무안", "함평", "영광", "장성", "완도", "진도", "신안"] },
  "37": { color: "#FED7AA", stroke: "#EA580C", emoji: "🍎", cities: ["포항", "경주", "김천", "안동", "구미", "영주", "영천", "상주", "문경", "경산", "의성", "청송", "영양", "영덕", "청도", "고령", "성주", "칠곡", "예천", "봉화", "울진"] },
  "38": { color: "#FBCFE8", stroke: "#9D174D", emoji: "🎋", cities: ["창원", "진주", "통영", "사천", "김해", "밀양", "거제", "양산", "의령", "함안", "창녕", "고성", "남해", "하동", "산청", "함양", "거창", "합천"] },
  "39": { color: "#D9F99D", stroke: "#4D7C0F", emoji: "🌴", cities: ["제주시", "서귀포시"] },
};

interface GeoFeature {
  type: string;
  properties: { code: string; name: string };
  geometry: GeoPermissibleObjects;
}

interface KoreaMapSVGProps {
  onSelectProvince: (province: Province) => void;
  onSelectIsland?: (id: string, name: string) => void;
  visitedProvinces?: string[];
}

const WIDTH = 500;
const HEIGHT = 580;

// 자동 centroid가 부정확한 지역의 라벨 위치 수동 지정
const LABEL_OVERRIDES: Record<string, [number, number]> = {
  "31": [210.52721237712922, 180.04120567815636], // 경기도
};

// 인셋 크기 및 위치
const JEJU_INSET = { x: 6, y: 478, w: 120, h: 78 };
const ISLAND_INSET = { x: 406, y: 170, w: 86, h: 130 };

export default function KoreaMapSVG({ onSelectProvince, onSelectIsland, visitedProvinces = [] }: KoreaMapSVGProps) {
  const [mainFeatures, setMainFeatures] = useState<GeoFeature[]>([]);
  const [jejuFeature, setJejuFeature] = useState<GeoFeature | null>(null);
  const [pathMap, setPathMap] = useState<Record<string, string>>({});
  const [centroidMap, setCentroidMap] = useState<Record<string, [number, number]>>({});
  const [jejuPath, setJejuPath] = useState<string>("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredIsland, setHoveredIsland] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    fetch("/korea-provinces.json")
      .then((r) => r.json())
      .then((geojson) => {
        const allFeatures: GeoFeature[] = geojson.features;
        const main = allFeatures.filter((f) => f.properties.code !== "39");
        const jeju = allFeatures.find((f) => f.properties.code === "39") ?? null;

        // 본토 지도 투영 — 제주 제외하고 확대
        const mainProjection = geoMercator()
          .center([127.6, 36.8])
          .scale(5500)
          .translate([WIDTH / 2 - 10, HEIGHT / 2 - 50]);
        const mainPathGen = geoPath(mainProjection);

        const paths: Record<string, string> = {};
        const centroids: Record<string, [number, number]> = {};

        main.forEach((f) => {
          const code = f.properties.code;
          const d = mainPathGen(f.geometry);
          if (d) paths[code] = d;
          const c = mainPathGen.centroid(f.geometry);
          if (c && !isNaN(c[0])) centroids[code] = c as [number, number];
        });

        // 제주도 인셋 투영 — 인셋 박스 크기에 맞게 fit
        if (jeju) {
          const jejuInsetW = JEJU_INSET.w - 10;
          const jejuInsetH = JEJU_INSET.h - 22; // 상단 라벨 공간 제외
          const jejuProjection = geoMercator().fitSize(
            [jejuInsetW, jejuInsetH],
            { type: "FeatureCollection", features: [jeju] } as GeoPermissibleObjects
          );
          const jejuPathGen = geoPath(jejuProjection);
          const d = jejuPathGen(jeju.geometry);
          if (d) setJejuPath(d);
        }

        setMainFeatures(main);
        setJejuFeature(jeju);
        setPathMap(paths);
        setCentroidMap(centroids);
      });
  }, []);

  const makeProvince = (f: GeoFeature): Province => {
    const code = f.properties.code;
    const meta = PROVINCE_META[code];
    const centroid = centroidMap[code];
    return {
      id: code,
      name: f.properties.name
        .replace("특별자치도", "").replace("특별자치시", "")
        .replace("광역시", "").replace("특별시", "").trim(),
      labelX: centroid?.[0] ?? 0,
      labelY: centroid?.[1] ?? 0,
      ...meta,
    };
  };

  return (
    <div className="w-full h-full select-none">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-full"
        style={{ display: "block" }}
      >
        {/* 바다 배경 */}
        <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="#EFF6FF" rx="12" />

        {/* 본토 지도 (제주 제외) */}
        {mainFeatures.map((f) => {
          const code = f.properties.code;
          const meta = PROVINCE_META[code];
          if (!meta || !pathMap[code]) return null;

          const isHovered = hoveredId === code;
          const isVisited = visitedProvinces.includes(code);
          const centroid = centroidMap[code];
          const fontSize = meta.fontSize ?? 11;
          const province = makeProvince(f);

          return (
            <g key={code}>
              <path
                d={pathMap[code]}
                fill={isVisited ? "#FB7185" : isHovered ? meta.color : "#FFFFFF"}
                stroke={isHovered ? meta.stroke : "#CBD5E1"}
                strokeWidth={isHovered ? 2 : 0.8}
                strokeLinejoin="round"
                style={{ cursor: "pointer", transition: "fill 0.15s ease" }}
                onClick={() => onSelectProvince(province)}
                onMouseEnter={() => setHoveredId(code)}
                onMouseLeave={() => setHoveredId(null)}
              />
              {centroid && (
                <text
                  x={LABEL_OVERRIDES[code]?.[0] ?? centroid[0]}
                  y={LABEL_OVERRIDES[code]?.[1] ?? centroid[1]}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={fontSize}
                  fontWeight="bold"
                  fill={isVisited ? "white" : isHovered ? "#1E293B" : "#94A3B8"}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                  paintOrder="stroke"
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth={2}
                >
                  {province.name}
                </text>
              )}
            </g>
          );
        })}

        {/* ── 제주도 인셋 (왼쪽 아래) ── */}
        {jejuFeature && (() => {
          const { x, y, w, h } = JEJU_INSET;
          const meta = PROVINCE_META["39"];
          const isHovered = hoveredId === "jeju-inset";
          const isVisited = visitedProvinces.includes("39");
          const province = makeProvince(jejuFeature);
          return (
            <g
              key="jeju-inset"
              style={{ cursor: "pointer" }}
              onClick={() => onSelectProvince(province)}
              onMouseEnter={() => setHoveredId("jeju-inset")}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* 인셋 박스 */}
              <rect
                x={x} y={y} width={w} height={h}
                fill="#EFF6FF" stroke="#CBD5E1" strokeWidth="1"
                strokeDasharray="4,2" rx="5"
              />
              {/* 제주도 라벨 */}
              <text
                x={x + w / 2} y={y + 11}
                textAnchor="middle" fontSize="8" fontWeight="bold"
                fill={isVisited ? "#FB7185" : "#94A3B8"}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                제주도
              </text>
              {/* 제주도 지형 */}
              <g transform={`translate(${x + 5}, ${y + 16})`}>
                {jejuPath && (
                  <path
                    d={jejuPath}
                    fill={isVisited ? "#FB7185" : isHovered ? meta.color : "#FFFFFF"}
                    stroke={isHovered ? meta.stroke : "#CBD5E1"}
                    strokeWidth="1"
                    strokeLinejoin="round"
                  />
                )}
              </g>
            </g>
          );
        })()}

        {/* ── 울릉도/독도 인셋 (오른쪽) ── */}
        {(() => {
          const { x, y, w, h } = ISLAND_INSET;
          return (
            <g key="island-inset">
              <rect
                x={x} y={y} width={w} height={h}
                fill="#EFF6FF" stroke="#CBD5E1" strokeWidth="1"
                strokeDasharray="4,2" rx="5"
              />
              <text
                x={x + w / 2} y={y + 12}
                textAnchor="middle" fontSize="7" fontWeight="bold" fill="#94A3B8"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                동해
              </text>

              {/* 울릉도 */}
              <g
                style={{ cursor: "pointer" }}
                onClick={() => onSelectIsland?.("ulleung", "울릉도")}
                onMouseEnter={() => setHoveredIsland("ulleung")}
                onMouseLeave={() => setHoveredIsland(null)}
              >
                <circle
                  cx={x + w / 2} cy={y + 52} r="18"
                  fill={hoveredIsland === "ulleung" ? "#FDE68A" : "#FFFFFF"}
                  stroke={hoveredIsland === "ulleung" ? "#D97706" : "#CBD5E1"}
                  strokeWidth="1"
                  style={{ transition: "fill 0.15s ease" }}
                />
                <text
                  x={x + w / 2} y={y + 56}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="8" fontWeight="bold"
                  fill={hoveredIsland === "ulleung" ? "#92400E" : "#94A3B8"}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  울릉도
                </text>
              </g>

              {/* 독도 */}
              <g
                style={{ cursor: "pointer" }}
                onClick={() => onSelectIsland?.("dokdo", "독도")}
                onMouseEnter={() => setHoveredIsland("dokdo")}
                onMouseLeave={() => setHoveredIsland(null)}
              >
                <circle
                  cx={x + w / 2} cy={y + 100} r="14"
                  fill={hoveredIsland === "dokdo" ? "#FDE68A" : "#FFFFFF"}
                  stroke={hoveredIsland === "dokdo" ? "#D97706" : "#CBD5E1"}
                  strokeWidth="1"
                  style={{ transition: "fill 0.15s ease" }}
                />
                <text
                  x={x + w / 2} y={y + 104}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="8" fontWeight="bold"
                  fill={hoveredIsland === "dokdo" ? "#92400E" : "#94A3B8"}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  독도
                </text>
              </g>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}