"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ChevronLeft, Ticket, Loader2, CheckCircle2 } from "lucide-react";

export default function FindTicketPage() {
  const requestTicketSms = useMutation(api.registrations.requestTicketSms);
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setIsSubmitting(true);
    try {
      await requestTicketSms({
        slug: "women-empowerment-summit",
        phone: phone.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      // Per R2: always show the neutral message
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-sm border border-slate-200">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-[#0A8F3F] flex items-center justify-center mx-auto">
            <Ticket className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Retrieve Your Summit Ticket
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            Enter the mobile number you used during registration. We will send
            your ticket link directly to your phone.
          </p>
        </div>

        {submitted ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-[#0A8F3F] mx-auto" />
            <p className="text-xs text-emerald-950 font-medium leading-relaxed">
              If this number is registered for the Women Empowerment Summit, we
              have sent your ticket link by SMS.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-block bg-[#0A8F3F] text-white text-xs font-semibold px-4 py-2 rounded-lg"
              >
                Return to Home
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="phone"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Registered Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="024 XXX XXXX or +233..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-[#0A8F3F] focus:ring-2 focus:ring-[#0A8F3F]/20 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !phone.trim()}
              className="w-full bg-[#0A8F3F] hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <span>Send My Ticket Link</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

