import Navigation from "@/components/Navigation";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-white">
      <main className="pb-20">{children}</main>
      <Navigation />
    </div>
  );
}
