"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Plus, ArrowRight, MapPin, Camera, CalendarDays, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Photo {
  id: string;
  storage_path: string;
  caption: string;
  url?: string;
}

interface Place {
  id: string;
  name: string;
  order_index: number;
}

interface DateRecord {
  id: string;
  visit_date: string;
  memo: string;
}

interface CityDetailProps {
  cityId: string;
  cityName: string;
  cityEmoji?: string;
  onBack: () => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── 정렬 가능한 사진 아이템 ────────────────────────────
function SortablePhoto({ photo, onDelete }: { photo: Photo; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    touchAction: "none" as const, // 브라우저 스크롤 가로채기 방지
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners} // 사진 전체를 드래그 영역으로 사용
      className={`relative aspect-square rounded-2xl overflow-hidden bg-rose-50 border border-rose-100 shadow-sm cursor-grab active:cursor-grabbing ${isDragging ? "ring-2 ring-rose-300" : ""}`}
    >
      {photo.url ? (
        <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover pointer-events-none" />
      ) : (
        <div className="w-full h-full flex items-center justify-center pointer-events-none">
          <Camera size={24} className="text-rose-200" />
        </div>
      )}
      {/* 삭제 버튼 — 드래그 이벤트 차단 후 삭제 */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(photo.id); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-1 right-1 w-7 h-7 bg-black/40 rounded-lg flex items-center justify-center hover:bg-black/60 transition-colors"
      >
        <X size={13} className="text-white" />
      </button>
    </div>
  );
}

// ── 정렬 가능한 장소 아이템 ────────────────────────────
function SortablePlace({
  place,
  isLast,
  onDelete,
}: {
  place: Place;
  isLast: boolean;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: place.id });
  const style = {
    // scaleX/scaleY 제외하고 translate만 적용 → 찌그러짐 방지
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: "none" as const,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1.5">
      <div
        {...attributes}
        {...listeners}
        className={`flex items-center gap-1 rounded-full pl-3 pr-1 py-1 cursor-grab active:cursor-grabbing select-none transition-colors ${
          isDragging
            ? "bg-rose-200 border border-rose-300 shadow-lg"
            : "bg-rose-50 border border-rose-200"
        }`}
      >
        <span className="text-xs font-medium text-rose-500">{place.name}</span>
        {/* 삭제 버튼 — 드래그 이벤트 차단 */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(place.id); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center hover:bg-rose-300 transition-colors ml-1"
        >
          <X size={9} className="text-rose-600" />
        </button>
      </div>
      {!isLast && <ArrowRight size={12} className="text-rose-300 flex-none" />}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────
export default function CityDetail({ cityId, cityName, cityEmoji, onBack }: CityDetailProps) {
  const supabase = createClient();

  const [dateRecords, setDateRecords] = useState<DateRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [memo, setMemo] = useState("");

  const [uploading, setUploading] = useState(false);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(todayStr());
  const [loadingDates, setLoadingDates] = useState(true);
  const [mounted, setMounted] = useState(false);

  const coupleIdRef = useRef<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // dnd-kit 센서 (마우스 + 터치)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const getCoupleId = async () => {
    if (coupleIdRef.current) return coupleIdRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("couples").select("id")
      .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
      .maybeSingle();
    coupleIdRef.current = data?.id ?? null;
    return coupleIdRef.current;
  };

  useEffect(() => {
    const load = async () => {
      const coupleId = await getCoupleId();
      if (!coupleId) { setLoadingDates(false); return; }
      const { data } = await supabase
        .from("city_records").select("id, visit_date, memo")
        .eq("couple_id", coupleId).eq("city_id", cityId)
        .order("visit_date", { ascending: true });
      const records = (data ?? []) as DateRecord[];
      setDateRecords(records);
      if (records.length > 0) setSelectedDate(records[records.length - 1].visit_date);
      setLoadingDates(false);
    };
    load();
  }, [cityId]);

  useEffect(() => {
    if (!selectedDate) return;
    const record = dateRecords.find((r) => r.visit_date === selectedDate);
    if (!record) return;
    setRecordId(record.id);
    setMemo(record.memo ?? "");
    setPhotos([]);
    setPlaces([]);
    const loadContent = async () => {
      const { data: placesData } = await supabase
        .from("places").select("*").eq("city_record_id", record.id).order("order_index");
      setPlaces(placesData ?? []);
      const { data: photosData } = await supabase
        .from("photos").select("*").eq("city_record_id", record.id).order("created_at");
      if (photosData && photosData.length > 0) {
        const withUrls = await Promise.all(
          photosData.map(async (p) => {
            const { data } = await supabase.storage
              .from("couple-photos").createSignedUrl(p.storage_path, 3600);
            return { ...p, url: data?.signedUrl };
          })
        );
        setPhotos(withUrls);
      }
    };
    loadContent();
  }, [selectedDate, dateRecords]);

  const handleAddDate = async () => {
    const coupleId = await getCoupleId();
    if (!coupleId) return;
    if (dateRecords.some((r) => r.visit_date === pickerDate)) {
      setSelectedDate(pickerDate);
      setShowDatePicker(false);
      return;
    }
    const { data, error } = await supabase
      .from("city_records")
      .insert({ couple_id: coupleId, city_id: cityId, city_name: cityName, visit_date: pickerDate })
      .select("id, visit_date, memo").single();
    if (!error && data) {
      const newRecord = data as DateRecord;
      const sorted = [...dateRecords, newRecord].sort((a, b) => a.visit_date.localeCompare(b.visit_date));
      setDateRecords(sorted);
      setSelectedDate(newRecord.visit_date);
      setRecordId(newRecord.id);
      setMemo("");
      setPhotos([]);
      setPlaces([]);
    }
    setShowDatePicker(false);
  };

  const handleDeleteDate = async (visitDate: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const record = dateRecords.find((r) => r.visit_date === visitDate);
    if (!record) return;
    await supabase.from("city_records").delete().eq("id", record.id);
    const updated = dateRecords.filter((r) => r.visit_date !== visitDate);
    setDateRecords(updated);
    if (selectedDate === visitDate) {
      setSelectedDate(updated.length > 0 ? updated[updated.length - 1].visit_date : null);
      if (updated.length === 0) { setRecordId(null); setPhotos([]); setPlaces([]); setMemo(""); }
    }
  };

  const handleSaveMemo = async () => {
    if (!recordId) return;
    await supabase.from("city_records").update({ memo }).eq("id", recordId);
    setDateRecords((prev) => prev.map((r) => (r.id === recordId ? { ...r, memo } : r)));
  };

  const handleAddPhoto = () => {
    if (!recordId) return;
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      setUploading(true);

      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${recordId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("couple-photos").upload(path, file);
        if (!error) {
          const { data: photoRow } = await supabase
            .from("photos").insert({ city_record_id: recordId, storage_path: path }).select().single();
          if (photoRow) {
            const { data: signed } = await supabase.storage.from("couple-photos").createSignedUrl(path, 3600);
            setPhotos((prev) => [...prev, { ...photoRow, url: signed?.signedUrl }]);
          }
        }
      }
      setUploading(false);
    };
    input.click();
  };

  // 사진 삭제
  const handleDeletePhoto = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;
    await supabase.storage.from("couple-photos").remove([photo.storage_path]);
    await supabase.from("photos").delete().eq("id", photoId);
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  // 사진 순서 변경
  const handlePhotosDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    const newPhotos = arrayMove(photos, oldIndex, newIndex);
    setPhotos(newPhotos);
    // DB에 created_at 기반 순서 저장은 복잡하므로 UI 상태만 유지
  };

