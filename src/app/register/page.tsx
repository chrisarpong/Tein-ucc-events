"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ShieldCheck,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Ticket,
  Clock,
  MapPin,
  Calendar,
} from "lucide-react";

const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),
  phone: z
    .string()
    .min(9, "Phone number is too short")
    .max(16, "Phone number is too long"),
  gender: z.string().optional(),
  attendeeType: z.enum(["student", "staff", "alumni", "guest"], {
    message: "Please select your attendee category",
  }),
  studentId: z.string().optional(),
  level: z.string().optional(),
  programme: z.string().optional(),
  hall: z.string().optional(),
  howHeard: z.string().optional(),
  specialNeeds: z.string().optional(),
  consentComms: z.boolean(),
  website: z.string().optional(), // Honeypot
});

type RegisterFormData = z.infer<typeof registerSchema>;

const WES_SLUG = "women-empowerment-summit";

export default function RegisterPage() {
  const router = useRouter();
  const event = useQuery(api.events.getPublic, { slug: WES_SLUG });
  const registerMutation = useMutation(api.registrations.register);

  const [serverError, setServerError] = useState<string | null>(null);
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      attendeeType: "student",
      consentComms: false,
      gender: "",
      website: "",
    },
  });

  const selectedAttendeeType = watch("attendeeType");

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    setDuplicateMessage(null);
    setIsSubmitting(true);

    try {
      const res = await registerMutation({
        slug: WES_SLUG,
        fullName: data.fullName,
        phone: data.phone,
        gender: data.gender || undefined,
        attendeeType: data.attendeeType,
        studentId: data.studentId || undefined,
        level: data.level || undefined,
        programme: data.programme || undefined,
        hall: data.hall || undefined,
        howHeard: data.howHeard || undefined,
        specialNeeds: data.specialNeeds || undefined,
        consentComms: data.consentComms,
        honeypot: data.website || undefined,
      });

      if (res.isDuplicate) {
        setDuplicateMessage(
          res.message ||
            "This phone number is already registered for this event."
        );
        setIsSubmitting(false);
        return;
      }

      if (res.ticketCode) {
        router.push(`/ticket/${res.ticketCode}`);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to complete registration";
      setServerError(errorMsg);
      setIsSubmitting(false);
    }
  };

  if (event === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0A8F3F] mx-auto" />
          <p className="text-sm text-slate-600 font-medium">
            Loading summit registration...
          </p>
        </div>
      </div>
    );
  }

  if (event === null || !event.registrationOpen) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Registration Closed
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Online registration for the Women Empowerment Summit is currently
            closed. If you have already registered, you can retrieve your ticket below.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/find-ticket"
              className="w-full bg-[#0A8F3F] hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl transition text-sm"
            >
              Retrieve Existing Ticket
            </Link>
            <Link
              href="/"
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl transition text-sm"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-form-page min-h-screen pb-16">
      {/* Header Bar */}
      <header className="form-header sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-green-100 hover:text-white transition font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <div className="text-center">
            <div className="text-xs uppercase font-bold tracking-wider text-green-300">
              TEIN-UCC Summit
            </div>
          </div>
          <Link
            href="/find-ticket"
            className="text-xs text-green-100 hover:text-white underline underline-offset-2"
          >
            Find Ticket
          </Link>
        </div>
      </header>

      <main className="form-main max-w-3xl mx-auto px-4 pt-6">
        {/* Summit Quick Banner */}
        <div className="form-event-summary mb-6">
          <div className="eyebrow">
            TEIN-UCC · Women&apos;s Commissioner
          </div>
          <h1 className="text-2xl font-black mb-2">
            Women Empowerment Summit &apos;26
          </h1>
          <div className="form-event-facts flex flex-wrap items-center gap-4 text-xs pt-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Sat, 7 Nov 2026</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>9:00 AM Prompt</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>SGS Auditorium, UCC</span>
            </span>
          </div>

          {!event.spotsLeft && (
            <div className="mt-3 bg-amber-500/20 border border-amber-300/40 text-amber-100 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                Registration is full. New registrations will be added to the waitlist.
              </span>
            </div>
          )}
        </div>

        {/* Server & Duplicate alerts */}
        {duplicateMessage && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mb-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  Already Registered
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  {duplicateMessage}
                </p>
                <div className="mt-2">
                  <Link
                    href="/find-ticket"
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 underline hover:text-amber-950"
                  >
                    <span>Retrieve your ticket details here</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {serverError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl mb-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-900">Registration Error</h4>
                <p className="text-xs text-red-800 mt-0.5">{serverError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form Container */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="attendee-form bg-white p-6 sm:p-8 border border-slate-200 space-y-6"
        >
          {/* Honeypot anti-bot field (hidden from genuine users) */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...register("website")}
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              Personal Information
            </h2>

            {/* Full Name */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="e.g. Ama Serwaa Mensah"
                autoComplete="name"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                  errors.fullName
                    ? "border-red-400 bg-red-50/30"
                    : "border-slate-300 focus:border-[#0A8F3F]"
                } focus:outline-none focus:ring-2 focus:ring-[#0A8F3F]/20 transition`}
                {...register("fullName")}
              />
              {errors.fullName && (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label
                htmlFor="phone"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Mobile Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="024 XXX XXXX or +233 XX XXX XXXX"
                autoComplete="tel"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                  errors.phone
                    ? "border-red-400 bg-red-50/30"
                    : "border-slate-300 focus:border-[#0A8F3F]"
                } focus:outline-none focus:ring-2 focus:ring-[#0A8F3F]/20 transition`}
                {...register("phone")}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Accepts Ghanaian formats: 024..., +233..., 233...
              </p>
              {errors.phone && (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label
                htmlFor="gender"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Gender <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                id="gender"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-[#0A8F3F] focus:outline-none focus:ring-2 focus:ring-[#0A8F3F]/20 transition bg-white"
                {...register("gender")}
              >
                <option value="">Select if you wish</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="another">Another identity</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              Academic &amp; Profile Details
            </h2>

            {/* Attendee Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                I am attending as <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["student", "staff", "alumni", "guest"] as const).map(
                  (type) => (
                    <label
                      key={type}
                      className={`flex items-center justify-center p-2.5 rounded-xl border text-xs font-semibold uppercase cursor-pointer transition text-center ${
                        selectedAttendeeType === type
                          ? "bg-emerald-50 border-[#0A8F3F] text-[#0A8F3F] shadow-sm"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        value={type}
                        className="sr-only"
                        {...register("attendeeType")}
                      />
                      <span>{type}</span>
                    </label>
                  )
                )}
              </div>
            </div>

            {/* Student specific fields */}
            {selectedAttendeeType === "student" && (
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="studentId"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Student Index / ID
                    </label>
                    <input
                      id="studentId"
                      type="text"
                      placeholder="e.g. PS/ITC/22/0045"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#0A8F3F] bg-white"
                      {...register("studentId")}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="level"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Level of Study
                    </label>
                    <select
                      id="level"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#0A8F3F] bg-white"
                      {...register("level")}
                    >
                      <option value="">Select Level</option>
                      <option value="100">Level 100</option>
                      <option value="200">Level 200</option>
                      <option value="300">Level 300</option>
                      <option value="400">Level 400</option>
                      <option value="Postgraduate">Postgraduate</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="programme"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Programme / Department
                    </label>
                    <input
                      id="programme"
                      type="text"
                      placeholder="e.g. B.Ed Social Sciences"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#0A8F3F] bg-white"
                      {...register("programme")}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="hall"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Hall of Residence / Hostel
                    </label>
                    <input
                      id="hall"
                      type="text"
                      placeholder="e.g. Casely Hayford / Off-campus"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#0A8F3F] bg-white"
                      {...register("hall")}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Special Needs / Accessibility */}
            <div>
              <label
                htmlFor="howHeard"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                How did you hear about the summit?{" "}
                <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                id="howHeard"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 focus:border-[#0A8F3F] focus:outline-none focus:ring-2 focus:ring-[#0A8F3F]/20 bg-white"
                {...register("howHeard")}
              >
                <option value="">Choose an option</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="social_media">Social media</option>
                <option value="friend_or_family">Friend or family</option>
                <option value="campus_announcement">Campus announcement</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Special Needs / Accessibility */}
            <div>
              <label
                htmlFor="specialNeeds"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Accessibility or Special Needs{" "}
                <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="specialNeeds"
                type="text"
                placeholder="Any special assistance required at the venue"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:border-[#0A8F3F] transition"
                {...register("specialNeeds")}
              />
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="sms-consent pt-2 border-t border-slate-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 rounded text-[#0A8F3F] border-slate-300 focus:ring-[#0A8F3F] focus:ring-offset-0"
                {...register("consentComms")}
              />
              <span className="text-xs text-slate-600 leading-snug">
                I would like to receive event updates by SMS from TEIN-UCC. This is
                optional and I can still register if I leave this unchecked. See our{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-[#0A8F3F] underline font-medium hover:text-emerald-800"
                >
                  Read Privacy Policy
                </Link>
                .
              </span>
            </label>
            {errors.consentComms && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                {errors.consentComms.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#E11D2A] hover:bg-red-700 disabled:bg-red-300 text-white font-bold py-3.5 rounded-xl shadow-lg transition duration-200 flex items-center justify-center gap-2 text-base active:scale-[0.99] cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing Registration...</span>
              </>
            ) : (
              <>
                <Ticket className="w-5 h-5" />
                <span>Complete Registration &amp; Get QR Ticket</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Your details are used to organise summit registration and admission.</span>
          </div>
        </form>
      </main>
    </div>
  );
}

