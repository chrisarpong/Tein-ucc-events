"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Something Went Wrong</h1>
        <p className="text-xs text-slate-600 leading-relaxed">
          An unexpected error occurred while loading this page. Please try again or return to the main summit page.
        </p>
        <div className="pt-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full bg-[#0A8F3F] hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

