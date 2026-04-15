import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const token = formData.get("token") as string;
  const email = formData.get("email") as string;
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";

  if (!token || !email) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const authCallback = new URL("/api/auth/callback/resend", request.url);
  authCallback.searchParams.set("token", token);
  authCallback.searchParams.set("email", email);
  authCallback.searchParams.set("callbackUrl", callbackUrl);

  return NextResponse.redirect(authCallback.toString(), 303);
}
