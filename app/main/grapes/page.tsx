"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { createPortal } from "react-dom";
import { Minus, Plus } from "lucide-react";
import { buildMessage, type PushMessage } from "@/lib/pushMessages";

const SMALL_PER_LARGE = 25;
const COUPON_UNIT = 100000;

interface GrapeRequest {
  id: string;
  requester_id: string;
  target_user_id: string | null;
  status: string;
}

interface Coupon {
  id: string;
  grape_count: number;
  issued_at: string;
  used: boolean;
  used_at: string | null;
  used_place: string | null;
  used_amount: number | null;
}

// ── 포도송이 SVG ───────────────────────────────────────
// 1+2+3+4+5+4+3+2+1 = 25개, 아래→위 순서로 채움
// 아래쪽(인덱스 0~5): 작은 포도알, 중간(6~14): 중간 포도알, 위(15~24): 큰 포도알
const BUNCH_ROWS = [
  { count: 1, r: 9  },  // 맨 아래 (인덱스 0)
  { count: 2, r: 9  },  // 1-2
  { count: 3, r: 10 },  // 3-5
  { count: 4, r: 11 },  // 6-9
  { count: 5, r: 12 },  // 10-14 (가장 넓은 줄)
  { count: 4, r: 14 },  // 15-18
  { count: 3, r: 16 },  // 19-21
  { count: 2, r: 18 },  // 22-23
  { count: 1, r: 20 },  // 24 (맨 위, 줄기 옆)
];

// 아래→위 순서로 전체 위치 계산
function buildBunchPositions() {
  const GAP = 4;
  const SVG_W = 220;
  const positions: { x: number; y: number; r: number }[] = [];

  // 위에서부터 높이 누적 (rows[8]이 맨 위)
  let rowPositions: { x: number; y: number; r: number }[][] = [];
  let totalH = 40; // 줄기 공간

  // 위→아래로 행 배치
  for (let rowIdx = BUNCH_ROWS.length - 1; rowIdx >= 0; rowIdx--) {
    const { count, r } = BUNCH_ROWS[rowIdx];
    const rowW = count * (r * 2) + (count - 1) * GAP;
    const startX = SVG_W / 2 - rowW / 2 + r;
    const y = totalH + r;
    const row = [];
    for (let i = 0; i < count; i++) {
      row.push({ x: startX + i * (r * 2 + GAP), y, r });
    }
    rowPositions.push(row);
    totalH += r * 2 + GAP;
  }

  // 맨 위 행(마지막으로 추가된 = 큰 포도알)부터 flatten → 인덱스 24가 맨 위
  // 채우기 순서: 아래(작은)부터 위(큰)로 → rowPositions를 뒤집어 flatten
  rowPositions.reverse(); // 이제 [0]=맨아래, [8]=맨위
  rowPositions.forEach((row) => row.forEach((p) => positions.push(p)));

  return { positions, svgH: totalH + 10 };
}

const { positions: BUNCH_POSITIONS, svgH: BUNCH_SVG_H } = buildBunchPositions();
const BUNCH_SVG_W = 220;

// 포도알 색상 (크기별)
function grapeColor(r: number): { fill: string; stroke: string; highlight: string } {
  if (r <= 10) return { fill: "url(#smGrad)",   stroke: "#8B5CF6", highlight: "rgba(255,255,255,0.5)" };
  if (r <= 13) return { fill: "url(#mdGrad)",   stroke: "#7C3AED", highlight: "rgba(255,255,255,0.45)" };
  return            { fill: "url(#lgGrad)",   stroke: "#5B21B6", highlight: "rgba(255,255,255,0.4)" };
}

