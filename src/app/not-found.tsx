import Link from "next/link";
import { AlertCircle, ChevronLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-black text-slate-900">404</h1>
        <h2 className="text-base font-bold text-slate-800">Page Not Found</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          The requested page could not be located. It might have moved or the link is incorrect.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 bg-[#0A8F3F] hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Return to Summit Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

