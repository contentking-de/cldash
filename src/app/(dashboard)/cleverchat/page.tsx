import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CleverChat } from "@/components/clever-chat";

export default async function CleverChatPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="-m-6 h-[calc(100vh-4rem)]">
      <Suspense>
        <CleverChat currentUserId={session.user.id} />
      </Suspense>
    </div>
  );
}
