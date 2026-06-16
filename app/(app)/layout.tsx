import { requireUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen bg-slate-100/70">
      <Sidebar email={user.email} name={user.name} />
      <main className="relative flex-1 overflow-x-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid-fade [background-size:22px_22px] opacity-60" />
        <div className="relative mx-auto max-w-7xl animate-fadeUp p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
