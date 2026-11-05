"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ArrowLeft, CheckCircle2, Loader2, MessageCircle, Phone } from "lucide-react";

export default function FindTicketPage() {
  const requestTicketSms = useMutation(api.registrations.requestTicketSms);
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!phone.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await requestTicketSms({ slug: "women-empowerment-summit", phone: phone.trim() });
    } catch {
      // Keep the same recovery response for registered and unknown numbers.
    } finally {
      setSubmitted(true);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="support-page">
      <section className="support-card" aria-labelledby="support-title">
        <Link href="/" className="support-back"><ArrowLeft size={17} /> Back to summit</Link>
        <p className="eyebrow">Ticket support · TEIN-UCC</p>
        <h1 id="support-title">Need help finding your ticket?</h1>
        <p className="support-copy">Enter the phone number you used to register. If it is registered and you opted into SMS, a ticket link will be sent when SMS delivery is available.</p>
        {submitted ? (
          <div className="ticket-request-result" role="status">
            <CheckCircle2 size={20} />
            <p>If this number is registered and opted into SMS, a ticket link will be sent if delivery is available. If you do not receive one, contact the event team.</p>
          </div>
        ) : (
          <form className="ticket-request-form" onSubmit={submitRequest}>
            <label htmlFor="recovery-phone">Registered phone number</label>
            <input id="recovery-phone" type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="024 XXX XXXX or +233 24 XXX XXXX" />
            <button className="button button-green" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={17} className="animate-spin" /> Sending request…</> : "Request ticket link"}
            </button>
          </form>
        )}
        <div className="support-contacts">
          <a href="https://wa.me/233248831639" target="_blank" rel="noreferrer"><MessageCircle size={18} /><span><strong>Message Mohammed</strong><small>TEIN-UCC President · WhatsApp</small></span></a>
          <a href="tel:+233597611305"><Phone size={18} /><span><strong>Call Somuah Oheneba Ama</strong><small>Women&apos;s Commissioner · +233 59 761 1305</small></span></a>
        </div>
        <p className="support-privacy">Only share your registration phone number through these official event contacts.</p>
        <Link href="/register" className="support-register">Need to register instead? <span>Register for the summit</span></Link>
      </section>
    </main>
  );
}
