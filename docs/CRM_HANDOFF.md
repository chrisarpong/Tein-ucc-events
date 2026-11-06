# Summit CRM handoff

## Current state

The production baseline is on `main` at `fe85c9c`. The password recovery and phone-auth work is being prepared on local `dev` and has not been pushed or deployed. It does not change public attendee registrations or production data until it is deployed.

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

The existing staff records have no recovery phone until enrolled. Each existing staff member should sign in and verify a number at `/security` before SMS password recovery or phone sign-in is enabled for that account. If an account is locked out before enrollment, the deployment owner may use the internal `recovery:ownerEnrollRecoveryPhone` operation only after verifying the staff member's identity and phone ownership through a trusted channel. This internal owner operation is an audited recovery fallback.

For an emergency password reset when no administrator can sign in, a deployment owner can issue one temporary password through the internal backend action:

```sh
npx convex run recovery:ownerResetPassword '{"email":"OWNER_EMAIL"}' --prod
```

The action invalidates existing sessions, records an audit event, and returns the temporary password once. Share it through a private channel; the user signs in with the exact account email and then changes it at `/security`. Never paste the temporary password into this handoff or source control.

## First admin on the development deployment

The temporary first admin invite has been created on the **dev** deployment for `christiananietie10@gmail.com`. The one-time code was returned to the owner in chat and is not stored in this file or the repository. It expires seven days after creation. The staff account is not active until the invitee completes signup.

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

The BulkSMS Sender ID currently has this OTP URL saved: `https://teinucc.vercel.app/forgot-password`. The provider has placed the TEIN UCC Sender ID on hold while it reviews the URL. Once this release is live, verify that the URL opens the recovery page; do not submit the URL again because the provider dialog says it can only be set once.

## Before password recovery production release

Deploy the frontend and Convex functions as separate release steps. Configure `AUTH_RECOVERY_PEPPER` and the BulkSMS secrets on the correct Convex deployment, verify existing staff phones are enrolled, test signup and password recovery on dev, then test the OTP sender ID and 1-minute expiry on real phones. Only after the route is live should the owner set the one-time OTP URL in BulkSMS. The phone login provider resolves the verified phone on the server and never returns the associated staff email to the browser.
