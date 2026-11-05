"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowDownRight, ArrowRight, CalendarDays, MapPin, Phone } from "lucide-react";
import { api } from "../../convex/_generated/api";

const EVENT_SLUG = "women-empowerment-summit";

export default function HomePage() {
  const event = useQuery(api.events.getPublic, { slug: EVENT_SLUG });
  const registrationOpen = event?.registrationOpen === true;

  return (
    <main className="summit-home min-h-screen pb-24 lg:pb-0">
      <header className="site-header">
        <Link href="/" className="brand-lockup" aria-label="TEIN-UCC Women Empowerment Summit home">
          <span className="brand-mark" aria-hidden="true">TEIN</span>
          <span className="brand-copy"><strong>TEIN-UCC</strong><small>Office of the Women&apos;s Commissioner</small></span>
        </Link>
        <nav className="header-actions" aria-label="Main navigation">
          <Link href="/find-ticket" className="text-link">Find my ticket</Link>
          <Link href={registrationOpen ? "/register" : "#event-details"} className={`button button-small ${registrationOpen ? "button-red" : "button-muted"}`} aria-disabled={!registrationOpen}>
            {registrationOpen ? "Register" : event === undefined ? "Checking registration" : event === null ? "Registration unavailable" : "Registration closed"}
          </Link>
        </nav>
      </header>

      <section className="hero-section" aria-labelledby="event-title">
        <div className="hero-copy">
          <p className="eyebrow">TEIN-UCC <span>/</span> WOMEN&apos;S COMMISSIONER</p>
          <div className="title-stack">
            <p className="edition-label">Presents</p>
            <h1 id="event-title"><span>Women</span><span className="title-accent">Empowerment</span><span className="title-summit">Summit <small>2026</small></span></h1>
          </div>
          <div className="theme-block">
            <span className="theme-rule" aria-hidden="true" />
            <div><p className="eyebrow">This year&apos;s theme</p><p className="theme-copy">Empowered Women, Transformed Futures: Building Women for Leadership, Economic Independence and National Development</p></div>
          </div>
          <div className="hero-actions">
            {registrationOpen ? <Link href="/register" className="button button-red">Get your free ticket <ArrowRight size={18} /></Link> : <p className="registration-note" role="status">{event === undefined ? "Checking registration availability…" : event === null ? "Registration is currently unavailable. Please contact the event team." : "Online registration is currently closed."}</p>}
            <Link href="#event-details" className="quiet-link">Event details <ArrowDownRight size={16} /></Link>
          </div>
        </div>

        <aside className="event-panel" id="event-details" aria-label="Event details">
        <div className="status-line"><span className={`status-dot ${registrationOpen ? "is-open" : ""}`} aria-hidden="true" />{event === undefined ? "Checking registration" : event === null ? "Registration unavailable" : registrationOpen ? "Registration is open" : "Registration is closed"}</div>
          <div className="event-fact"><CalendarDays aria-hidden="true" /><div><span>Date &amp; time</span><strong>Saturday, 7 November 2026</strong><p>9:00 AM</p></div></div>
          <div className="event-fact"><MapPin aria-hidden="true" /><div><span>Venue</span><strong>SGS Auditorium</strong><p>University of Cape Coast</p></div></div>
          <div className="panel-note">Organised by the TEIN-UCC Office of the Women&apos;s Commissioner</div>
        </aside>
      </section>

      <section className="focus-section" aria-labelledby="focus-title">
        <div className="focus-heading"><p className="eyebrow">The conversation</p><h2 id="focus-title">Leadership. Independence. National development.</h2></div>
        <p className="focus-intro">A gathering centred on the ideas in this year&apos;s theme and the role women play in shaping Ghana&apos;s future.</p>
        <div className="focus-words" aria-label="Summit focus areas"><span>Women in leadership</span><span>Economic independence</span><span>National development</span></div>
      </section>

      <section className="registration-strip">
        <div><p className="eyebrow">Women Empowerment Summit · TEIN-UCC</p><h2>Be part of the conversation.</h2><p>Registration is free. A digital ticket is issued after registration.</p></div>
        {registrationOpen ? <Link href="/register" className="button button-green">Register for the summit <ArrowRight size={18} /></Link> : <Link href="/find-ticket" className="button button-outline">Already registered? Find your ticket</Link>}
      </section>

      <footer className="site-footer">
        <div className="footer-organiser"><strong>TEIN-UCC</strong><span>Office of the Women&apos;s Commissioner</span><span>SKIDO-ARGON Led Administration · University of Cape Coast</span></div>
        <div className="footer-contact"><strong>Event enquiries</strong><a href="tel:+233248831639"><Phone size={15} /> Mohammed Salifu Apugang · 024 883 1639</a><a href="tel:+233597611305"><Phone size={15} /> Somuah Oheneba Ama · +233 59 761 1305</a></div>
        <div className="footer-links"><Link href="/privacy">Privacy notice</Link><Link href="/find-ticket">Find my ticket</Link><span>@TEINUCC</span></div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} TEIN-UCC</span><span>Women Empowerment Summit</span></div>
      </footer>

      {registrationOpen && <div className="mobile-register-bar"><div><span>7 November · 9:00 AM</span><strong>Women Empowerment Summit</strong></div><Link href="/register" className="button button-red">Register <ArrowRight size={16} /></Link></div>}
    </main>
  );
}
