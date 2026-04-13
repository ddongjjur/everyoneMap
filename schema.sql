-- =============================================
-- 우리의 지도 - Supabase Schema
-- Supabase Dashboard > SQL Editor 에서 실행
-- =============================================

-- 커플 테이블
CREATE TABLE public.couples (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code        VARCHAR(6) UNIQUE NOT NULL,
  creator_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "자신의 커플만 조회" ON public.couples
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = partner_id);

CREATE POLICY "커플 생성" ON public.couples
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "파트너 참가 (partner_id 업데이트)" ON public.couples
  FOR UPDATE USING (partner_id IS NULL)
  WITH CHECK (auth.uid() = partner_id);

-- 도시 기록 테이블
CREATE TABLE public.city_records (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id   UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  city_id     VARCHAR(200) NOT NULL,
  city_name   VARCHAR(200),
  memo        TEXT DEFAULT '',
  visit_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(couple_id, city_id, visit_date)
);

ALTER TABLE public.city_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "커플 멤버만 도시 기록 접근" ON public.city_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.couples
      WHERE id = couple_id
        AND (creator_id = auth.uid() OR partner_id = auth.uid())
    )
  );

-- 장소(이동경로) 테이블
CREATE TABLE public.places (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city_record_id UUID REFERENCES public.city_records(id) ON DELETE CASCADE NOT NULL,
  name           VARCHAR(200) NOT NULL,
  order_index    INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "커플 멤버만 장소 접근" ON public.places
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.city_records cr
      JOIN public.couples c ON cr.couple_id = c.id
      WHERE cr.id = city_record_id
        AND (c.creator_id = auth.uid() OR c.partner_id = auth.uid())
    )
  );

-- 사진 테이블
CREATE TABLE public.photos (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city_record_id UUID REFERENCES public.city_records(id) ON DELETE CASCADE NOT NULL,
  storage_path   TEXT NOT NULL,
  caption        TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "커플 멤버만 사진 접근" ON public.photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.city_records cr
      JOIN public.couples c ON cr.couple_id = c.id
      WHERE cr.id = city_record_id
        AND (c.creator_id = auth.uid() OR c.partner_id = auth.uid())
    )
  );

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER city_records_updated_at
  BEFORE UPDATE ON public.city_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 포도알 테이블
CREATE TABLE public.grapes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id   UUID REFERENCES public.couples(id) ON DELETE CASCADE UNIQUE NOT NULL,
  small_count INTEGER DEFAULT 0 NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.grapes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "커플 멤버만 접근" ON public.grapes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.couples WHERE id = couple_id
      AND (creator_id = auth.uid() OR partner_id = auth.uid()))
  );

-- 쿠폰 테이블
CREATE TABLE public.coupons (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id  UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  issued_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "커플 멤버만 접근" ON public.coupons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.couples WHERE id = couple_id
      AND (creator_id = auth.uid() OR partner_id = auth.uid()))
  );

-- =============================================
-- Supabase Storage: 사진 버킷 생성
-- Dashboard > Storage > New bucket
-- 버킷명: couple-photos
-- Public: false (RLS로 접근 제어)
-- =============================================
