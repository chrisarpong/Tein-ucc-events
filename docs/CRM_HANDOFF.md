# Summit CRM handoff

## Current state

Phone login, SMS password recovery, account security, and the staff phone-verification flow are published on `main` and deployed to Convex production. The live recovery route is `https://teinucc.vercel.app/forgot-password`. The production event and attendee records were not changed by this release. The initial production administrator is now active with email/password sign-in; its recovery phone is not yet verified because the TEIN UCC sender ID is awaiting approval.

## Routes

- `/sign-in` — staff sign-in with email or a verified recovery phone, using the same password.
- `/sign-up` — one-time invited staff account setup; new staff verify a phone by SMS before account creation.
- `/forgot-password` — SMS code password recovery (8-digit code, 1-minute expiry, 4-minute resend cooldown).
- `/security` — signed-in staff can add or change their own recovery phone after SMS verification.
- `/admin` — administrator dashboard.
- `/admin/attendees` — paginated attendee list, search, filters, record editing, cancellation, waitlist promotion, committee entry, and CSV export.
- `/admin/team` — invites, access enable/disable, password reset for another team member, and permanent account deletion. Deletion revokes login sessions and credentials; audit history remains. You cannot delete your own account or the last active administrator.
- `/admin/settings` — event details, open/close registration, optional capacity, and confirmation SMS toggle.
- `/admin/messages` — consent-filtered SMS campaigns and delivery log.
- `/admin/audit` — recent staff and data-change audit events.
- `/checkin` — QR scanner, phone/name/code lookup, check-in, walk-in registration, and attendance counts.

Check-in staff can access `/checkin` and their own `/security` page. Admin-only operations also enforce the role in their Convex function; hiding a menu is not the security boundary.

Each staff member should sign in and verify a number at `/security` before SMS password recovery or phone sign-in is enabled for that account. If an account is locked out before enrollment, the deployment owner may use the internal `recovery:ownerEnrollRecoveryPhone` operation only after verifying the staff member's identity and phone ownership through a trusted channel. This internal owner operation is an audited recovery fallback.

For an emergency password reset when no administrator can sign in, a deployment owner can issue one temporary password through the internal backend action:

```sh
npx convex run recovery:ownerResetPassword '{"email":"OWNER_EMAIL"}' --prod
```

The action invalidates existing sessions, records an audit event, and returns the temporary password once. Share it through a private channel; the user signs in with the exact account email and then changes it at `/security`. Never paste the temporary password into this handoff or source control.

## First admin on the development deployment

The historical first admin invite was created on the **dev** deployment only. If SMS signup is not available yet and production has no staff accounts, a deployment owner can create the first production administrator with a one-time temporary password:

```sh
npx convex run recovery:ownerBootstrapFirstAdmin '{"email":"OWNER_EMAIL"}' --prod
```

This internal action only succeeds while production has no staff accounts. It returns a generated temporary password once, creates the first administrator without a recovery phone, and writes an audit event. Sign in with the invited email and temporary password, then change the password at `/security`. After SMS is approved, add and verify a recovery phone there. This bypass is only for the first account; all later staff signups still require a verified phone and invitation.

For a future reset/bootstrap only, the one-time invite command is:

```sh
npx convex run staff:createFirstInvite '{"email":"OWNER_EMAIL"}' --deployment dev --push
```

Keep the returned invite code private and send it to the matching email owner. It expires after seven days and is shown only once. The invitee then opens `/sign-up`, enters that email and code, and chooses a password of at least 10 characters. After signing in, use `/admin/team` to invite other staff.

Run local UI against the dev Convex deployment with:

```sh
npm run dev
```

Then open `http://localhost:3000/sign-in`.

## SMS setup

The SMS API key belongs only in the Convex deployment secret `BULKSMSGH_API_KEY`; never add it to `.env.local`, Vercel client variables, or source control. Set `SMS_SENDER_ID` to `TEIN UCC`; live delivery requires `SMS_DRY_RUN=false`. Authentication recovery codes use a dedicated SMS path and are not stored in the general message log. Set a long random `AUTH_RECOVERY_PEPPER` as a Convex secret on dev and production; it protects recovery code and grant verifiers at rest.

The BulkSMS Sender ID currently has this OTP URL saved: `https://teinucc.vercel.app/forgot-password`. The provider has placed the TEIN UCC Sender ID on hold while it reviews the URL. The route is now live and returns the recovery page. Do not submit the URL again because the provider dialog says it can only be set once. Recovery, phone verification, and live event messages depend on the provider approving the sender ID and delivery being configured.

## Remaining activation steps

The `AUTH_RECOVERY_PEPPER` secret is configured in Convex production. After the sender ID is approved, configure/check the BulkSMS API key, `SMS_SENDER_ID=TEIN UCC`, and `SMS_DRY_RUN=false` on the production Convex deployment. Then create the first production staff invite, verify it on a real phone, test password recovery and the one-minute code expiry, and confirm phone sign-in. The phone login provider resolves the verified phone on the server and never returns the associated staff email to the browser.
