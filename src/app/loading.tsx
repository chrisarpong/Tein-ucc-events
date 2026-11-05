import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
      <Loader2 className="w-8 h-8 animate-spin text-[#0A8F3F]" />
      <span className="text-xs text-slate-500 font-medium mt-2">Loading...</span>
    </div>
  );
}

