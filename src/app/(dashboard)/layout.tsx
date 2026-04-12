import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <div className="pl-60">
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
