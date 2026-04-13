export const metadata = {
  title: "개인정보처리방침 | 우리의 지도",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-white px-6 py-12 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">개인정보처리방침</h1>
      <p className="text-sm text-gray-400 mb-8">최종 수정일: 2026년 4월 13일</p>

      <section className="mb-8">
        <h2 className="text-base font-bold text-gray-700 mb-3">1. 수집하는 개인정보 항목</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          우리의 지도는 Google 로그인을 통해 아래 정보를 수집합니다.
        </p>
        <ul className="mt-2 text-sm text-gray-500 list-disc list-inside space-y-1">
          <li>이름 (Google 계정 표시 이름)</li>
          <li>이메일 주소</li>
          <li>프로필 사진 URL</li>
        </ul>
        <p className="mt-3 text-sm text-gray-500 leading-relaxed">
          서비스 이용 중 아래 정보를 추가로 저장합니다.
        </p>
        <ul className="mt-2 text-sm text-gray-500 list-disc list-inside space-y-1">
          <li>방문 도시 기록, 메모, 이동 경로</li>
          <li>업로드한 사진</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-bold text-gray-700 mb-3">2. 수집 및 이용 목적</h2>
        <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
          <li>커플 연결 및 계정 식별</li>
          <li>데이트 및 여행 기록 저장·조회</li>
          <li>서비스 개선 및 오류 처리</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-bold text-gray-700 mb-3">3. 보유 및 이용 기간</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          수집된 개인정보는 서비스 이용 기간 동안 보관되며, 회원 탈퇴 또는 삭제 요청 시 즉시 파기합니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-bold text-gray-700 mb-3">4. 제3자 제공</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          수집된 개인정보는 외부에 제공하지 않습니다. 다만 서비스 운영을 위해 아래 업체의 인프라를 사용합니다.
        </p>
        <ul className="mt-2 text-sm text-gray-500 list-disc list-inside space-y-1">
          <li>Supabase Inc. — 데이터베이스 및 파일 저장</li>
          <li>Vercel Inc. — 웹 서비스 호스팅</li>
          <li>Google LLC — 소셜 로그인 인증</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-bold text-gray-700 mb-3">5. 이용자의 권리</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          이용자는 언제든지 본인의 개인정보 조회, 수정, 삭제를 요청할 수 있습니다.
          삭제 요청은 아래 이메일로 문의해 주세요.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-bold text-gray-700 mb-3">6. 문의</h2>
        <p className="text-sm text-gray-500">
          이메일:{" "}
          <a href="mailto:dongju08299@gmail.com" className="text-rose-400 underline">
            dongju08299@gmail.com
          </a>
        </p>
      </section>

      <p className="text-xs text-gray-300 mt-12 text-center">
        © 2026 우리의 지도. All rights reserved.
      </p>
    </div>
  );
}