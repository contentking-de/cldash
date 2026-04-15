import Link from "next/link";

export default async function ConfirmLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string; callbackUrl?: string }>;
}) {
  const { token, email, callbackUrl } = await searchParams;

  if (!token || !email) {
    return (
      <div className="flex min-h-full items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">clever.legal</h1>
            <p className="text-sm text-slate-500 mt-1">Admin Dashboard</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-8">
            <p className="text-sm text-red-600">
              Dieser Login-Link ist ungueltig oder abgelaufen. Bitte fordere einen neuen Link an.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-block mt-6 text-sm text-primary-600 hover:text-primary-700 transition"
          >
            Zurueck zum Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">clever.legal</h1>
          <p className="text-sm text-slate-500 mt-1">Admin Dashboard</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-8">
          <div className="mx-auto w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Login bestaetigen</h2>
          <p className="text-sm text-slate-500 mb-6">
            Klicke auf den Button, um dich als <strong className="text-slate-700">{email}</strong> einzuloggen.
          </p>
          <form method="POST" action="/api/auth/confirm-login">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="callbackUrl" value={callbackUrl || "/"} />
            <button
              type="submit"
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
            >
              Jetzt einloggen
            </button>
          </form>
        </div>

        <Link
          href="/login"
          className="inline-block mt-6 text-sm text-primary-600 hover:text-primary-700 transition"
        >
          Zurueck zum Login
        </Link>
      </div>
    </div>
  );
}
