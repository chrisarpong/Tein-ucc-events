# PRD v2.3: TEIN-UCC Events (Registration, Check-in & SMS CRM)

> **READ §0 FIRST.** This file is the single source of truth AND the progress tracker. Any AI (builder agent, reviewer chat, a new session after tokens ran out) should be able to understand the whole project from this file alone.

> **v2.1 change (5 Nov 2026):** Clerk is REMOVED. Staff sign-up and sign-in are now built in our own app using **Convex Auth (Password)**, and new staff join with an **invite code**. See D2, D11 to D13, R11, §8 "Staff authentication design", §12 phase **P3A**, and acceptance items A12 to A18.

> **v2.2 change (5 Nov 2026):** AUTONOMOUS MODE. The Builder now runs from the first unchecked box to the very end WITHOUT waiting at gates (v2.3: except the mandatory Gate A pause). Gates are self-reviewed checkpoints. The Builder stops only for a TRUE BLOCKER. See new §0.4, the `[~]` status in §12, the HUMAN QUEUE in §13 and the FINAL REPORT in §14. Local folder is `Women's Empowerment Summit` (spaces and an apostrophe, so quote every path); the npm/GitHub/Convex project name stays `tein-ucc-events`. This file and `START_HERE.md` sit in the ROOT of the project folder (not in `docs/`).

> **v2.3 change (5 Nov 2026):** (1) **Build order fixed:** check-in (P4) now comes BEFORE the CRM (P3), and the CRM is split into Must (P3 Must) and Should (P3S). Dashboard charts, audit page, QR poster and Lighthouse pass are **Should**. (2) **Branch rule (§0.5):** the Builder works on branch `dev` and merges to `main` only at a gate after a green build, because every push to `main` redeploys PRODUCTION. (3) **Gate A is now a MANDATORY PAUSE** (the only normal pause): the Owner tests on a real phone before sharing the link. After Gate A the run is fully autonomous. (4) **Feature freeze (§0.6):** Friday 6 Nov 6:00 PM, bug fixes only. (5) **Auth fallback (D2b, P3A-FB):** if invite-code sign-up cannot be made to work, admins create staff accounts directly with a temporary password shown once. (6) Event-day backups added (§15), owner prep checklist added (§0.7).

---

## 0. HANDOFF HEADER (for any AI reading this)

### 0.1 What this project is
A real web app, going live for a real event in 2 days, that lets the TEIN-UCC (University of Cape Coast, Ghana) community **register** for programmes, get a **QR ticket**, be **checked in** at the door, and lets the organising team run a private **CRM** to see/export attendee data and **send SMS** (confirmation, reminder, thank-you). First event: **Women Empowerment Summit**.

### 0.2 The three actors and their rules
| Actor | Who | Job |
|---|---|---|
| **Owner (human)** | The TEIN-UCC organiser who is building this | Creates accounts (GitHub, Convex, Arkesel, Vercel), pastes prompts and reports between agent and reviewer, makes decisions |
| **Builder agent** | Antigravity IDE agent on a MacBook Pro M4 Pro | Writes all code, runs it, deploys it, ticks checkboxes in this file |
| **Reviewer** | Claude / ChatGPT chat (OPTIONAL in v2.2) | In autonomous mode the Builder self-reviews at every gate (§0.4). The Owner may still paste the FINAL REPORT or any gate REPORT to a Reviewer for a second opinion |

**Builder rules (obey exactly):**
1. Read this whole file before acting. Never contradict §5 (Decisions) without telling the Owner why.
2. Work phase by phase through §12. Start at the **first unchecked box**.
3. The moment an item is *verified* working, change `[ ]` to `[x]` in this file. Never tick an item you did not test.
4. After each phase: run `pnpm typecheck && pnpm lint && pnpm build`, fix failures, append an entry to §13 Session Log, `git commit` (include this file).
5. At every **GATE**: run the self-review (§0.4), print the REPORT block from §14, append it to §13, merge `dev` into `main` only if the build is green (§0.5), and CONTINUE immediately. Do NOT wait for the Owner. **The ONE exception is Gate A, which is a mandatory pause (§0.4 item 1).** Otherwise stop only for a TRUE BLOCKER (§0.4).
6. If you are running low on context/tokens, immediately write a **Handoff note** in §13 (what's done, what's half-done, the exact next command) and commit.
7. Check current official docs (Convex, Convex Auth, Arkesel, Next.js) before using an API; do not rely on memory for exact signatures.
8. Never invent logos, party emblems, or university crests. Use files in `/public/brand/` or a text wordmark.
9. No secrets in git. No fake data in production.
10. Prefer simple, boring solutions. No scope creep: Must-haves first.
11. Follow §0.4 (Autonomous run protocol). Never ask "shall I continue?". Never stop before the FINAL REPORT unless truly blocked, EXCEPT the mandatory Gate A pause.
12. Quote all shell paths (the folder name has spaces and an apostrophe). Use project/package name `tein-ucc-events`, never the folder name.
13. Work on branch `dev`. Never push or merge to `main` outside a gate (§0.5). Obey the feature freeze (§0.6).

**Reviewer rules (for Claude/ChatGPT):** When the Owner pastes a REPORT, reply in this exact shape:
- `VERDICT:` PASS / PASS WITH FIXES / FAIL
- `CHECKED AGAINST:` which PRD sections/acceptance items you verified
- `PROBLEMS:` numbered, most severe first (security and data-loss first)
- `HUMAN ACTIONS:` anything the Owner must do (accounts, keys, tests on a real phone)
- `NEXT MESSAGE TO BUILDER:` a copy-paste block (either "continue to Phase X" or precise fixes)
Be skeptical: ask for evidence (command output, URLs, screenshots) when a claim is untested.

### 0.3 Current status pointer
Look at §12 (checkboxes) and the last entry in §13 (Session Log). The first unchecked box is where work resumes. Box legend: `[ ]` not done, `[x]` built AND tested by the Builder, `[~]` built and tested by the Builder but still needs the Owner to check it on a real device or account (OWNER-VERIFY), `[!]` skipped on purpose (reason in §13).

### 0.4 AUTONOMOUS RUN PROTOCOL (v2.2, overrides any older "wait for the Owner" wording)
**Mode: AUTONOMOUS.** The Owner starts you once and expects you to run to the end. **Clock:** it is Thursday 5 Nov 2026; the event is Saturday 7 Nov, 9:00 AM. Priority order if time is short: public registration LIVE (Gate A) > staff auth (P3A) > check-in (P4) > attendee list + export (P3 Must) > SMS (P5) > Should items (P3S, charts, audit page, QR poster, Lighthouse) > polish. **What Saturday absolutely needs: registration, staff login, check-in, and an attendee list with CSV export.** Drop *Should* items first, never security. The tracker order in §12 follows this priority; do not reorder it.

1. **Gates.** At each gate: (a) run the self-review below, (b) print the REPORT (§14), (c) append it to §13, (d) if the build is green, merge `dev` into `main` (§0.5) and commit, (e) continue to the next phase in the same run. **EXCEPTION, Gate A is a MANDATORY PAUSE:** after printing the Gate A REPORT, the Builder prints the Gate A checklist (below) and STOPS until the Owner replies `GATE A PASSED` (or sends fixes). This is the moment real personal data starts flowing and the link gets shared, so the Owner must test on their own phone first. It is not a blocker; it is a planned stop. After the Owner replies `GATE A PASSED`, run fully autonomously to the end.
   **Gate A checklist the Builder prints for the Owner (about 5 minutes):** (1) open the production URL on your own phone; (2) register with your real number; (3) confirm the ticket page and QR show; (4) refresh and confirm the QR is still there; (5) try registering the same number again in another format (`024…` vs `+233…`) and confirm it is refused; (6) read the privacy page once; (7) reply `GATE A PASSED`.
