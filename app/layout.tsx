import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "모두의 지도 | EveryoneMap",
  description: "우리만의 데이트 & 여행을 기록하는 지도",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
