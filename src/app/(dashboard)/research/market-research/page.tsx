import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MarketResearchChat } from "@/components/market-research-chat";

export default async function MarketResearchPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="-m-6 h-[calc(100vh-4rem)]">
      <Suspense>
        <MarketResearchChat />
      </Suspense>
    </div>
  );
}
