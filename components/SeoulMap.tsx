"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export interface SeoulArea {
  id: string;
  name: string;
  vibe: string;
  color: string;
}

const SEOUL_AREAS: SeoulArea[] = [
  // 북서
  { id: "eunpyeong", name: "은평·서대문", vibe: "동네 감성", color: "bg-emerald-100 border-emerald-300 text-emerald-700" },
  { id: "hongdae", name: "홍대·연남", vibe: "힙한 거리", color: "bg-purple-100 border-purple-300 text-purple-700" },
  { id: "sinchon", name: "신촌", vibe: "대학가", color: "bg-blue-100 border-blue-300 text-blue-700" },
  { id: "mapo", name: "마포", vibe: "한강 산책", color: "bg-cyan-100 border-cyan-300 text-cyan-700" },
  // 북중
  { id: "jongno", name: "종로", vibe: "궁궐 & 역사", color: "bg-amber-100 border-amber-300 text-amber-700" },
  { id: "daehakro", name: "대학로", vibe: "뮤지컬 & 공연", color: "bg-pink-100 border-pink-300 text-pink-700" },
  { id: "gwanghwamun", name: "광화문·인사동", vibe: "문화 거리", color: "bg-orange-100 border-orange-300 text-orange-700" },
  { id: "gangbuk", name: "강북·성북", vibe: "북촌 한옥", color: "bg-yellow-100 border-yellow-300 text-yellow-700" },
  { id: "nowon", name: "노원·도봉", vibe: "공원 & 자연", color: "bg-green-100 border-green-300 text-green-700" },
  // 중심
  { id: "myeongdong", name: "명동", vibe: "쇼핑 & 맛집", color: "bg-rose-100 border-rose-300 text-rose-700" },
  { id: "junggu", name: "중구", vibe: "레트로 감성", color: "bg-stone-100 border-stone-300 text-stone-700" },
  { id: "yongsan", name: "용산", vibe: "전자 & 트렌디", color: "bg-indigo-100 border-indigo-300 text-indigo-700" },
  { id: "itaewon", name: "이태원", vibe: "글로벌 & 이국적", color: "bg-violet-100 border-violet-300 text-violet-700" },
  // 동
  { id: "jungnang", name: "중랑·광진", vibe: "뚝섬 유원지", color: "bg-teal-100 border-teal-300 text-teal-700" },
  { id: "dongdaemun", name: "동대문·성동", vibe: "패션 & DDP", color: "bg-fuchsia-100 border-fuchsia-300 text-fuchsia-700" },
  { id: "kondae", name: "건대", vibe: "먹자골목", color: "bg-lime-100 border-lime-300 text-lime-700" },
  { id: "seongsu", name: "성수·합정", vibe: "카페 & 팝업", color: "bg-rose-100 border-rose-400 text-rose-700" },
  // 서남
  { id: "gangseo", name: "강서·양천·김포", vibe: "공항 & 공원", color: "bg-sky-100 border-sky-300 text-sky-700" },
  { id: "dongjak", name: "동작", vibe: "한강 뷰", color: "bg-blue-100 border-blue-400 text-blue-700" },
  { id: "yeongdeungpo", name: "영등포", vibe: "타임스퀘어", color: "bg-purple-100 border-purple-400 text-purple-700" },
  { id: "guro", name: "구로·금천", vibe: "G밸리", color: "bg-gray-100 border-gray-300 text-gray-700" },
  { id: "gwanak", name: "관악", vibe: "대학 & 산", color: "bg-green-100 border-green-400 text-green-700" },
  // 강남
  { id: "seocho", name: "서초", vibe: "고급 주거", color: "bg-amber-100 border-amber-400 text-amber-700" },
  { id: "gangnamstation", name: "강남역", vibe: "트렌디 핫플", color: "bg-pink-100 border-pink-400 text-pink-700" },
  { id: "gangnamgu", name: "강남구", vibe: "명품 & 청담", color: "bg-rose-100 border-rose-500 text-rose-800" },
  { id: "garosu", name: "가로수길", vibe: "디자이너 거리", color: "bg-fuchsia-100 border-fuchsia-400 text-fuchsia-700" },
  // 동남
  { id: "gangdong", name: "강동·하남", vibe: "자연 & 마켓", color: "bg-emerald-100 border-emerald-400 text-emerald-700" },
  { id: "songpa", name: "송파", vibe: "롯데 & 잠실", color: "bg-orange-100 border-orange-400 text-orange-700" },
];

interface SeoulMapProps {
  onSelectArea: (area: SeoulArea) => void;
  visitedAreas?: string[];
}

export default function SeoulMap({ onSelectArea, visitedAreas = [] }: SeoulMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="px-4 py-2">
      <p className="text-xs text-gray-400 mb-3 text-center">핫플 위주 서울 지역 선택</p>
      <div className="grid grid-cols-3 gap-2">
        {SEOUL_AREAS.map((area) => {
          const isVisited = visitedAreas.includes(area.id);
          const isHovered = hoveredId === area.id;

          return (
            <motion.button
              key={area.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onHoverStart={() => setHoveredId(area.id)}
              onHoverEnd={() => setHoveredId(null)}
              onClick={() => onSelectArea(area)}
              className={`relative rounded-xl border-2 p-2 text-left transition-all ${
                isVisited
                  ? "bg-rose-400 border-rose-400 text-white"
                  : area.color
              } ${isHovered ? "shadow-md" : ""}`}
            >
              <p className={`text-[11px] font-bold leading-tight ${isVisited ? "text-white" : ""}`}>
                {area.name}
              </p>
              <p className={`text-[9px] mt-0.5 leading-tight ${isVisited ? "text-rose-100" : "opacity-70"}`}>
                {area.vibe}
              </p>
              {isVisited && (
                <span className="absolute top-1 right-1 text-[10px]">✓</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