function GrapeBunch({ filled }: { filled: number }) {
  return (
    <svg
      width={BUNCH_SVG_W}
      height={BUNCH_SVG_H}
      viewBox={`0 0 ${BUNCH_SVG_W} ${BUNCH_SVG_H}`}
      className="drop-shadow-md"
    >
      <defs>
        <radialGradient id="smGrad" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </radialGradient>
        <radialGradient id="mdGrad" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </radialGradient>
        <radialGradient id="lgGrad" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#4C1D95" />
        </radialGradient>
      </defs>

      {/* 줄기 */}
      <line x1={BUNCH_SVG_W / 2} y1={0} x2={BUNCH_SVG_W / 2} y2={30}
        stroke="#7C3AED" strokeWidth={3} strokeLinecap="round" />
      <line x1={BUNCH_SVG_W / 2} y1={12} x2={BUNCH_SVG_W / 2 - 20} y2={24}
        stroke="#7C3AED" strokeWidth={2} strokeLinecap="round" />
      <line x1={BUNCH_SVG_W / 2} y1={12} x2={BUNCH_SVG_W / 2 + 20} y2={24}
        stroke="#7C3AED" strokeWidth={2} strokeLinecap="round" />

      {/* 잎 */}
      <ellipse cx={BUNCH_SVG_W / 2 - 28} cy={20} rx={16} ry={9}
        fill="#86EFAC" opacity={0.9}
        transform={`rotate(-30,${BUNCH_SVG_W / 2 - 28},20)`} />
      <ellipse cx={BUNCH_SVG_W / 2 + 28} cy={20} rx={16} ry={9}
        fill="#86EFAC" opacity={0.9}
        transform={`rotate(30,${BUNCH_SVG_W / 2 + 28},20)`} />

      {/* 포도알 (빈 것 먼저, 채워진 것 위에) */}
      {BUNCH_POSITIONS.map((p, i) => {
        const isFilled = i < filled;
        const { fill, stroke, highlight } = grapeColor(p.r);
        return (
          <g key={i}>
            {/* 그림자 */}
            {isFilled && (
              <circle cx={p.x + 1} cy={p.y + 1} r={p.r}
                fill="rgba(109,40,217,0.18)" />
            )}
            {/* 포도알 */}
            <circle
              cx={p.x} cy={p.y} r={p.r}
              fill={isFilled ? fill : "#EDE9FE"}
              stroke={isFilled ? stroke : "#DDD6FE"}
              strokeWidth={isFilled ? 1.2 : 0.8}
            />
            {/* 광택 */}
            {isFilled && (
              <circle
                cx={p.x - p.r * 0.3} cy={p.y - p.r * 0.3}
                r={p.r * 0.3}
                fill={highlight}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────
export default function Screen2Page() {
  const supabase = createClient();

  const [smallCount, setSmallCount]       = useState(0);
  const [largeExchanged, setLargeExchanged] = useState(0);
  const [coupons, setCoupons]             = useState<Coupon[]>([]);
  const [coupleId, setCoupleId]           = useState<string | null>(null);
  const [grapeId, setGrapeId]             = useState<string | null>(null);

  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [exchangeCount, setExchangeCount]         = useState(1);
  const [showUseModal, setShowUseModal]           = useState(false);
  const [selectedCoupon, setSelectedCoupon]       = useState<Coupon | null>(null);
  const [usePlace, setUsePlace]                   = useState("");
  const [useAmount, setUseAmount]                 = useState("");

  const [pendingRequest, setPendingRequest] = useState<GrapeRequest | null>(null); // 현재 pending 요청
  const [myUserId, setMyUserId]             = useState<string | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<GrapeRequest | null>(null); // 상대방 요청

  const [partnerUserId, setPartnerUserId] = useState<string | null>(null);
  const [partnerName, setPartnerName]     = useState<string>("");
  const [myName, setMyName]               = useState<string>("");

  const [adding, setAdding]         = useState(false);
  const [approving, setApproving]   = useState(false);
  const [exchanging, setExchanging] = useState(false);
  const [using, setUsing]           = useState(false);
  const [mounted, setMounted]       = useState(false);
  // 연타 방지: state 는 다음 렌더 전까지 갱신되지 않으므로 ref 로 동기 잠금
  const requestLockRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  const loadPendingRequest = useCallback(async (cid: string, uid: string) => {
    const { data } = await supabase
      .from("grape_requests")
      .select("id, requester_id, status")
      .eq("couple_id", cid)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      if (data.requester_id === uid) setPendingRequest(data as GrapeRequest);
      else setIncomingRequest(data as GrapeRequest);
    } else {
      setPendingRequest(null);
      setIncomingRequest(null);
    }
  }, [supabase]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyUserId(user.id);

      const { data: couple } = await supabase
        .from("couples")
        .select("id, creator_id, partner_id, creator_name, partner_name")
        .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
        .maybeSingle();
      if (!couple) return;
      setCoupleId(couple.id);

      const isCreator = couple.creator_id === user.id;
      const pid = isCreator ? couple.partner_id : couple.creator_id;
      const pname = isCreator ? (couple.partner_name ?? "") : (couple.creator_name ?? "");
      const mname = isCreator ? (couple.creator_name ?? "") : (couple.partner_name ?? "");
      setPartnerUserId(pid ?? null);
      setPartnerName(pname);
      setMyName(mname);

      // 내 판만 upsert (couple_id + user_id)
      await supabase.from("grapes")
        .upsert(
          { couple_id: couple.id, user_id: user.id },
          { onConflict: "couple_id,user_id", ignoreDuplicates: true }
        );

      const { data: g } = await supabase.from("grapes")
        .select("*")
        .eq("couple_id", couple.id)
        .eq("user_id", user.id)
        .single();
      if (g) {
        setGrapeId(g.id);
        setSmallCount(g.small_count);
        setLargeExchanged(g.large_exchanged ?? 0);
      }

      // 내 쿠폰만
      const { data: couponData } = await supabase.from("coupons")
        .select("id, grape_count, issued_at, used, used_at, used_place, used_amount")
        .eq("couple_id", couple.id)
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });
      setCoupons((couponData ?? []) as Coupon[]);

      await loadPendingRequest(couple.id, user.id);

      // .on() 등록 후 마지막에 .subscribe() — 순서 중요
      channel = supabase.channel(`grape_requests_${couple.id}_${Date.now()}`);
      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "grape_requests", filter: `couple_id=eq.${couple.id}` },
          async () => {
            const { data: fresh } = await supabase.from("grapes")
              .select("small_count, large_exchanged")
              .eq("couple_id", couple.id)
              .eq("user_id", user.id)
              .single();
            if (fresh) {
              setSmallCount(fresh.small_count);
              setLargeExchanged(fresh.large_exchanged ?? 0);
            }
            await loadPendingRequest(couple.id, user.id);
          }
        )
        .subscribe();
    };
    load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // 파생 상태
  const progress      = smallCount % SMALL_PER_LARGE; // 0~24
  const largeEarned   = Math.floor(smallCount / SMALL_PER_LARGE);
  const largeOnHand   = largeEarned - largeExchanged;
  const smallOnHand   = progress % 5;
  const mediumOnHand  = Math.floor(progress / 5);

  const sendPush = (userId: string, message: PushMessage) => {
    fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...message }),
    });
  };

  // 포도알 추가 요청 — 내 판에 추가 요청, 상대방 승인 필요
  const handleRequestGrape = async () => {
    if (!coupleId || !myUserId || requestLockRef.current || pendingRequest) return;
    requestLockRef.current = true;
    setAdding(true);

    const { data, error } = await supabase.from("grape_requests")
      .insert({
        couple_id: coupleId,
        requester_id: myUserId,
        target_user_id: myUserId, // 내 판에 추가
        status: "pending",
      })
      .select("id, requester_id, target_user_id, status")
      .single();

    if (data) {
      setPendingRequest(data as GrapeRequest);
      if (partnerUserId && partnerName) {
        sendPush(partnerUserId, buildMessage("grape_request", myName || "파트너"));
      }
    } else if (error?.code === "23505") {
      // 이미 대기 중인 요청이 있음 (DB unique index) — 알림 없이 상태만 동기화
      await loadPendingRequest(coupleId, myUserId);
    }

    setAdding(false);
    requestLockRef.current = false;
  };

  // 승인 — 상태 변경과 small_count +1 을 DB 함수에서 원자적으로 처리 (중복 승인 시 false)
  const handleApprove = async () => {
    if (!incomingRequest || !coupleId || approving) return;
    setApproving(true);

    const { data: approved } = await supabase.rpc("approve_grape_request", {
      p_request_id: incomingRequest.id,
    });

    if (approved === true) {
      const targetId = incomingRequest.target_user_id ?? incomingRequest.requester_id;
      // 승인된 대상이 나 자신이면 로컬 상태도 업데이트
      if (targetId === myUserId) setSmallCount((n) => n + 1);

      sendPush(incomingRequest.requester_id, buildMessage("grape_approved", myName || "파트너"));
    }

    setIncomingRequest(null);
    setApproving(false);
  };

  // 거절
  const handleReject = async () => {
    if (!incomingRequest) return;
    await supabase.from("grape_requests")
      .update({ status: "rejected" }).eq("id", incomingRequest.id);

    sendPush(incomingRequest.requester_id, buildMessage("grape_rejected", myName || "파트너"));

    setIncomingRequest(null);
  };

  const handleExchange = async () => {
    if (!coupleId || !grapeId || exchanging) return;
    setExchanging(true);
    const newExchanged = largeExchanged + exchangeCount;
    await supabase.from("grapes")
      .update({ large_exchanged: newExchanged, updated_at: new Date().toISOString() })
      .eq("id", grapeId);
    const { data: newCoupon } = await supabase.from("coupons")
      .insert({ couple_id: coupleId, user_id: myUserId, grape_count: exchangeCount })
      .select("id, grape_count, issued_at, used, used_at, used_place, used_amount")
      .single();
    if (newCoupon) setCoupons((prev) => [newCoupon as Coupon, ...prev]);
    setLargeExchanged(newExchanged);
    setExchanging(false);
    setShowExchangeModal(false);
  };

  const handleUseCoupon = async () => {
    if (!selectedCoupon || using) return;
    setUsing(true);
    const now = new Date().toISOString();
    const amount = useAmount ? parseInt(useAmount.replace(/,/g, "")) : null;
    await supabase.from("coupons").update({
      used: true, used_at: now,
      used_place: usePlace || null, used_amount: amount,
    }).eq("id", selectedCoupon.id);
    setCoupons((prev) => prev.map((c) =>
      c.id === selectedCoupon.id
        ? { ...c, used: true, used_at: now, used_place: usePlace || null, used_amount: amount }
        : c
    ));
    setUsing(false);
    setShowUseModal(false);
  };

  const unusedCoupons = coupons.filter((c) => !c.used);
  const usedCoupons   = coupons.filter((c) => c.used);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-purple-50/60 to-white px-5 pt-14 pb-24">
      {/* 헤더 */}
      <div className="mb-6">
        <p className="text-xs text-purple-300 font-medium tracking-widest uppercase mb-1">Our Grapes</p>
        <h1 className="text-2xl font-bold text-gray-800">포도송이 🍇</h1>
        <p className="text-xs text-gray-400 mt-1">함께 포도알을 모아요 · 25개 = 큰 포도알 1개</p>
      </div>

      {/* ── 포도송이 시각화 ── */}
      <div className="flex flex-col items-center mb-2">
        <motion.div
          key={progress}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 0.3 }}
        >
          <GrapeBunch filled={progress} />
        </motion.div>

        {/* 진행 정보 */}
        <div className="flex gap-5 mt-3 text-center">
          <div>
            <p className="text-[10px] text-gray-400">작은 포도알</p>
            <p className="text-sm font-bold text-violet-400">{smallOnHand} / 5</p>
          </div>
          <div className="w-px bg-purple-100" />
          <div>
            <p className="text-[10px] text-gray-400">중간 포도알</p>
            <p className="text-sm font-bold text-violet-500">{mediumOnHand} / 5</p>
          </div>
          <div className="w-px bg-purple-100" />
          <div>
            <p className="text-[10px] text-gray-400">진행</p>
            <p className="text-sm font-bold text-violet-600">{progress} / 25</p>
          </div>
        </div>
      </div>

      {/* 큰 포도알 보유 현황 */}
      {largeOnHand > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🍇</span>
            <div>
              <p className="text-xs font-bold text-violet-700">큰 포도알 {largeOnHand}개 보유</p>
              <p className="text-[10px] text-violet-400">
                최대 {(largeOnHand * COUPON_UNIT).toLocaleString()}원 쿠폰 교환 가능
              </p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { setExchangeCount(1); setShowExchangeModal(true); }}
            className="px-3 py-2 bg-violet-500 text-white text-xs font-bold rounded-xl shadow-sm shadow-violet-200"
          >
            교환하기
          </motion.button>
        </motion.div>
      )}

      {/* 상대방 요청 승인 배너 */}
      <AnimatePresence>
        {incomingRequest && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-violet-500 rounded-2xl px-4 py-3.5 mb-4 flex items-center justify-between shadow-md shadow-violet-200"
          >
            <div>
              <p className="text-white text-sm font-bold">🍇 포도알 추가 요청!</p>
              <p className="text-violet-200 text-xs mt-0.5">상대방이 포도알 추가를 요청했어요</p>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={handleReject}
                className="px-3 py-1.5 bg-white/20 text-white text-xs font-bold rounded-xl"
              >
                거절
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={handleApprove}
                disabled={approving}
                className="px-3 py-1.5 bg-white text-violet-600 text-xs font-bold rounded-xl disabled:opacity-50"
              >
                {approving ? "..." : "승인 ✓"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 포도알 추가 버튼 */}
      {pendingRequest ? (
        <div className="w-full py-4 rounded-2xl bg-purple-100 text-purple-400 font-bold text-base text-center mb-6 border-2 border-dashed border-purple-200">
          ⏳ 상대방 승인 대기 중...
        </div>
      ) : (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleRequestGrape}
          disabled={adding || !!incomingRequest}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-400 to-violet-500 text-white font-bold text-base shadow-lg shadow-purple-200 disabled:opacity-50 mb-6"
        >
          {adding ? "요청 중..." : "🍇 포도알 추가하기"}
        </motion.button>
      )}

      {/* 미사용 쿠폰 */}
      {unusedCoupons.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-gray-700">사용 가능한 쿠폰</span>
            <span className="text-xs text-purple-400 font-semibold bg-purple-50 px-2 py-0.5 rounded-full">
              {unusedCoupons.length}개
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {unusedCoupons.map((coupon) => (
              <div key={coupon.id}
                className="bg-white border border-purple-100 rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎟</span>
                  <div>
                    <p className="text-sm font-bold text-gray-700">
                      {(coupon.grape_count * COUPON_UNIT).toLocaleString()}원 쿠폰
                    </p>
                    <p className="text-[10px] text-purple-400">큰 포도알 {coupon.grape_count}개 교환</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(coupon.issued_at).toLocaleDateString("ko-KR", {
                        year: "numeric", month: "long", day: "numeric",
                      })} 발급
                    </p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedCoupon(coupon);
                    setUsePlace(""); setUseAmount("");
                    setShowUseModal(true);
                  }}
                  className="px-3 py-1.5 bg-purple-400 text-white text-xs font-bold rounded-xl shadow-sm shadow-purple-200"
                >
                  사용하기
                </motion.button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 사용된 쿠폰 */}
      {usedCoupons.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-gray-400">사용한 쿠폰</span>
            <span className="text-xs text-gray-400 font-semibold bg-gray-100 px-2 py-0.5 rounded-full">
              {usedCoupons.length}개
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {usedCoupons.map((coupon) => (
              <div key={coupon.id}
                className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl opacity-40">🎟</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-gray-400 line-through">
                        {(coupon.grape_count * COUPON_UNIT).toLocaleString()}원 쿠폰
                      </p>
                      <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">사용됨</span>
                    </div>
                    {coupon.used_place && (
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        📍 {coupon.used_place}
                        {coupon.used_amount && (
                          <span className="ml-1.5 font-semibold">
                            · {coupon.used_amount.toLocaleString()}원
                          </span>
                        )}
                      </p>
                    )}
                    {coupon.used_at && (
                      <p className="text-[10px] text-gray-400">
                        {new Date(coupon.used_at).toLocaleDateString("ko-KR", {
                          year: "numeric", month: "long", day: "numeric",
                        })} 사용
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 교환 모달 ── */}
      {mounted && createPortal(
        <AnimatePresence>
          {showExchangeModal && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-[100]"
                onClick={() => setShowExchangeModal(false)} />
              <div className="fixed inset-0 z-[101] flex items-center justify-center px-5 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="w-full max-w-[360px] bg-white rounded-3xl px-6 py-7 shadow-2xl pointer-events-auto text-center"
                >
                  <p className="text-3xl mb-2">🍇</p>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">쿠폰으로 교환하기</h3>
                  <p className="text-xs text-gray-400 mb-5">
                    보유 큰 포도알 <span className="font-bold text-purple-500">{largeOnHand}개</span>
                  </p>
                  <div className="flex items-center justify-center gap-5 mb-4">
                    <motion.button whileTap={{ scale: 0.9 }}
                      onClick={() => setExchangeCount((n) => Math.max(1, n - 1))}
                      disabled={exchangeCount <= 1}
                      className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center disabled:opacity-30">
                      <Minus size={16} className="text-purple-600" />
                    </motion.button>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-purple-600">{exchangeCount}</p>
                      <p className="text-[10px] text-gray-400">큰 포도알</p>
                    </div>
                    <motion.button whileTap={{ scale: 0.9 }}
                      onClick={() => setExchangeCount((n) => Math.min(largeOnHand, n + 1))}
                      disabled={exchangeCount >= largeOnHand}
                      className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center disabled:opacity-30">
                      <Plus size={16} className="text-purple-600" />
                    </motion.button>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-2xl py-4 mb-6">
                    <p className="text-xs text-purple-400 mb-1">교환될 쿠폰 금액</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {(exchangeCount * COUPON_UNIT).toLocaleString()}원
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowExchangeModal(false)}
                      className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-medium text-sm">
                      취소
                    </button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleExchange}
                      disabled={exchanging}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-400 to-violet-500 text-white font-bold text-sm shadow-md shadow-purple-200 disabled:opacity-50">
                      {exchanging ? "교환 중..." : "교환하기"}
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── 사용 모달 ── */}
      {mounted && createPortal(
        <AnimatePresence>
          {showUseModal && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-[100]"
                onClick={() => setShowUseModal(false)} />
              <div className="fixed inset-0 z-[101] flex items-center justify-center px-5 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="w-full max-w-[390px] bg-white rounded-3xl px-6 py-6 shadow-2xl pointer-events-auto"
                >
                  <h3 className="text-base font-bold text-gray-700 mb-0.5">쿠폰 사용하기 🎟</h3>
                  <p className="text-xs text-gray-400 mb-5">어디서 사용했나요?</p>
                  <div className="flex flex-col gap-3 mb-6">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 block">사용처</label>
                      <input type="text" value={usePlace} onChange={(e) => setUsePlace(e.target.value)}
                        placeholder="예) 이자카야 오마카세, 제주 렌트카..."
                        className="w-full border-2 border-purple-100 focus:border-purple-400 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1.5 block">실제 사용 금액 (원)</label>
                      <input type="number" value={useAmount} onChange={(e) => setUseAmount(e.target.value)}
                        placeholder="예) 85000"
                        className="w-full border-2 border-purple-100 focus:border-purple-400 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none transition-colors" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowUseModal(false)}
                      className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-medium text-sm">
                      취소
                    </button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleUseCoupon}
                      disabled={using}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-400 to-violet-500 text-white font-bold text-sm shadow-md shadow-purple-200 disabled:opacity-50">
                      {using ? "처리 중..." : "사용 완료"}
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