  const handleAddPlace = async () => {
    if (!newPlaceName.trim() || !recordId) return;
    const { data } = await supabase
      .from("places")
      .insert({ city_record_id: recordId, name: newPlaceName.trim(), order_index: places.length })
      .select().single();
    if (data) setPlaces((prev) => [...prev, data]);
    setNewPlaceName("");
    setShowAddPlace(false);
  };

  // 장소 삭제
  const handleDeletePlace = async (placeId: string) => {
    await supabase.from("places").delete().eq("id", placeId);
    setPlaces((prev) => prev.filter((p) => p.id !== placeId));
  };

  // 장소 순서 변경
  const handlePlacesDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = places.findIndex((p) => p.id === active.id);
    const newIndex = places.findIndex((p) => p.id === over.id);
    const newPlaces = arrayMove(places, oldIndex, newIndex);
    setPlaces(newPlaces);
    // DB order_index 업데이트
    await Promise.all(
      newPlaces.map((place, idx) =>
        supabase.from("places").update({ order_index: idx }).eq("id", place.id)
      )
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-0 bg-white z-40 overflow-y-auto no-scrollbar"
      style={{ maxWidth: 430, margin: "0 auto" }}
    >
      {/* 헤더 */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-100 z-10">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={onBack}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <ChevronLeft size={18} className="text-gray-600" />
          </motion.button>
          <div className="flex items-center gap-2">
            {cityEmoji && <span className="text-xl">{cityEmoji}</span>}
            <h2 className="text-lg font-bold text-gray-800">{cityName}</h2>
          </div>
        </div>

        {/* 날짜 칩 */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          <motion.button whileTap={{ scale: 0.93 }}
            onClick={() => { setPickerDate(todayStr()); setShowDatePicker(true); }}
            className="flex-none flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-rose-300 text-rose-400 text-xs font-medium hover:bg-rose-50 transition-colors">
            <Plus size={11} />날짜 추가
          </motion.button>

          {loadingDates ? (
            <div className="text-xs text-gray-300 pl-1">불러오는 중...</div>
          ) : (
            dateRecords.map((r) => (
              <div key={r.visit_date}
                className={`flex-none flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  selectedDate === r.visit_date
                    ? "bg-rose-400 border-rose-400 text-white shadow-sm shadow-rose-200"
                    : "bg-white border-gray-200 text-gray-500"
                }`}>
                <button className="flex items-center gap-1.5" onClick={() => setSelectedDate(r.visit_date)}>
                  <CalendarDays size={10} />
                  {formatDate(r.visit_date)}
                </button>
                <button onClick={(e) => handleDeleteDate(r.visit_date, e)}
                  className={`ml-0.5 rounded-full p-0.5 transition-colors ${
                    selectedDate === r.visit_date ? "hover:bg-rose-300" : "hover:bg-gray-100"
                  }`}>
                  <X size={10} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 날짜 없음 */}
      {!loadingDates && dateRecords.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-8">
          <div className="text-5xl">🗓️</div>
          <p className="text-gray-500 font-semibold">아직 기록이 없어요</p>
          <p className="text-gray-400 text-sm">날짜를 추가해 이 곳의 첫 추억을 남겨보세요</p>
          <motion.button whileTap={{ scale: 0.96 }}
            onClick={() => { setPickerDate(todayStr()); setShowDatePicker(true); }}
            className="mt-2 px-6 py-3 rounded-2xl bg-rose-400 text-white text-sm font-semibold shadow-md shadow-rose-200">
            첫 날짜 추가하기
          </motion.button>
        </div>
      )}

      {/* 콘텐츠 */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div key={selectedDate}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

            {/* 사진 — 드래그 순서 변경 + 삭제 */}
            <div className="border-b border-gray-50">
              <div className="px-4 pt-4 pb-1 flex items-center gap-2">
                <Camera size={14} className="text-rose-400" />
                <span className="text-sm font-semibold text-gray-600">사진</span>
                {photos.length > 1 && (
                  <span className="text-[10px] text-gray-300 ml-1">꾹 눌러서 순서 변경</span>
                )}
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePhotosDragEnd}>
                <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-3 gap-2 px-4 py-3">
                    {photos.map((photo) => (
                      <SortablePhoto key={photo.id} photo={photo} onDelete={handleDeletePhoto} />
                    ))}
                    <motion.button whileTap={{ scale: 0.93 }} onClick={handleAddPhoto} disabled={uploading}
                      className="aspect-square rounded-2xl border-2 border-dashed border-rose-200 flex flex-col items-center justify-center gap-1 hover:border-rose-300 hover:bg-rose-50 transition-colors disabled:opacity-50">
                      <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                        <Plus size={16} className="text-rose-400" />
                      </div>
                      <span className="text-[10px] text-rose-300 font-medium">
                        {uploading ? "업로드 중..." : "사진 추가"}
                      </span>
                    </motion.button>
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* 메모 */}
            <div className="px-4 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">📝</span>
                <span className="text-sm font-semibold text-gray-600">기록</span>
              </div>
              <textarea value={memo} onChange={(e) => setMemo(e.target.value)} onBlur={handleSaveMemo}
                placeholder="이 곳에서의 추억을 적어보세요..."
                className="w-full min-h-[100px] text-sm text-gray-600 placeholder-gray-300 resize-none focus:outline-none leading-relaxed" />
            </div>

            {/* 이동경로 — 드래그 순서 변경 + 삭제 */}
            <div className="border-b border-gray-50 px-4 py-3">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={14} className="text-rose-400" />
                <span className="text-sm font-semibold text-gray-600">이동 경로</span>
                {places.length > 1 && (
                  <span className="text-[10px] text-gray-300 ml-1">꾹 눌러서 순서 변경</span>
                )}
              </div>
              {places.length === 0 ? (
                <p className="text-xs text-gray-300 mb-3">아직 등록된 장소가 없어요</p>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePlacesDragEnd}>
                  <SortableContext items={places.map((p) => p.id)} strategy={rectSortingStrategy}>
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {places.map((place, idx) => (
                        <SortablePlace
                          key={place.id}
                          place={place}
                          isLast={idx === places.length - 1}
                          onDelete={handleDeletePlace}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowAddPlace(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-rose-200 text-rose-400 text-xs font-medium hover:bg-rose-50 transition-colors">
                <Plus size={12} />장소 추가하기
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-8" />

      {/* 날짜 피커 모달 */}
      {mounted && createPortal(
        <AnimatePresence>
          {showDatePicker && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-[100]" onClick={() => setShowDatePicker(false)} />
              <div className="fixed inset-0 z-[101] flex items-center justify-center px-5 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="w-full max-w-[390px] bg-white rounded-3xl px-6 py-6 shadow-2xl pointer-events-auto">
                  <h3 className="text-base font-bold text-gray-700 mb-4">날짜 선택</h3>
                  <input type="date" value={pickerDate} max={todayStr()}
                    onChange={(e) => setPickerDate(e.target.value)}
                    className="w-full border-2 border-rose-200 focus:border-rose-400 rounded-xl px-4 py-3 text-gray-700 text-base outline-none mb-6 transition-colors" />
                  <div className="flex gap-3">
                    <button onClick={() => setShowDatePicker(false)}
                      className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-medium text-sm">취소</button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleAddDate}
                      className="flex-1 py-3 rounded-xl bg-rose-400 text-white font-semibold text-sm shadow-md shadow-rose-200">추가</motion.button>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 장소 추가 모달 */}
      {mounted && createPortal(
        <AnimatePresence>
          {showAddPlace && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-[100]" onClick={() => setShowAddPlace(false)} />
              <div className="fixed inset-0 z-[101] flex items-center justify-center px-5 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="w-full max-w-[390px] bg-white rounded-3xl px-6 py-6 shadow-2xl pointer-events-auto">
                  <h3 className="text-base font-bold text-gray-700 mb-4">장소 추가하기</h3>
                  <input autoFocus type="text" value={newPlaceName}
                    onChange={(e) => setNewPlaceName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddPlace()}
                    placeholder="예) 경복궁, 북촌 한옥마을..."
                    className="w-full border-b-2 border-rose-200 focus:border-rose-400 outline-none pb-2 text-gray-700 text-base placeholder-gray-300 mb-6 transition-colors" />
                  <div className="flex gap-3">
                    <button onClick={() => setShowAddPlace(false)}
                      className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-medium text-sm">취소</button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleAddPlace}
                      className="flex-1 py-3 rounded-xl bg-rose-400 text-white font-semibold text-sm shadow-md shadow-rose-200">추가</motion.button>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}