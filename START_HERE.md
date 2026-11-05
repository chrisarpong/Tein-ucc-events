# START HERE: Builder boot instructions (AUTONOMOUS MODE)

> **Owner (human):** put this file and `PRD.md` in the ROOT of the project folder `Women's Empowerment Summit`. Open the agent chat and send exactly this one line:
>
> `Read @START_HERE.md and follow it to the end.`
>
> The same line also RESUMES the project if you ever run out of tokens or change machines.

---

## You are the Builder agent for the TEIN-UCC Events project

This is a real production system. The event is **Saturday 7 November 2026, 9:00 AM**. Today is Thursday 5 November 2026. You work alone and **run until everything is built, deployed and self-reviewed**. You do not wait for approval, with ONE planned exception: **Gate A is a mandatory pause** (see below). After the Owner replies `GATE A PASSED` you run fully autonomously to the end.

### Do this, in order

1. **Read `PRD.md` completely**, top to bottom, before doing anything. It is in the same folder as this file. If it is missing, tell me and stop. It is the single source of truth: product, decisions, schema, security rules, autonomous protocol (§0.4), build tracker (§12) and session log (§13).
2. **Obey §0.2 and §0.4 of the PRD exactly.** Short version: never ask "shall I continue?", never wait at a GATE except Gate A (mandatory pause until the Owner replies `GATE A PASSED`), stop otherwise only for a TRUE BLOCKER. Obey §0.5 (work on branch `dev`, merge to `main` only at a gate after a green build) and §0.6 (feature freeze Friday 6 Nov, 6:00 PM: bug fixes only).
3. **Find your starting point.** If `.git` exists, run `git status` and `git log -5`, read the last Session Log entry and any Handoff note, quickly re-verify the last completed item, then continue from the FIRST `[ ]` box in §12. If this is a brand-new project, run `git init` and start at H1 / P0.1.
4. **Print ONE numbered list titled `DO THESE NOW (while I keep building)`** with exact steps and copy-paste commands for every open human task (H1 to H8). Include the OWNER PREP CHECKLIST from §0.7 in that list. Also save it in the HUMAN QUEUE in §13. Then **immediately start building** whatever does not depend on those tasks. Do not wait for me to finish them.
5. **Build phase by phase** through §12 in the order the tracker gives (P0, P1, P2, Gate A, P3A, Gate A2, **P4 check-in BEFORE P3 CRM**, Gate B, P3 Must, Gate B2, P5, Gate C, P3S Should, P6, Gate D). Items marked (Should) come last and are dropped first. Tick a box only after you have tested the item (`[x]`), or `[~]` if it still needs me on a real device. After every phase run `pnpm typecheck && pnpm lint && pnpm build`, fix failures, append a Session Log entry, and `git commit` on branch `dev` (include `PRD.md`). Create `dev` right after the first commit.
6. **At every GATE (A, A2, B, B2, C, D):** run the self-review from §0.4 item 5 (call the secured functions signed-out and with the wrong role and paste real output), print the REPORT block from §14, log it in §13, merge `dev` into `main` only if the build is green (§0.5), and **keep going**. **EXCEPTION: at Gate A, after the REPORT, print the Gate A checklist from §0.4 item 1 and STOP until I reply `GATE A PASSED`.**
7. **Stop only for a TRUE BLOCKER** (§0.4 item 2): print the REPORT with `Status: BLOCKED` and the exact steps I must do. Everything else (SMS sender not approved, logos missing, unanswered questions) uses the PRD defaults and gets logged as an assumption.
8. **Use current official docs** for Convex, Convex Auth, Arkesel and Next.js, not memory.
9. **If you run low on context or tokens**, immediately write a Handoff note in §13 (done, half-done, exact next command), commit, and tell me to resend the one-line message above.
10. **When every box in §12 is `[x]`, `[~]` or `[!]`** and the last `pnpm typecheck && pnpm lint && pnpm build` is clean and production is deployed, print the **FINAL REPORT** from §14, including my OWNER-VERIFY checklist with exact steps and live URLs. That is the only normal stopping point after Gate A.

### Environment facts you must respect

- Machine: MacBook Pro M4 Pro, Antigravity IDE, pnpm, Node 20+.
- The folder name is `Women's Empowerment Summit` (spaces and an apostrophe). **Quote every shell path.** Never use the folder name as the package name: use `tein-ucc-events` for package.json, GitHub and Convex.
- `create-next-app` may refuse this folder. If so, scaffold into a temp folder called `tein-ucc-events`, move the files up, and never delete `PRD.md` or `START_HERE.md`.
- Event name on the site is **Women Empowerment Summit** (as on the flyer).
- Auth fallback: if invite-code sign-up is not working after 30 minutes, use D2b (admin-created staff accounts with a temporary password shown once) and log it.
- No secrets in git. No Clerk anywhere. No email. SMS only (Arkesel, dry-run until the key exists).

### Your first message back to me must be

`DO THESE NOW (while I keep building)` list (step 4), followed by a one-line note saying which box you are starting at. Then start working.
