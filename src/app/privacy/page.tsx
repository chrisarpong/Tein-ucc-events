import Link from "next/link";
import { Shield, ChevronLeft, Lock, FileText, CheckCircle } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Summit Home</span>
        </Link>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-5">
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
              <Shield className="w-3.5 h-3.5 text-[#0A8F3F]" />
              <span>Compliance Notice</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Data Privacy &amp; Protection Policy
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Compliant with the Ghana Data Protection Act, 2012 (Act 843) • Last updated November 2026
            </p>
          </div>

          <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-[#0A8F3F]" />
                1. Data Controller
              </h2>
              <p>
                The <strong>TEIN-UCC Office of the Women&apos;s Commissioner</strong> (University of Cape Coast, Ghana) operates this registration and event management platform for the <strong>Women Empowerment Summit 2026</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-[#0A8F3F]" />
                2. Information We Collect
              </h2>
              <p>
                To organize admission, verify tickets, and manage event logistics, we collect:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2 text-xs text-slate-600">
                <li>Full Name</li>
                <li>Mobile Phone Number (for QR ticket link and essential event SMS)</li>
                <li>Category of attendance (Student, Staff, Alumni, Guest)</li>
                <li>Academic Level, Student ID, and Department (students only)</li>
                <li>Special accessibility requirements (if specified)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-[#0A8F3F]" />
                3. Purpose of Processing
              </h2>
              <p>
                Your personal information is used exclusively for:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2 text-xs text-slate-600">
                <li>Generating and delivering your digital QR event admission pass</li>
                <li>Real-time check-in at the SGS Auditorium venue</li>
                <li>Sending critical event updates, venue directions, and post-summit materials</li>
                <li>Internal attendance reporting for TEIN-UCC committee records</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 mb-2">
                4. Confidentiality &amp; Third Parties
              </h2>
              <p>
                We <strong>do not sell, rent, or disclose</strong> your personal details to commercial advertisers or unapproved third parties. SMS communications are securely routed through accredited telecommunications gateways (Arkesel) strictly for event notifications.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-slate-900 mb-2">
                5. Your Rights Under Act 843
              </h2>
              <p>
                Under the Data Protection Act, 2012 (Act 843), you have the right to:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2 text-xs text-slate-600">
                <li>Request access to your personal data held in our registry</li>
                <li>Request rectification or correction of any inaccurate details</li>
                <li>Request the deletion or anonymization of your registration record</li>
                <li>Opt out of SMS communications by contacting our administration</li>
              </ul>
            </section>

            <section className="pt-2 border-t border-slate-100">
              <h2 className="text-base font-bold text-slate-900 mb-2">
                6. Contact for Privacy Inquiries
              </h2>
              <p className="text-xs text-slate-600">
                For questions regarding this policy or to request data removal, please contact:
              </p>
              <div className="mt-2 text-xs font-semibold text-slate-800">
                TEIN-UCC Office of the Women&apos;s Commissioner<br />
                University of Cape Coast, Central Region, Ghana<br />
                Telephone: +233 24 883 1639 / +233 59 761 1305
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