2. **TRUE BLOCKERS (the only reasons to stop):**
   - you need a login, key, token or payment that only the Owner can provide AND there is nothing else you can build meanwhile;
   - a command fails 3 different ways and no simpler alternative exists;
   - Convex Auth is blocked for more than 30 minutes AND the fallback in D2b / P3A-FB has also failed (try the fallback first; it is not a blocker by itself);
   - continuing would break a §5 decision or a §10 security rule;
   - an action would destroy or overwrite PRODUCTION data.
   When truly blocked: print the REPORT with `Status: BLOCKED` and the exact copy-paste steps, then wait.
3. **NOT blockers (use the default, log it in §13 as an assumption, keep going):** SMS sender ID not approved (use dry-run / default sender), logos missing (text wordmark), open questions in §17 (capacity 500, open to all genders, invite-code sign-up), Owner-verify items.
4. **Human tasks (H):** at the very start print ONE numbered list titled `DO THESE NOW (while I keep building)` with exact steps and copy-paste commands for every H task still open. Then immediately start building whatever does not depend on them. Re-read the HUMAN QUEUE (§13) at the end of every phase and use anything the Owner has supplied since.
5. **Self-review at every gate (you act as the Reviewer):** re-read the acceptance items for that phase; run `pnpm typecheck && pnpm lint && pnpm build` (and `pnpm test` if tests exist); for any security item actually CALL the function signed-out and with the wrong role and paste the real output (never just claim it); list shortcuts you took; fix problems BEFORE moving on.
6. **Owner-verify items** (real phone, real SMS, Owner's own sign-up): do every part you can yourself, mark the box `[~]`, add the exact steps to the HUMAN QUEUE, and keep going (except Gate A, item 1). Never mark `[x]` for something that needs a real device.
7. **Time-boxing:** if a task takes more than 1.5x its budget, take the simplest option that still meets the Must list, log the deviation in §13 and move on.
8. **DONE means:** every box in §12 is `[x]`, `[~]` or `[!]`, `pnpm typecheck && pnpm lint && pnpm build` is clean on the final commit, and production is deployed. THEN, and only then, print the FINAL REPORT (§14) with the Owner-verify checklist and live URLs.
9. **Memory:** after every phase update the checkboxes and §13 and commit. If context is running low, write the Handoff note in §13 and tell the Owner to paste START_HERE.md again; it resumes from the first `[ ]`.
10. **Project folder facts:** if the folder is not yet a git repo, run `git init`. `create-next-app` may refuse the folder name or non-empty folder: scaffold into a temp folder named `tein-ucc-events` and move the files up, never deleting `PRD.md` or `START_HERE.md`.
11. **Should items:** items labelled **(Should)** in §12 are done only after every Must box is `[x]` or `[~]`. If time is short, mark them `[!]` with a one-line reason in §13. Never trade a Must or a security item for a Should.

### 0.5 BRANCH AND DEPLOY RULE (v2.3)
Vercel builds PRODUCTION from `main`, and the production build runs `npx convex deploy`, so every push to `main` can change the live site AND the production database schema while real people are registering. Therefore:
1. Create branch `dev` right after the first commit (`git checkout -b dev`). ALL work and ALL routine commits go to `dev`. Pushing `dev` gives a Vercel preview URL (use it for testing; previews must point at the DEV Convex deployment, never production).
2. Merge `dev` into `main` ONLY at a gate (A, A2, B, C, D) or for an urgent bug fix after the feature freeze, and ONLY after `pnpm typecheck && pnpm lint && pnpm build` is green on `dev`. Use `git checkout main && git merge --no-ff dev && git push && git checkout dev`.
3. Before any merge that changes `convex/schema.ts`, check the change is additive (new tables, new optional fields). Never rename or delete a field or table that holds production data; if a breaking change is unavoidable, that is a TRUE BLOCKER (stop and ask).
4. Before the first production deploy (Gate A), `main` may hold only a minimal working site. State in every REPORT which branch and commit is live.
5. Every command must say which Convex deployment it targets (dev or `--prod`).

### 0.6 FEATURE FREEZE (v2.3)
**Friday 6 Nov 2026, 6:00 PM Ghana time: FEATURE FREEZE.** Before the freeze, build in the §12 order. After the freeze, ONLY bug fixes, security fixes, docs and the RUNBOOK are allowed. No new features, no refactors, no dependency upgrades. If a Must box is still open at the freeze, finish only what makes it work; mark any unfinished Should box `[!]`. Check the clock with `date` at the start of every phase. After the freeze, every merge to `main` needs a one-line reason in §13.

### 0.7 OWNER PREP CHECKLIST (the Builder prints this inside the first `DO THESE NOW` list)
Before or while the Builder starts, the Owner confirms: (1) Antigravity terminal command setting is on auto-run for this folder (otherwise the run is not autonomous); (2) the strongest available model is selected (not a "Flash" model); (3) `node -v` is 20 or higher; (4) `gh auth login` works; (5) `npx convex` login and Vercel login work (the first two Builder tasks, GitHub and Convex, are the likeliest to stall the run); (6) Arkesel sender ID `TEINUCC` request started today (approval can take days; expect the default sender on Saturday); (7) ready to hand over: logos, at least TWO admin emails, the usher emails, and the capacity number.

---

## 1. Event facts (seed data and copy for the site)

- **Event:** Women Empowerment Summit
- **Organiser:** TEIN-UCC, Office of the Women's Commissioner. "SKIDO-ARGON Led Administration"
- **Theme:** *Empowered Women, Transformed Futures: Building Women for Leadership, Economic Independence and National Development*
- **Date/time:** Saturday, 7 November 2026, 9:00 AM (Ghana = UTC+0, no daylight saving)
- **Venue:** SGS Auditorium, University of Cape Coast
- **Contacts:** Mohammed Salifu Apugang, President, 0248831639. Somuah Oheneba Ama (Wocom), +233 59 761 1305
- **Social:** @TEINUCC (Facebook, X, TikTok)
- **Capacity:** placeholder 500 (Owner to confirm)

## 2. Goals and success metrics

| Goal | Metric |
|---|---|
| Know who is coming | Every registration stored with name, phone, category |
| Know who actually came | Check-in by QR or phone search; live attended count |
| Follow up | Thank-you SMS to all attendees within 24h of the event |
| Easy for committee | Admin can search, filter, export in under 1 minute |
| Works on weak data | Public page loads under 3s on 3G; form done in under 60s |
| Clean data | One registration per phone per event; spam protected |

## 3. Users and roles

1. **Attendee** (student / staff / alumni / guest): phone only, no account.
2. **Admin** (committee): everything.
3. **Check-in staff** (ushers): check-in screen and walk-in only. No export, no messaging, no settings.

Staff (admin and check-in) get accounts ONLY through an invite made by an admin (see R11). Nobody can create a staff account on their own.

## 4. Scope

**Must (MVP):** landing page in NDC theme; registration form; QR ticket page; capacity + waitlist; open/close registration; staff sign-up (invite code) and sign-in with roles; dashboard; attendee table (search/filter/edit/cancel/add); CSV export; check-in scanner + phone search + walk-in; SMS campaigns with templates, audience filters and per-recipient log; thank-you flow; audit log.

**Should (v2.3: dropped first when time is short):** dashboard charts (R3 charts; simple count cards stay Must), audit log viewing page (audit entries stay Must), registration-link QR poster, Lighthouse pass, confirmation SMS with ticket link on registration (toggle); "Find my ticket" by SMS. (The check-in live counter is a Must, see R6.)

**Later (not now):** email, payments, certificates, multi-event public listing, offline scanning, feedback form.

## 5. DECISIONS (final; do not change without telling the Owner)

| # | Decision | Why |
|---|---|---|
| D1 | **Convex** for database, server functions, realtime | TypeScript end to end; mutations are transactional (capacity checks are race-safe without hand-written SQL); reactive queries give live dashboard and check-in counts for free; no RLS to configure |
| D2 | **Convex Auth** (`@convex-dev/auth`, Password provider) for staff sign-up and sign-in, built into our own app. **No Clerk.** Roles live in the Convex `staff` table | Owner decision: Clerk does not fit the Owner's needs. Convex Auth lives inside our own Convex project: no third-party account, no extra dashboard |
| D2b | **Auth fallback.** If invite-code sign-up (the `createOrUpdateUser` hook taking the extra invite field and rolling back cleanly) cannot be made to work within 30 minutes, switch to: NO public sign-up; admins create staff accounts directly in Settings > Team (email + name + role), and the app shows a temporary password once. The first admin is created from the command line with a temporary password shown once. Staff change it at first sign-in if time allows. All other auth rules (generic errors, `requireStaff` on every call, disable, 7-day sessions) stay. Log it in §13 as a deviation | The hook is untested against the current library; this keeps staff login working for Saturday |
| D3 | **SMS only. No email, no Resend.** Remove the email field from the form | Students respond to SMS; one channel is less to build and less data collected. Email is used ONLY as the staff login identifier in Convex Auth |
| D4 | **Arkesel** SMS behind a `SmsProvider` interface (mNotify can be added later) | Local provider; verify API against current docs |
| D5 | **Next.js 15 App Router + TypeScript (strict) + Tailwind + shadcn/ui**, pnpm, Node 20+ | Standard, fast on Vercel |
| D6 | **Vercel** hosting with Convex production deploy via `npx convex deploy` in the build command. `main` = production, branch `dev` = previews against the DEV Convex deployment (see §0.5) | Owner already has Vercel and GitHub; stops half-finished work from going live |
| D7 | Admin tables load the event's registrations in one reactive query and **search/filter/sort/paginate on the client** (cap 2,000 rows) | Simplest and instant for a few hundred to a couple thousand people. If an event is ever larger, switch to paginated queries |
| D8 | Ticket QR contains **only the ticket code** | No personal data in the QR |
| D9 | Duplicate phone never reveals the existing ticket on screen; it triggers an SMS with the ticket link (if SMS enabled) | Stops people pulling tickets for numbers they don't own |
| D10 | No "reply STOP" in SMS (Arkesel sender IDs can't receive replies). Opt-out = admin toggles `optedOut`, or the person calls the number in the footer | Don't promise what the system can't do |
| D11 | **Staff sign-up needs an invite code.** Admin creates an invite (email + role); the app shows an 8-character code once; the person opens `/sign-up` and enters name, the SAME email, a password and the code. Codes are single-use, expire in 7 days, and only a hash is stored | Sign-up is public on the internet, but the CRM holds personal data. With no email verification (D3), an invite code tied to an exact email is what stops a stranger (or someone guessing an invited email) from becoming staff |
| D12 | **No email means no "forgot password" email.** An admin resets a staff password in Settings and the app shows a temporary password once | Keeps D3 (SMS only). Small team, so an admin can always be reached |
| D13 | Sessions last 7 days max, 2 days inactive. The staff row is checked on EVERY call, so disabling someone works immediately | Ushers can sign in Friday and still be signed in Saturday; a lost phone can be cut off in seconds |

## 6. Functional requirements and acceptance criteria

**R1 Register (public).** Fields: full name\*, phone\*, gender (optional), attendee type\* (student/staff/alumni/guest), student index number (students only), level, programme/department, hall/residence, how did you hear about it, accessibility/special needs, consent to receive event SMS\*.
- Phone normalised to E.164 (+233…). Accept `024…`, `+23324…`, `23324…`, `24…` as the same number. Reject invalid numbers clearly.
- Success: ticket page `/ticket/[code]` with name, code (e.g. `WES-7K3M9Q`), QR, venue/date/time, add-to-calendar (.ics), WhatsApp share, "screenshot your ticket" hint.
- Duplicate phone: friendly "already registered" message (see D9).
- Capacity reached → status `waitlisted` with a clear message; admin can promote.
- Registration closed → friendly closed page.
- Honeypot field + global and per-phone rate limiting. Keeps entered values on error.
- Mobile-first, tap targets ≥ 44px, keyboard and screen-reader friendly.

**R2 Find my ticket.** Enter phone → always show "If this number is registered, we've sent your ticket link by SMS" (never confirm or deny). Max 3 SMS per phone per hour.

**R3 Dashboard (admin).** Registered, waitlisted, checked in, no-shows (after event start), capacity used %; **(Should)** charts: by type, level, programme (top 10), registrations per day. Live-updating.

**R4 Attendee table (admin).** Search (name/phone/ticket code), filter (status, type, level, checked-in, source), sort, 25 per page, detail drawer, edit, cancel (soft), manual add, promote waitlisted, toggle opted-out.

**R5 Export (admin only).** CSV of current filtered view or all; UTF-8 with BOM (opens in Excel); cells starting with `= + - @` are prefixed with `'`; export logged to audit.

**R6 Check-in (admin + checkin roles).** Camera QR scanner; big result banner: green "CHECKED IN: Name", amber "Already checked in at HH:MM", red "Not found / Cancelled / Waitlisted". Idempotent. Manual search by name/phone/code with one-tap check-in. Walk-in form (creates registration source `walk_in`, checked in immediately). If camera permission fails, show manual search. Live "checked in / registered" counter.

**R7 SMS campaigns (admin only).** Audience: all registered / checked-in / no-shows / waitlisted. Only `consentComms = true`, `optedOut = false`, status matches. Template with `{name}` and `{event}`; preview; recipient count; character and segment counter; "send test to my number"; confirm dialog; sent in batches; per-recipient status and error text; campaign totals. Templates: Reminder, Thank-you (attended), Sorry-we-missed-you (no-show).

**R8 Confirmation SMS (toggle, default OFF until SMS verified).** On successful registration, send ticket link. Failure never blocks registration.

**R9 Staff and settings (admin).** Invite staff (email + role), revoke invites, disable staff, reset a staff password (see R11); edit event (capacity, open/close, details); toggle confirmation SMS; **(Should)** download registration-link QR poster.

**R10 Audit log.** sign-up, login, failed login (never the password), invite created/revoked, password reset, staff disabled, export, edit, cancel, promote, check-in, send campaign, staff changes.

**R11 Staff sign-up and sign-in (replaces Clerk).**
- `/sign-in`: email + password. Any failure shows the SAME message: "Email or password is incorrect" (never say which one).
- `/sign-up`: full name, email, password (min 10 characters), confirm password, invite code. Succeeds only if the code was made for that exact email, is unused, not revoked, and not expired. Any invite problem shows the SAME message: "This invite is invalid or has expired. Ask your admin for a new one."
- Right after sign-up the person is signed in and lands on `/admin` (admin role) or `/checkin` (check-in role).
- **Invites (admin, Settings > Team):** enter email + role, press Create. The app shows the code ONCE with a Copy button and a ready-to-send WhatsApp message with the sign-up link. The list shows each invite as Pending / Used / Expired / Revoked, with a Revoke button.
- **First admin:** the Builder creates the very first invite from the command line for the Owner's email (H8). After that, admins invite everyone else in the app.
- **Disable staff:** the person is blocked on their very next click and their sessions are deleted.
- **Signed in but not active staff** (disabled, or somehow no staff row): `/no-access` page with a Sign out button. Every Convex function also refuses them.
- **Reset password (admin):** shows a temporary password once and ends the person's sessions. (Should: a "change my password" page.)
- **Sign out** button on every admin and check-in screen.
- Public pages (`/`, `/register`, `/ticket/*`, `/privacy`) never require login and never load staff data.

## 7. Data model (Convex `convex/schema.ts`)

```ts
import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,                        // `users`, sessions, accounts: managed by Convex Auth, do not edit by hand

  events: defineTable({
    slug: v.string(),
    name: v.string(),
    theme: v.optional(v.string()),
    venue: v.string(),
    startsAt: v.number(),               // ms since epoch (UTC)
    capacity: v.number(),
    registrationOpen: v.boolean(),
    confirmationSmsEnabled: v.boolean(),
  }).index("by_slug", ["slug"]),

  registrations: defineTable({
    eventId: v.id("events"),
    ticketCode: v.string(),             // e.g. WES-7K3M9Q, unique
    fullName: v.string(),
    phone: v.string(),                  // E.164 e.g. +233248831639
    gender: v.optional(v.string()),
    attendeeType: v.union(v.literal("student"), v.literal("staff"), v.literal("alumni"), v.literal("guest")),
    studentId: v.optional(v.string()),
    level: v.optional(v.string()),
    programme: v.optional(v.string()),
    hall: v.optional(v.string()),
    howHeard: v.optional(v.string()),
    specialNeeds: v.optional(v.string()),
    consentComms: v.boolean(),
    optedOut: v.boolean(),
    status: v.union(v.literal("registered"), v.literal("waitlisted"), v.literal("cancelled")),
    source: v.union(v.literal("online"), v.literal("walk_in"), v.literal("admin")),
    checkedInAt: v.optional(v.number()),
    checkedInBy: v.optional(v.string()),   // staff email
  })
    .index("by_event_phone", ["eventId", "phone"])
    .index("by_ticket", ["ticketCode"])
    .index("by_event_status", ["eventId", "status"]),

  staff: defineTable({
    userId: v.id("users"),              // the Convex Auth user, created at sign-up
    email: v.string(),                  // lowercase
    name: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("checkin")),
    active: v.boolean(),
    lastLoginAt: v.optional(v.number()),
  }).index("by_userId", ["userId"]).index("by_email", ["email"]),

  invites: defineTable({
    email: v.string(),                  // lowercase; the code only works for this email
    role: v.union(v.literal("admin"), v.literal("checkin")),
    codeHash: v.string(),               // SHA-256 of the code. The plain code is shown once and NEVER stored
    expiresAt: v.number(),              // now + 7 days
    usedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    createdBy: v.string(),              // admin email, or "bootstrap"
  }).index("by_email", ["email"]).index("by_codeHash", ["codeHash"]),

  campaigns: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    body: v.string(),
    audience: v.union(v.literal("all_registered"), v.literal("checked_in"), v.literal("no_show"), v.literal("waitlisted")),
    total: v.number(), sent: v.number(), failed: v.number(),
    state: v.union(v.literal("queued"), v.literal("sending"), v.literal("done")),
    createdBy: v.string(),
  }).index("by_event", ["eventId"]),

  messages: defineTable({
    campaignId: v.optional(v.id("campaigns")),     // null for confirmation / ticket-resend / test SMS
    registrationId: v.optional(v.id("registrations")),
    kind: v.union(v.literal("campaign"), v.literal("confirmation"), v.literal("ticket_resend"), v.literal("test")),
    toPhone: v.string(),
    body: v.string(),
    status: v.union(v.literal("queued"), v.literal("sent"), v.literal("failed")),
    error: v.optional(v.string()),
    providerResponse: v.optional(v.string()),
  }).index("by_campaign", ["campaignId"]).index("by_status", ["status"]),

  auditLog: defineTable({
    actor: v.string(),
    action: v.string(),
    target: v.optional(v.string()),
    meta: v.optional(v.string()),
  }),
});
```

## 8. Backend design (Convex)

**Golden security rule:** Convex functions are public APIs. Every admin function MUST call a helper `requireStaff(ctx, ["admin"])` or `requireStaff(ctx, ["admin","checkin"])` which calls `getAuthUserId(ctx)` (from `@convex-dev/auth/server`), finds the `staff` row with the `by_userId` index, and checks that it is **active** and the role is allowed. No user, no staff row, disabled, or wrong role = throw. Never trust the client. Use `internalMutation/internalAction` for anything that must not be callable from the browser.

| Module | Functions |
|---|---|
| `events` | `getPublic(slug)` (public query: name, theme, venue, startsAt, open flag, spots-left boolean only), `update` (admin) |
| `registrations` | `register` (public mutation: validate, normalise phone, rate limit, capacity check, ticket code, insert, schedule confirmation SMS if enabled), `getTicket(code)` (public query: name, code, status, event info only), `requestTicketSms(phone)` (public mutation, rate limited, always same response), `listForEvent` (admin query, cap 2000), `update`, `cancel`, `promote`, `adminCreate`, `setOptedOut` |
| `checkin` | `byCode`, `byId`, `walkIn` (admin or checkin). Idempotent: only set `checkedInAt` if unset; return `alreadyCheckedInAt` otherwise |
| `stats` | `dashboard(eventId)` (admin) |
| `campaigns` | `previewAudience` (count + sample), `create` (admin mutation: builds message rows from audience and schedules sending), `send` (internal action: batches, calls provider), `list`, `get` |
| `sms` | `SmsProvider` interface; `arkesel.ts` implementation; `normalizePhone.ts` (own small Ghana-aware normaliser with unit tests, so it runs safely in the Convex runtime) |
| `staff` | `me` (who am I + role, used by route guards), `list`, `createInvite` (admin), `listInvites` (admin), `revokeInvite` (admin), `setActive` (admin; also deletes that person's sessions), `resetPassword` (admin action; returns temp password once), `recordLogin` (called once after sign-in; writes `lastLoginAt` + audit), `createFirstInvite` (internal; run once from CLI, prints the code) |
| `audit` | `log` (internal), `list` (admin) |
| `seed` | `seedEvent` (internal; run with `npx convex run seed:seedEvent` and `--prod` for production). Fake attendees only via dev script guarded by env flag |

**Capacity safety:** `register` runs as one Convex mutation (serialisable transaction). Count `registered` rows with the `by_event_status` index, compare to `capacity`, insert with status `registered` or `waitlisted`. Test with parallel calls.

**Ticket code:** `WES-` + 6 chars from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (no 0/O/1/I/L). Retry on collision via `by_ticket`.

**Rate limiting:** use the Convex rate-limiter component (`@convex-dev/rate-limiter`) or an equivalent table-based limiter: global registrations (e.g. 60/min burst), per phone (3 per 10 min), ticket SMS per phone (3/hour).

### Staff authentication design (v2.1, replaces Clerk)

**Rule:** Convex Auth is newer and its API changes. The Builder MUST follow the current official guide (docs.convex.dev, "Convex Auth", Password provider + Next.js setup) and not rely on memory. Names below are the plan; adjust to the docs and report any difference.

**Double lock (unchanged idea):** the Next.js middleware and layouts keep strangers out of the pages, AND `requireStaff` in Convex keeps them out of the data. The data lock is the one that really matters.

**Files**
- `convex/auth.ts`: `convexAuth({ providers: [Password({ profile, validatePasswordRequirements })], callbacks: { createOrUpdateUser }, session: { totalDurationMs: 7 days, inactiveDurationMs: 2 days } })`
- `convex/auth.config.ts` and `convex/http.ts`: exactly as the docs say
- `middleware.ts`: `convexAuthNextjsMiddleware`. Public: `/`, `/register`, `/ticket/*`, `/privacy`, `/sign-in`, `/sign-up`. Protected: `/admin/*`, `/checkin/*`
- `app/layout.tsx`: the Convex Auth Next.js server provider and client provider (replaces `ConvexProviderWithClerk`)
- Convex env vars, set on BOTH dev and prod deployments (the docs' setup command creates the keys): `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL` (prod value = the Vercel production URL). Never commit them.
- The only public env vars are now `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_SITE_URL`.

**Sign-up flow (all or nothing)**
1. `/sign-up` calls `signIn("password", { flow: "signUp", email, password, name, inviteCode })`.
2. `profile()` trims and lowercases the email, checks name length (2 to 80), and passes `inviteCode` through. `validatePasswordRequirements` enforces 10+ characters.
3. `createOrUpdateUser` has database access. It hashes the code (SHA-256), finds the invite with `by_codeHash`, and requires: email matches, `usedAt` empty, `revokedAt` empty, `expiresAt` in the future. If not, it throws the generic invite error from R11.
4. If valid, in the SAME transaction: insert the `users` row (email + name only, never the code), insert the `staff` row (`active: true`, role from the invite), set `usedAt`. If anything throws, nothing is saved. Test that a failed sign-up leaves NO new `users` or account row behind.
5. The person is signed in automatically.

**Sign-in flow:** `flow: "signIn"`. Generic error on any failure. Use the library's failed-attempt limit (check docs; target about 10 failed tries per hour per email) or add the rate limiter. After success the client calls `staff.recordLogin` once.

**Invite codes:** 8 characters from the same no-lookalike alphabet as ticket codes (`23456789ABCDEFGHJKMNPQRSTUVWXYZ`), made with a cryptographically secure random generator. Creating a new invite for an email revokes any older unused one. You cannot invite an email that already has an active staff row. Codes are never written to logs, the audit log, or the database in plain form.

**Disable and reset:** `setActive(false)` also deletes that person's sessions so they are signed out now. `resetPassword` is an admin-only action: it sets a random 12-character temporary password using the library's credential-update helper (check docs for the exact function), ends all that person's sessions, and returns the password once. If the docs show no such helper, fall back to an internal function the Owner runs from the command line and report it as a deviation.

**Route guards (server side, in layouts)**
| Situation | Result |
|---|---|
| Signed out, opens `/admin` or `/checkin` | Redirect to `/sign-in?next=<path>` |
| Active `admin` | Can open `/admin/*` and `/checkin/*` |
| Active `checkin` | Can open `/checkin/*` only; `/admin/*` redirects to `/checkin` |
| Signed in but disabled or not staff | `/no-access` with Sign out |
| Signed in, opens `/sign-in` or `/sign-up` | Redirect to their home page |
The `next` value must start with a single `/` (block `//` and full URLs) so nobody can use it as an open redirect.

**Screens:** same branding as §11, mobile first. Inputs use correct `autocomplete` values (`username`, `current-password`, `new-password`) so phone password managers work. Show/hide password button. Clear error text under the form, never in an alert popup. Link on sign-in: "Have an invite code? Sign up". Link on sign-up: "Already have an account? Sign in", plus "No code? Ask your committee admin".

## 9. SMS spec

- `SmsProvider.send({ to, message }): Promise<{ ok: boolean; providerResponse: string; error?: string }>`.
- **Arkesel:** check current docs. Expected: `POST https://sms.arkesel.com/api/v2/sms/send`, header `api-key`, JSON `{ sender, message, recipients: [...] }`; recipients usually in `233XXXXXXXXX` form (convert from E.164 as the docs require). Sender ID max 11 characters (e.g. `TEINUCC`); needs approval, use the provider's default sender until approved.
- Convex env vars (set with `npx convex env set`): `ARKESEL_API_KEY`, `SMS_SENDER_ID`.
- Sending: Convex **actions** only (they can call external APIs). If the template contains `{name}`, send one request per recipient (concurrency about 5); otherwise bulk batches of up to 100 recipients. After each batch, update message rows and campaign counters, then schedule the next batch with `ctx.scheduler.runAfter`. Never loop everything in one action.
- Plain GSM text only (no emojis; they shrink a segment from 160 to 70 characters). Show segment counter in compose screen.
- Test mode: `ConsoleProvider` (logs instead of sending) when `SMS_SENDER_ID` or key is missing or `SMS_DRY_RUN=true`.
- Every SMS creates a `messages` row. Mark `sent` when the provider accepts it (delivery reports are a stretch).
- **Templates (keep ≤ 160 chars after substitution where possible):**
  - Confirmation: `Hi {name}, you're registered for {event}, Sat 7 Nov, 9AM, SGS Auditorium. Your ticket: {ticketUrl}`
  - Reminder: `Hi {name}, reminder: {event} is tomorrow 9AM at SGS Auditorium, UCC. Bring your QR ticket: {ticketUrl}`
  - Thank-you: `Thank you {name} for joining the {event}! Empowered women, transformed futures. - TEIN-UCC Women's Commissioner`
  - Missed-you: `Hi {name}, we missed you at the {event}. Stay connected with @TEINUCC for upcoming programmes.`

## 10. Security and privacy

- Secrets only in Vercel env vars and Convex env vars; only `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_SITE_URL` are public. Auth keys (`JWT_PRIVATE_KEY`, `JWKS`) live only in Convex env vars.
- Validate all arguments with Convex `v` validators plus extra checks (trim, length limits, enum values). Reject unknown shapes.
- Public queries return minimal fields. No endpoint lists attendees without `requireStaff`.
- CSV formula-injection guard (R5). No user HTML rendered.
- Security headers via `next.config` (CSP, X-Frame-Options, Referrer-Policy).
- Ghana Data Protection Act, 2012 (Act 843): collect only what's needed, explicit consent checkbox, `/privacy` page, admin can delete/anonymise a person on request, only staff see data.
- No PII in console logs. Never log passwords, temporary passwords, or invite codes.
- Staff auth: passwords hashed by the library (never stored in plain form); minimum 10 characters; generic error messages (no "this email exists" leaks); invite codes single-use, 7-day expiry, hashed at rest; failed-login limit; sessions end on disable or reset; every admin/check-in function calls `requireStaff`; `next` redirect parameter validated.

## 11. Branding (NDC theme, match the flyer)

- Colours: green `#0A8F3F` (primary), deep green `#064E2B`, red `#E11D2A`, white `#FFFFFF`, black `#0B0B0B`. White text on green/red; never red text on green.
- Fonts (`next/font`): wide bold display (Unbounded or Montserrat 800) for headings, Poppins for body, script (Allura or Great Vibes) for the word "Summit".
- Hero mirrors the flyer: deep-green gradient with subtle leaf/silhouette shapes, header chip "TEIN-UCC / OFFICE OF THE WOMEN'S COMMISSIONER", huge white "WOMEN", full-width red band with "EMPOWERMENT", script "Summit", red "THEME" tag, info row (date, venue, time with lucide icons), sticky red "Register Now" on mobile.
- Footer: "SKIDO-ARGON Led Administration", both contact numbers, @TEINUCC.
- Logos from `/public/brand/` (Owner supplies). Fallback text wordmark.
- Admin UI: white background, green primary, red for destructive actions; sidebar on desktop, bottom nav on mobile.

## 12. BUILD TRACKER (tick `[x]` only after testing)

Time budget: about 5 hours. **Order of phases: P0, P1, P2, GATE A (mandatory pause), P3A, GATE A2, P4, GATE B, P3 (Must), GATE B2, P5, GATE C, P3S (Should), P6, GATE D.** Do not reorder. **GATE** = checkpoint: self-review, print REPORT (§14), log it in §13, merge `dev` to `main` if green (§0.5), then CONTINUE without waiting (§0.4), except Gate A. Boxes marked **OWNER-VERIFY** end as `[~]`. Boxes marked **(Should)** are dropped first. Feature freeze Friday 6 PM (§0.6).

### H. Human tasks (Owner does these; Builder lists exact steps and waits only when truly blocked)
- [ ] H1 Create private GitHub repo `tein-ucc-events`, connect local folder
- [ ] H2 Convex account (Builder runs `npx convex dev`, Owner logs in in the browser)
- [ ] H3 (Clerk is gone, no account needed.) Nothing to create. Builder runs the Convex Auth setup command and sets the auth keys on the dev Convex deployment; Owner only approves the browser login if asked
- [ ] H4 Arkesel account, top up a small balance, request sender ID `TEINUCC`, copy API key (can finish later; app runs in dry-run until then)
- [ ] H5 Vercel: import GitHub repo, add env vars (`NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_SITE_URL`), add `CONVEX_DEPLOY_KEY` (production), set build command `npx convex deploy --cmd 'pnpm build'`. Builder also sets the auth keys and `SITE_URL` on the PRODUCTION Convex deployment (`--prod`). Scope `CONVEX_DEPLOY_KEY` (production) to the Production environment only; Production Branch = `main`. For `dev` preview builds Builder follows the current Convex docs for Vercel preview deployments (a separate preview deploy key / backend) so previews never touch production data; if that cannot be set up quickly, use `pnpm build` for previews and point them at the dev deployment URL
- [ ] H6 Drop official logos into `public/brand/` (`ucc-logo.png`, `tein-ucc-logo.png`)
- [ ] H7 Confirm capacity number and whether non-women may register (default: open to all)
- [ ] H8 Give Builder the first admin email. Builder runs `staff:createFirstInvite`, prints the invite code, and Owner signs up at `/sign-up` with that email + code to become the first admin

### P0. Setup (about 30 min)
- [x] P0.1 Next.js 15 + TS strict + Tailwind + shadcn/ui + pnpm scaffold (package name `tein-ucc-events`; see §0.4 item 10); scripts `typecheck`, `lint`, `build`, `test`
- [x] P0.2 Convex initialised; `npx convex dev` running; schema from §7 pushed
- [x] P0.3 Convex Auth (Password) wired per §8: `auth.ts`, `auth.config.ts`, `http.ts`, providers in layout, middleware, keys set on dev. Public pages still load while signed out
- [x] P0.4 `.env.example` written; `.gitignore` correct; first commit pushed to GitHub; branch `dev` created and checked out (§0.5); Vercel previews on `dev` use the DEV Convex deployment
- [~] P0.5 Vercel preview deploy shows a working page

### P1. Backend core (about 40 min)
- [x] P1.1 `normalizePhone` util + unit tests (all four formats equal; invalid rejected)
- [x] P1.2 `requireStaff` helper (uses `getAuthUserId` + `staff.by_userId`) and `staff.me`. (Invites, sign-up and the rest come in P3A)
- [x] P1.3 `seed:seedEvent` creates the Women Empowerment Summit event (run on dev)
- [x] P1.4 `registrations.register` with validation, ticket code, capacity/waitlist, rate limits, honeypot
- [x] P1.5 `registrations.getTicket`, `events.getPublic`
- [x] P1.6 Test: 20 parallel registrations at capacity-1 never exceed capacity (script or test)

### P2. Public site (about 50 min)
- [x] P2.1 Landing page per §11, responsive at 390px and desktop
- [x] P2.2 `/register` form (react-hook-form + zod mirror of server rules), duplicate/closed/waitlist states
- [x] P2.3 `/ticket/[code]` with QR, .ics, WhatsApp share, screenshot hint
- [x] P2.4 `/privacy` page, custom 404, loading and error states
- [~] P2.5 Seed event on **production** Convex; deploy to Vercel production; register once on a real phone **(OWNER-VERIFY: Builder does everything and ends this box as `[~]`)**
- [ ] **GATE A: public registration is LIVE on `main`/production. MANDATORY PAUSE (§0.4 item 1): print the REPORT and the Gate A checklist, then STOP until the Owner replies `GATE A PASSED`. Do not start P3A before that reply, and do not tell the Owner to share the link until then.** (If the Owner's reply contains fixes, apply them, redeploy and ask again.)

### P3A. Staff authentication: sign-up and sign-in (about 60 min, replaces Clerk). Time-box: if the invite-code sign-up (P3A.2) is not working after 30 minutes, trigger D2b and do P3A-FB instead
- [ ] P3A.1 Schema updated (`authTables`, `staff.userId`, `invites`) and pushed to dev
- [ ] P3A.2 `convex/auth.ts`: Password provider, `profile`, 10-char password rule, 7-day session, `createOrUpdateUser` checks the invite and creates the `staff` row in one transaction
- [ ] P3A.3 Invite functions: `createInvite`, `listInvites`, `revokeInvite`, `createFirstInvite` (internal). Code is hashed, shown once, expires in 7 days
- [ ] P3A.4 `/sign-up` page (name, email, password, confirm, invite code) with the generic errors from R11
- [ ] P3A.5 `/sign-in` page, `/no-access` page, sign-out button, `staff.recordLogin`
- [ ] P3A.6 Middleware + server-side route guards per the table in §8; `next` redirect validated
- [ ] P3A.7 Settings > Team screen: create invite (copy + WhatsApp message), invite list with status, revoke, disable staff, reset password (temp password shown once)
- [ ] P3A.8 Audit entries for sign-up, login, failed login, invite created/revoked, disable, reset
- [ ] P3A.9 Builder proves the full invite flow with a script or browser test (first invite, sign-up, usher invite, usher sign-up). **OWNER-VERIFY:** Owner signs up as first admin and an usher signs up on a real phone (box ends as `[~]`)
- [ ] P3A-FB **(Fallback, only if D2b is triggered; otherwise mark `[!]` "not needed")** Admin-created staff accounts with a temporary password shown once; first admin created from the CLI; same negative tests as P3A.10 that still apply (disabled user blocked, `checkin` role refused on admin functions, signed-out refused)
- [ ] P3A.10 **Negative tests (paste the evidence in the REPORT):** sign-up with no code, wrong code, right code but different email, reused code, expired code, revoked code (all fail with the generic message, and NO `users` row is left behind); password under 10 characters is rejected; wrong password and unknown email show the same message; a disabled user's already-open session is blocked on the next call; `checkin` role calling any admin function is refused; signed-out calling any admin or check-in function is refused
- [ ] **GATE A2: staff auth is built and self-reviewed.** Builder re-reads the P3A.10 evidence; every negative test must show real output before any admin screen is built. Then continue (no waiting)

### P4. Check-in (about 35 min) — MUST, built BEFORE the CRM (v2.3)
- [ ] P4.1 Scanner page with camera QR scan and result banners
- [ ] P4.2 Idempotent check-in (double scan = one check-in)
- [ ] P4.3 Manual search by name/phone/code, one-tap check-in
- [ ] P4.4 Walk-in registration
- [ ] P4.5 Live checked-in counter; camera-denied fallback
- [ ] **GATE B: check-in works (Builder tests in a browser; real-phone test is OWNER-VERIFY and ends as `[~]`). Merge `dev` to `main` if green.**

### P3. Admin CRM, MUST part (about 40 min) — built AFTER check-in
- [ ] P3.1 Role-based admin layout and sidebar/bottom nav using the P3A guards; `/admin` shows the right pages for the role; simple live count cards (registered, waitlisted, checked in)
- [ ] P3.3 Attendee table: client-side search, filters, sort, pagination; detail drawer
- [ ] P3.4 Edit, cancel, promote, opt-out toggle, manual add
- [ ] P3.5 CSV export (BOM, formula guard, audit entry)
- [ ] P3.6 Settings: event edit, open/close, capacity, confirmation-SMS toggle (staff invite/disable is done in P3A.7)
- [ ] P3.8 Negative tests: unauthenticated and `checkin` role are blocked from admin functions (try calling directly)
- [ ] **GATE B2: attendee list + export work. Merge `dev` to `main` if green.**

### P3S. Admin CRM, SHOULD part (do only after P5 Must items; drop first if time is short)
- [ ] P3.2 **(Should)** Dashboard charts (by type, level, programme top 10, registrations per day)
- [ ] P3.7 **(Should)** Audit log page (audit ENTRIES are still written everywhere, as a Must; only the viewing page is Should)

### P5. SMS (about 45 min) — Must, built after the Must CRM
- [ ] P5.1 `SmsProvider` interface, Arkesel implementation (verified against current docs), dry-run provider
- [ ] P5.2 Compose page: audience, template, preview, counter, recipient count, test-to-me, confirm dialog
- [ ] P5.3 Batched sending via actions + scheduler; per-recipient status; campaign totals
- [ ] P5.4 Confirmation SMS (setting, default OFF) and "Find my ticket" by SMS (rate limited)
- [ ] P5.5 Thank-you and missed-you templates; one-click "Thank attendees"
- [ ] P5.6 Real test SMS delivered to the Owner's phone **(OWNER-VERIFY; if Arkesel key is not set yet, dry-run proof is enough and the box ends as `[~]`)**
- [ ] **GATE C: SMS works end to end.**

### P6. Hardening, production, handoff (about 40 min)
- [ ] P6.1 Security headers, no PII in logs, env audit, confirm no secret in client bundle
- [ ] P6.2 **(Should)** Accessibility pass; Lighthouse mobile run (target Performance 90+, Accessibility 95+). Basic accessibility (labels, contrast, tap targets) is still a Must in P2; only the Lighthouse run is Should
- [ ] P6.3 **(Should)** QR poster download for the registration link
- [ ] P6.4 Production env complete (including auth keys and `SITE_URL` on the production Convex deployment); real admin signed up with a production invite; usher invites created and sent
- [ ] P6.5 Full acceptance run (below): Builder runs everything it can in a browser at 390px width; the Android and iPhone run is **OWNER-VERIFY** (`[~]`)
- [ ] P6.6 `README.md` and `docs/RUNBOOK.md` (add staff, export, send SMS, scanner fails, rollback)
- [ ] P6.7 Event-day backups (§15): a button or script that exports the full attendee CSV; Builder lists in the FINAL REPORT the exact steps for Friday-night export and print, and the Google Form fallback
- [ ] **GATE D: final report.** (All Must boxes `[x]` or `[~]`; Should boxes `[x]` or `[!]` with a reason.)

### Final acceptance checklist
- [ ] A1 Register on a real phone in under 60s; QR survives refresh **(OWNER-VERIFY)**
- [ ] A2 `024…`, `+23324…`, `23324…` are the same person (duplicate blocked)
- [ ] A3 Capacity reached → waitlist; parallel test does not overbook
- [ ] A4 Closing registration shows a friendly closed page
- [ ] A5 Unauthenticated users cannot read any attendee data (query and mutation level)
- [ ] A6 `checkin` role cannot export, message, or edit settings (tested by calling the functions)
- [ ] A7 CSV opens correctly in Excel with names intact; formula guard works
- [ ] A8 Double scan = one check-in; walk-in works
- [ ] A9 Campaign sends only to consenting, non-opted-out, correctly filtered people; log shows statuses
- [ ] A10 `pnpm typecheck && pnpm lint && pnpm build` clean; no secrets in repo or client bundle
- [ ] A11 Production URL works; README and RUNBOOK exist
- [ ] A12 Sign-up works only with a valid invite code for that exact email; wrong, reused, expired and revoked codes all fail with the same generic message and leave no account behind
- [ ] A13 Wrong password and unknown email give the same message; repeated failures get limited
- [ ] A14 A disabled staff member is blocked on their next click (existing session included)
- [ ] A15 `/admin/*` and `/checkin/*` redirect signed-out visitors to `/sign-in`; `checkin` role is redirected away from `/admin/*`
- [ ] A16 Admin password reset works: temp password shown once, old sessions ended, new password works
- [ ] A17 No Clerk package, key or import remains anywhere (`grep -ri clerk` is empty except this PRD's history notes)
- [ ] A18 No invite code, password or temp password appears in logs, audit log, or the database in plain form

## 13. SESSION LOG (Builder appends; newest at bottom)

| # | Date/time | Phase | Done | Next exact step | Blockers |
|---|---|---|---|---|---|
| 0 | 2026-11-05 | Planning | PRD v2.0 written | Owner puts PRD in `docs/PRD.md`, pastes master prompt | none |
| 1 | 2026-11-05 | Planning | PRD v2.1: Clerk removed; Convex Auth + invite-code sign-up planned (D2, D11 to D13, R11, §8, P3A, A12 to A18) | Continue at the first unchecked box in §12 | none |
| 2 | 2026-11-05 | Planning | PRD v2.2: autonomous mode (§0.4), `[~]` status, HUMAN QUEUE, FINAL REPORT, START_HERE.md added | Owner uploads PRD.md + START_HERE.md; Builder starts at H1/P0.1 | none |
| 3 | 2026-11-05 | Planning | PRD v2.3: check-in before CRM; Should items split out (P3S); `dev` branch rule (§0.5); Gate A mandatory pause; Friday 6 PM feature freeze (§0.6); auth fallback D2b / P3A-FB; owner prep checklist (§0.7); event-day backups (§15) | Owner does the §0.7 checklist, then sends the one-line START_HERE message | none |
| 4 | 2026-11-05 | P0 Setup | Next.js 15, Convex, Convex Auth, schema, strict TS, scripts typecheck/lint/build/test, .env.example, git init & branch dev | Proceed to P1 | none |
| 5 | 2026-11-05 | P1 Backend Core | normalizePhone + 8 tests, requireStaff, seedEvent, registrations (register, getTicket, requestTicketSms), capacity test (20 parallel) | Proceed to P2 | none |
| 6 | 2026-11-05 | P2 Public Site | Landing page in NDC branding, /register form with Zod validation, /ticket/[code] with QR & .ics, /privacy (Act 843), 404/loading/error, prod Convex deployed & seeded | GATE A checkpoint & mandatory pause | Awaiting Owner Gate A verify |

**HUMAN QUEUE (Builder keeps this list current; Owner works through it. Format: `[ ] what | exact steps | blocks which box`)**
1. [ ] H1 Connect GitHub repo | Run `gh auth login` and `gh repo create tein-ucc-events --private --source=. --push` | P0.4 / Vercel git sync
2. [ ] H5 Vercel project import & env vars | Import `tein-ucc-events` repo on vercel.com. Add `NEXT_PUBLIC_CONVEX_URL=https://perfect-orca-884.convex.cloud`, `NEXT_PUBLIC_SITE_URL=https://tein-ucc-events.vercel.app`. Set build command to `npx convex deploy --cmd 'pnpm build'` | Production URL
3. [ ] Gate A Phone Verification (OWNER-VERIFY) | Follow the Gate A checklist printed below on a real phone | Unblocks Phase P3A
4. [ ] H4 Arkesel SMS key | Register at arkesel.com, request sender ID `TEINUCC`, copy API key | P5 (dry-run until added)
5. [ ] H8 Admin Email | Provide primary admin email for bootstrap invite code | P3A.9

**Assumptions the Builder made (capacity, gender policy, sender ID, etc.):**
- Event slug: `women-empowerment-summit`
- Default capacity: 500 attendees (waitlist activates automatically once 500 reached)
- Registration open to all genders by default (women-focused theme)
- SMS Provider: Arkesel with fallback to console dry-run if ARKESEL_API_KEY is not set
- Default SMS sender ID: `TEINUCC` (or provider default until sender ID approval)

**Handoff note (Builder writes here if tokens are running out):**
_(empty)_

## 14. REPORT FORMAT (Builder prints this at every GATE and when blocked, logs it in §13, and keeps going unless Status is BLOCKED)

```
=== REPORT FOR REVIEWER ===
Phase: <P#>   Gate: <A/A2/B/B2/C/D/none>   Status: DONE | PARTIAL | BLOCKED
Boxes ticked this session: <IDs, e.g. P1.1, P1.2>
Built (max 8 bullets):
Key files changed:
Commands run and results (paste the tail of typecheck / lint / build / test output):
Branch and commit live on production (`main`) / on `dev`:
Live URLs (preview / production):
What I tested and how (and what I did NOT test):
Deviations from PRD, and why:
Problems / risks I see:
HUMAN ACTION NEEDED (exact steps, copy-paste commands):
Next step if told "continue":
=== END REPORT ===
```

**FINAL REPORT (printed once, at the very end, when §0.4 item 8 is met):**
```
=== FINAL REPORT ===
Production URL / Convex prod deployment / GitHub repo:
Boxes: <n> [x], <n> [~], <n> [!], <n> [ ] (must be 0)
Last commit hash on `main` and `dev` (must match) and clean typecheck/lint/build tail:
OWNER-VERIFY CHECKLIST (exact steps, in order, each takes under 5 min):
  1. ...
Event-day backup steps (Friday-night CSV export and print; Google Form fallback):
First admin sign-up instructions (invite code printed once, email used):
Known limitations and deviations:
What to do on event day (link to docs/RUNBOOK.md):
=== END FINAL REPORT ===
```

## 15. Event-day runbook (summary; full version goes in `docs/RUNBOOK.md`)

1. **Friday evening:** confirm registration count, create usher invites (Settings > Team) and send each code on WhatsApp; each usher signs up on their own phone and signs in once; test scanner on two phones; send reminder SMS.
2. **Saturday 8:00 AM:** ushers open the app (still signed in; if not, sign in with email + password), test-scan their own ticket. Forgot a password? Admin uses Reset password.
3. **Entrance:** scan QR. If scan fails, search by phone. Walk-ins use the walk-in form.
4. **During:** watch live counter on the dashboard.
5. **Sunday:** export final CSV (backup it), send the thank-you SMS to attendees.

**Event-day backups (v2.3):**
- **Friday night:** export the full attendee CSV and PRINT it (sorted by name). If the venue's data is bad, a paper list still lets ushers admit people. Keep the CSV on a phone and a laptop too.
- **Registration fallback:** keep a plain Google Form ready (name, phone, type, consent) to share instead of the link for the first few hours if registration breaks. Add its answers to the CRM later with Add attendee.
- **Privacy page:** a committee member reads `/privacy` once before Gate A is passed; it covers real personal data under Act 843.
- **Rollback:** if a bad deploy goes live, in Vercel open Deployments, pick the last good one and Promote to Production. Schema changes are additive only (§0.5), so rollback is safe.

## 16. Risks

| Risk | Mitigation |
|---|---|
| Event is in 2 days | Gate A puts registration live within about 2 hours; everything else follows |
| SMS sender ID not approved in time | Dry-run mode; default sender; CSV export for manual bulk send; tickets don't depend on SMS |
| Weak data at venue | Light pages; screenshot tickets; phone-number search fallback |
| Fake/spam sign-ups | Honeypot, rate limits, unique phone, capacity cap |
| Staff account takeover or a stranger signing up | Invite code tied to one email, single-use, 7-day expiry, hashed; password 10+ characters; failed-login limit; `staff` row checked on every call; disable cuts sessions |
| Convex Auth is newer and its API changes | Builder follows current docs, pins the package version, reports any difference; if invite-code sign-up is not working after 30 minutes, switch to fallback D2b (admin-created accounts with a temporary password); STOP only if the fallback also fails |
| No email means no self-service password reset | Admin reset in Settings; at least TWO admins exist before event day |
| Every push to `main` redeploys production (and runs `convex deploy`) while people register | Work on `dev`; merge to `main` only at a gate after a green build; additive schema changes only (§0.5) |
| Late features break a working system | Feature freeze Friday 6 PM (§0.6); bug fixes only after |
| First live data goes out untested | Gate A is a mandatory pause with a 5-minute phone test by the Owner (§0.4 item 1) |
| Invite-code sign-up hook may not work with the current Convex Auth version | 30-minute time-box, then fallback D2b |
| Wrong Convex deployment (dev vs prod) | Builder states which deployment each command targets; seed prod explicitly with `--prod` |

## 17. Open questions for the Owner
- Real capacity of SGS Auditorium?
- Open to all genders or women only?
- Who gets admin vs check-in accounts (emails)?
- Approved SMS sender ID name?
- Staff sign-up: is the invite-code method OK, or do you want anyone to sign up and wait for admin approval? (Default: invite code, it is safer.)
- Who are the 2 admins (emails) and the ushers (emails)?
- (v2.3) Is the Antigravity terminal setting on auto-run, and is the strongest model selected? (§0.7)

## 18. System flow (for any AI that cannot see the diagrams)

```
ATTENDEE (phone, no account)
  Share link / flyer -> Landing page (/) -> /register
     -> Convex mutation registrations.register
          [validate -> normalise phone -> honeypot + rate limit -> capacity check (one transaction)]
          -> status = registered | waitlisted   (duplicate phone -> "already registered" + SMS link if enabled)
     -> /ticket/WES-XXXXXX (QR = ticket code only, .ics, WhatsApp share)
     -> (optional, toggle) confirmation SMS via Arkesel

STAFF (invited only)
  Admin creates invite (email + role) -> 8-char code shown once
  -> person opens /sign-up (name, same email, password 10+, code) -> Convex Auth checks hashed code + email
     -> users row + staff row + invite marked used, all in ONE transaction -> signed in
  -> role admin  -> /admin  (dashboard, attendees, export, SMS campaigns, settings/team, audit)
  -> role checkin -> /checkin (QR scan, phone search, walk-in, live counter)
  Every Convex function calls requireStaff (active staff row checked on EVERY call).

EVENT DAY:  scan QR at door -> checkin.byCode (idempotent) -> green / amber / red banner -> live counter
AFTER:      export CSV -> campaign "Thank-you" to checked-in, "Missed-you" to no-shows -> per-recipient log
```
