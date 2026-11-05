import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <article className="privacy-document">
        <Link href="/" className="privacy-back"><ArrowLeft size={17} /> Back to summit</Link>
        <div className="privacy-heading">
          <LockKeyhole aria-hidden="true" />
          <p className="eyebrow">TEIN-UCC · Women&apos;s Commissioner</p>
          <h1>Privacy information</h1>
          <p>What we collect for the Women Empowerment Summit and how the event team uses it.</p>
        </div>

        <section>
          <h2>Who is organising registration?</h2>
          <p>The TEIN-UCC Office of the Women&apos;s Commissioner is organising registration for the Women Empowerment Summit 2026 at the University of Cape Coast. For questions or requests about your registration, contact the event team using the details below.</p>
        </section>

        <section>
          <h2>What information can you provide?</h2>
          <p>The form asks for your name, mobile number and attendee category. Depending on your answers, it may also collect gender, student ID, level, programme, hall or residence, how you heard about the event, accessibility requirements, and your optional choice to receive event SMS.</p>
        </section>

        <section>
          <h2>How is it used?</h2>
          <p>The event team uses registration details to issue and verify tickets, plan admission and accessibility support, and manage attendance. The team may correct or remove a record when you contact them.</p>
        </section>

        <section>
          <h2>Service providers and messages</h2>
          <p>The registration site and database use Vercel and Convex hosting services. Automatic SMS delivery is not currently enabled. If the event team enables SMS later, your phone number and message will be shared with the SMS provider only to deliver the requested event message. You can register without opting into SMS.</p>
        </section>

        <section>
          <h2>How long is information kept?</h2>
          <p>The event team should keep registration information only for event planning, admission and necessary follow-up, then delete or anonymise it when it is no longer needed. There is not yet an automatic deletion schedule in the website; contact the team to ask about your record.</p>
        </section>

        <section>
          <h2>Contact the event team</h2>
          <p>To ask a question, correct your details or request removal of your registration, contact:</p>
          <ul className="privacy-contact-list">
            <li><a href="tel:+233248831639">Mohammed Salifu Apugang · 024 883 1639</a></li>
            <li><a href="tel:+233597611305">Somuah Oheneba Ama · +233 59 761 1305</a></li>
          </ul>
          <p className="privacy-footnote">This page describes the current website behaviour. The event organisers should confirm their data-controller registration, retention period, and final privacy wording before collecting attendee information.</p>
        </section>
      </article>
    </main>
  );
}
