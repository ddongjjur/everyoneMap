-- =============================================
-- 우리의 지도 - Supabase Schema
-- 실제 DB(프로젝트 zridfeaxzfbzvwsfpzzd) 상태를 기준으로 동기화한 스냅샷
-- 새 프로젝트 셋업 시 Supabase Dashboard > SQL Editor 에서 실행
-- =============================================

-- 커플 테이블
CREATE TABLE public.couples (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code         VARCHAR(6) UNIQUE NOT NULL,
  creator_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_name VARCHAR(50),
  partner_name VARCHAR(50),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

-- partner_id IS NULL 인 커플은 코드 입력으로 참가하기 위해 누구나 조회 가능
CREATE POLICY "커플 조회" ON public.couples
  FOR SELECT USING (
    auth.uid() = creator_id OR auth.uid() = partner_id OR partner_id IS NULL
  );

CREATE POLICY "커플 생성" ON public.couples
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "파트너 참가" ON public.couples
  FOR UPDATE USING (partner_id IS NULL)
  WITH CHECK (auth.uid() = partner_id);

CREATE POLICY "커플 멤버가 이름 수정" ON public.couples
  FOR UPDATE USING (auth.uid() = creator_id OR auth.uid() = partner_id)
  WITH CHECK (auth.uid() = creator_id OR auth.uid() = partner_id);

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
  CONSTRAINT city_records_couple_id_city_id_date_key UNIQUE(couple_id, city_id, visit_date)
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

-- 포도알 테이블 (커플 내 사용자별 1행)
CREATE TABLE public.grapes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id       UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  small_count     INTEGER DEFAULT 0 NOT NULL,
  large_exchanged INTEGER DEFAULT 0 NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT grapes_couple_id_user_id_key UNIQUE(couple_id, user_id)
);
ALTER TABLE public.grapes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "커플 멤버만 접근" ON public.grapes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.couples WHERE id = couple_id
      AND (creator_id = auth.uid() OR partner_id = auth.uid()))
  );

-- 쿠폰 테이블
CREATE TABLE public.coupons (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id   UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  grape_count INTEGER DEFAULT 1 NOT NULL,
  issued_at   TIMESTAMPTZ DEFAULT NOW(),
  used        BOOLEAN DEFAULT false NOT NULL,
  used_at     TIMESTAMPTZ,
  used_place  VARCHAR(100),
  used_amount INTEGER
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "커플 멤버만 접근" ON public.coupons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.couples WHERE id = couple_id
      AND (creator_id = auth.uid() OR partner_id = auth.uid()))
  );

-- 포도 요청 테이블
CREATE TABLE public.grape_requests (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id      UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  requester_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status         VARCHAR(10) DEFAULT 'pending' NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.grape_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "커플 멤버만 접근" ON public.grape_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.couples WHERE id = couple_id
      AND (creator_id = auth.uid() OR partner_id = auth.uid()))
  );

-- 요청자당 pending 요청은 커플별 1건만 허용 (연타로 인한 중복 요청 방지)
CREATE UNIQUE INDEX grape_requests_one_pending_per_requester
  ON public.grape_requests (couple_id, requester_id)
  WHERE status = 'pending';

-- 포도 요청 승인: 상태 변경과 small_count +1 을 한 트랜잭션에서 처리
-- SECURITY INVOKER 라서 RLS 가 그대로 적용됨. 승인 성공 시 true, 이미 처리됐거나 권한이 없으면 false
CREATE OR REPLACE FUNCTION public.approve_grape_request(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_req public.grape_requests%ROWTYPE;
  v_target UUID;
BEGIN
  UPDATE public.grape_requests gr
     SET status = 'approved'
   WHERE gr.id = p_request_id
     AND gr.status = 'pending'
     AND gr.requester_id <> auth.uid()
     AND EXISTS (
       SELECT 1 FROM public.couples c
       WHERE c.id = gr.couple_id
         AND (c.creator_id = auth.uid() OR c.partner_id = auth.uid())
     )
  RETURNING * INTO v_req;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  v_target := COALESCE(v_req.target_user_id, v_req.requester_id);

  UPDATE public.grapes
     SET small_count = small_count + 1,
         updated_at = NOW()
   WHERE couple_id = v_req.couple_id
     AND user_id = v_target;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'grapes row not found for user %', v_target;
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_grape_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_grape_request(UUID) TO authenticated;

-- 푸시 알림 구독 테이블
CREATE TABLE public.push_subscriptions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE(user_id, endpoint)
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인 구독만 관리" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- Supabase Storage: 사진 버킷
-- Dashboard > Storage > New bucket
-- 버킷명: couple-photos
-- Public: false (RLS로 접근 제어)
-- 업로드 경로 규칙: {city_record_id}/{파일명}
-- =============================================
CREATE POLICY "커플 멤버만 업로드" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'couple-photos'
    AND EXISTS (
      SELECT 1 FROM public.city_records cr
      JOIN public.couples c ON cr.couple_id = c.id
      WHERE cr.id::text = (storage.foldername(name))[1]
        AND (c.creator_id = auth.uid() OR c.partner_id = auth.uid())
    )
  );

CREATE POLICY "커플 멤버만 조회" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'couple-photos'
    AND EXISTS (
      SELECT 1 FROM public.city_records cr
      JOIN public.couples c ON cr.couple_id = c.id
      WHERE cr.id::text = (storage.foldername(name))[1]
        AND (c.creator_id = auth.uid() OR c.partner_id = auth.uid())
    )
  );
