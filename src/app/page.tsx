import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  ShieldCheck,
  Users,
  Award,
  ChevronRight,
  Ticket,
  Phone,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-20 md:pb-0">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#064E2B] text-white border-b border-[#0A8F3F]/30 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-[#0A8F3F] text-xs border-2 border-[#E11D2A] shadow-sm">
              TEIN
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base leading-tight tracking-wide">
                TEIN-UCC
              </div>
              <div className="text-[10px] text-green-200 tracking-wider uppercase">
                Women&apos;s Commission
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              href="/find-ticket"
              className="text-xs sm:text-sm text-green-100 hover:text-white px-2.5 py-1.5 rounded-lg border border-green-500/30 hover:border-green-400 transition"
            >
              Find Ticket
            </Link>
            <Link
              href="/register"
              className="bg-[#E11D2A] hover:bg-red-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg shadow-md transition flex items-center gap-1.5"
            >
              <span>Register</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#064E2B] via-[#075931] to-[#0A8F3F] text-white pt-8 pb-14 px-4 sm:px-6">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#E11D2A]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Header Tag / Chip */}
          <div className="inline-flex items-center gap-1.5 bg-black/30 border border-green-400/30 px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-medium tracking-wide text-green-200 mb-4 shadow-sm backdrop-blur-sm">
            <span>TEIN-UCC / OFFICE OF THE WOMEN&apos;S COMMISSIONER</span>
          </div>

          <p className="text-xs sm:text-sm text-emerald-200 uppercase tracking-widest font-semibold mb-2">
            SKIDO-ARGON Led Administration Presents
          </p>

          {/* Main Summit Title */}
          <div className="space-y-1 mb-5">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white drop-shadow-sm">
              WOMEN
            </h1>
            <div className="bg-[#E11D2A] text-white py-2 px-4 sm:px-8 inline-block rounded-md shadow-lg transform -rotate-1 mx-auto my-1">
              <span className="text-2xl sm:text-4xl md:text-5xl font-black tracking-widest uppercase">
                EMPOWERMENT
              </span>
            </div>
            <div className="text-3xl sm:text-5xl font-serif italic text-emerald-100 font-medium">
              Summit &apos;26
            </div>
          </div>

          {/* Theme Banner */}
          <div className="bg-black/35 border-l-4 border-[#E11D2A] p-4 rounded-r-xl max-w-2xl mx-auto text-left sm:text-center mb-8 backdrop-blur-sm shadow-md">
            <span className="bg-[#E11D2A] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider inline-block mb-1 sm:mb-2">
              THEME
            </span>
            <p className="text-sm sm:text-base md:text-lg font-medium text-white leading-snug">
              &ldquo;Empowered Women, Transformed Futures: Building Women for Leadership, Economic Independence and National Development&rdquo;
            </p>
          </div>

          {/* Key Event Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto mb-8 text-left">
            <div className="bg-black/25 border border-white/10 rounded-xl p-3.5 flex items-center gap-3 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-green-200 uppercase font-semibold">Date</div>
                <div className="font-bold text-sm text-white">Sat, 7 Nov 2026</div>
              </div>
            </div>

            <div className="bg-black/25 border border-white/10 rounded-xl p-3.5 flex items-center gap-3 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-green-200 uppercase font-semibold">Time</div>
                <div className="font-bold text-sm text-white">9:00 AM Prompt</div>
              </div>
            </div>

            <div className="bg-black/25 border border-white/10 rounded-xl p-3.5 flex items-center gap-3 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-lg bg-[#E11D2A]/20 text-red-300 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-red-200 uppercase font-semibold">Venue</div>
                <div className="font-bold text-sm text-white">SGS Auditorium, UCC</div>
              </div>
            </div>
          </div>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-[#E11D2A] hover:bg-red-700 text-white font-bold text-base sm:text-lg px-8 py-3.5 rounded-xl shadow-xl hover:shadow-2xl transition duration-200 flex items-center justify-center gap-2 transform active:scale-95"
            >
              <Ticket className="w-5 h-5" />
              <span>Get Your Free Ticket Now</span>
            </Link>
            <Link
              href="/find-ticket"
              className="w-full sm:w-auto bg-black/30 hover:bg-black/50 text-white font-medium text-sm px-6 py-3.5 rounded-xl border border-white/20 transition flex items-center justify-center"
            >
              Already Registered? Find Ticket
            </Link>
          </div>
        </div>
      </section>

      {/* Summit Highlights */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="text-xs font-bold text-[#0A8F3F] uppercase tracking-wider mb-1">
            Why You Should Attend
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Inspiring Women for Generational Impact
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Join visionary student leaders, seasoned female professionals, and inspiring alumni for an unforgettable summit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-green-100 text-[#0A8F3F] flex items-center justify-center mb-4">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">
              Leadership &amp; Governance
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Equipping young women with strategic negotiation, public speaking, and political leadership skills.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-[#E11D2A] flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">
              Economic Independence
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Hands-on enterprise building, financial literacy, and funding opportunities for campus entrepreneurs.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">
              Mentorship &amp; Networking
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Connect directly with trailblazing women leaders and expand your network across departments and industries.
            </p>
          </div>
        </div>
      </section>

      {/* Registration Details Notice */}
      <section className="bg-white border-y border-slate-200 py-10 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official Event Registration</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Free Admission • Instant QR Ticket
            </h3>
            <p className="text-sm text-slate-600">
              Registration takes less than 60 seconds. You receive an instant digital QR ticket.
            </p>
          </div>
          <Link
            href="/register"
            className="shrink-0 bg-[#0A8F3F] hover:bg-[#064E2B] text-white font-bold text-sm sm:text-base px-6 py-3 rounded-xl shadow-md transition"
          >
            Register Online Now
          </Link>
        </div>
      </section>

      {/* Organizers & Contact Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-300 text-xs py-10 px-4 border-t border-slate-800">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="font-bold text-white text-base mb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0A8F3F]"></span>
              TEIN-UCC
            </div>
            <p className="text-slate-400 leading-relaxed mb-3">
              Office of the Women&apos;s Commissioner<br />
              SKIDO-ARGON Led Administration<br />
              University of Cape Coast, Ghana
            </p>
            <div className="text-slate-400">Social: <span className="text-white font-medium">@TEINUCC</span></div>
          </div>

          <div>
            <div className="font-bold text-white text-base mb-2">Event Inquiries</div>
            <div className="space-y-2 text-slate-400">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mohammed Salifu Apugang (President): <strong className="text-white">0248831639</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Somuah Oheneba Ama (Wocom): <strong className="text-white">+233 59 761 1305</strong></span>
              </div>
            </div>
          </div>

          <div>
            <div className="font-bold text-white text-base mb-2">Information &amp; Staff</div>
            <div className="flex flex-col space-y-2">
              <Link href="/privacy" className="hover:text-white transition">
                Data Privacy Policy (Act 843)
              </Link>
              <Link href="/find-ticket" className="hover:text-white transition">
                Retrieve Lost Ticket
              </Link>
              <Link href="/sign-in" className="hover:text-white text-slate-400 transition">
                Staff Portal Sign In
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <div>
            &copy; {new Date().getFullYear()} TEIN-UCC. All rights reserved.
          </div>
          <div>
            Powered by TEIN-UCC Events Platform
          </div>
        </div>
      </footer>

      {/* Sticky Mobile Registration Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-2xl flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Sat, 7 Nov 9AM</div>
          <div className="font-bold text-sm text-slate-900">Women Empowerment</div>
        </div>
        <Link
          href="/register"
          className="bg-[#E11D2A] active:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow-md flex items-center gap-1.5"
        >
          <span>Register Now</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
