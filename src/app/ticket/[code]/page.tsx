"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import QRCode from "qrcode";
import {
  Calendar,
  Clock,
  MapPin,
  Share2,
  Download,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
} from "lucide-react";

export default function TicketPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const ticket = useQuery(api.registrations.getTicket, { code });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      QRCode.toDataURL(code.toUpperCase(), {
        width: 320,
        margin: 1,
        color: {
          dark: "#064E2B",
          light: "#FFFFFF",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("QR generation error:", err));
    }
  }, [code]);

  const handleDownloadIcs = () => {
    if (!ticket) return;

    // The event start is confirmed; do not invent an end time.
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TEIN-UCC//Women Empowerment Summit//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:wes-2026-ticket-" + code + "@tein-ucc",
      `DTSTAMP:${stamp}`,
      "DTSTART:20261107T090000Z",
      "SUMMARY:Women Empowerment Summit 2026 - TEIN-UCC",
      "DESCRIPTION:Theme: Empowered Women, Transformed Futures. Your Ticket Code: " +
        code,
      "LOCATION:SGS Auditorium, University of Cape Coast, Ghana",
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ticket-${code}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `I've registered for the TEIN-UCC Women Empowerment Summit! Saturday 7 November at 9:00 AM, SGS Auditorium, UCC. Join me: ${window.location.origin}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  if (ticket === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0A8F3F] mx-auto" />
          <p className="text-sm text-slate-600 font-medium">
            Fetching ticket information...
          </p>
        </div>
      </div>
    );
  }

  if (ticket === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Ticket Not Found</h2>
          <p className="text-sm text-slate-600">
            We couldn&apos;t find any registration with code{" "}
            <strong className="text-slate-900 font-mono">{code}</strong>.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/find-ticket"
              className="bg-[#0A8F3F] hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition"
            >
              Find Ticket by Phone
            </Link>
            <Link
              href="/register"
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-4 rounded-xl text-sm transition"
            >
              Register for Event
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isWaitlisted = ticket.status === "waitlisted";
  const isCancelled = ticket.status === "cancelled";

  return (
    <div className="ticket-page min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-md mx-auto space-y-4">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full">
            TEIN-UCC · Women Empowerment Summit
          </span>
        </div>

        {/* Screenshot Recommendation Banner */}
        <div className="bg-amber-500/15 border border-amber-500/30 p-3.5 rounded-xl flex items-center gap-3 text-amber-900 shadow-xs">
          <Camera className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-xs font-medium leading-tight">
            <strong>Save your ticket:</strong> Keep a screenshot on your phone in
            case mobile data is unavailable at the venue.
          </p>
        </div>

        {/* Ticket Container / Pass */}
        <div className="ticket-pass bg-white border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="ticket-pass-header text-white p-6 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-green-200 bg-black/25 px-2.5 py-1 rounded-full">
                SUMMIT TICKET
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  isWaitlisted
                    ? "bg-amber-400 text-amber-950"
                    : isCancelled
                    ? "bg-red-400 text-red-950"
                    : "bg-white text-[#0A8F3F]"
                }`}
              >
                {isWaitlisted
                  ? "Waitlisted"
                  : isCancelled
                  ? "Cancelled"
                  : "Registered"}
              </span>
            </div>

            <div className="text-xs text-emerald-200 uppercase tracking-widest font-semibold">
              TEIN-UCC Presents
            </div>
            <h1 className="text-2xl font-black text-white leading-tight">
              Women Empowerment Summit &apos;26
            </h1>
            <p className="text-xs text-emerald-100/90 mt-1 line-clamp-1 italic">
              Empowered Women, Transformed Futures
            </p>
          </div>

          {/* Ticket Details Body */}
          <div className="p-6 space-y-6">
            {/* Show only the attendee name and ticket code on the public pass. */}
            <div className="text-center pb-4 border-b border-dashed border-slate-200">
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Attendee
              </div>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                {ticket.fullName}
              </div>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={`QR Code for ${ticket.ticketCode}`}
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-lg shadow-sm"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0A8F3F]" />
                </div>
              )}

              <div className="mt-3 text-center">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  Ticket Code
                </div>
                <div className="text-xl font-mono font-black text-slate-900 tracking-wider">
                  {ticket.ticketCode}
                </div>
              </div>

              {ticket.checkedInAt && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-bold">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Checked In</span>
                </div>
              )}
            </div>

            {/* Event Time & Venue Info */}
            <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[#0A8F3F] shrink-0" />
                <span className="font-semibold text-slate-900">
                  Saturday, 7 November 2026
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#0A8F3F] shrink-0" />
                  <span>Programme starts at 9:00 AM</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-[#E11D2A] shrink-0" />
                <span className="font-medium">
                  SGS Auditorium, University of Cape Coast
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadIcs}
                className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold py-2.5 px-3 rounded-xl transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Add to Calendar</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-1.5 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] text-xs font-bold py-2.5 px-3 rounded-xl transition cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share with Friends</span>
              </button>
            </div>
          </div>

          {/* Ticket Footer Tear */}
          <div className="ticket-instructions border-t border-dashed p-3 text-center text-xs">
            {isWaitlisted
              ? "This is a waitlist confirmation, not an admission ticket. Please wait for an update from the event team."
              : isCancelled
              ? "This registration has been cancelled and cannot be used for admission. Contact the event team if this is a mistake."
              : "Show this QR code or ticket code at the entrance for check-in."}
          </div>
        </div>

        {/* Help Info */}
        <div className="text-center text-xs text-slate-500 pt-2">
          Questions or issues? Contact President:{" "}
          <strong className="text-slate-700">0248831639</strong>
        </div>
      </div>
    </div>
  );
}

