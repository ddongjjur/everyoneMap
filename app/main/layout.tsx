import Navigation from "@/components/Navigation";
import PushInitializer from "@/components/PushInitializer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-white">
      <PushInitializer />
      <main className="pb-20">{children}</main>
      <Navigation />
    </div>
  );
}
