import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TicketList } from "@/components/ticket-list";

export default async function TicketsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
        <p className="text-sm text-slate-500 mt-1">
          Bugs melden, Features anfragen und Ideen sammeln
        </p>
      </div>
      <TicketList />
    </div>
  );
}
