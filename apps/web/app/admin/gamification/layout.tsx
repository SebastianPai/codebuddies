import AdminGamificationNav from "./components/AdminGamificationNav";

export default function AdminGamificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      <AdminGamificationNav />
      {children}
    </div>
  );
}
