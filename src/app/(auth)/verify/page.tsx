import { Mail } from "lucide-react";
import Link from "next/link";

export default function VerifyPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">clever.legal</h1>
          <p className="text-sm text-slate-500 mt-1">Admin Dashboard</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-8">
          <div className="mx-auto w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-primary-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">E-Mail pruefen</h2>
          <p className="text-sm text-slate-500">
            Wir haben dir einen Login-Link per E-Mail gesendet. Klicke auf den Link in der E-Mail, um dich einzuloggen.
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
