# Summit CRM handoff

## Current state

The CRM work is on the local `dev` branch. It has not been pushed or deployed to Vercel or Convex production. Public registration and production attendee data were not changed by this work.

## Routes

- `/sign-in` — staff sign-in.
- `/sign-up` — one-time invited staff account setup.
- `/admin` — administrator dashboard.
- `/admin/attendees` — paginated attendee list, search, filters, record editing, cancellation, waitlist promotion, committee entry, and CSV export.
- `/admin/team` — invites, access enable/disable, password reset for another team member, and permanent account deletion. Deletion revokes login sessions and credentials; audit history remains. You cannot delete your own account or the last active administrator.
- `/admin/settings` — event details, open/close registration, optional capacity, and confirmation SMS toggle.
- `/admin/messages` — consent-filtered SMS campaigns and delivery log.
- `/admin/audit` — recent staff and data-change audit events.
- `/checkin` — QR scanner, phone/name/code lookup, check-in, walk-in registration, and attendance counts.

Check-in staff can access only `/checkin`. Admin-only operations also enforce the role in their Convex function; hiding a menu is not the security boundary.

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

The SMS API key belongs only in the Convex deployment secret `BULKSMSGH_API_KEY`; never add it to `.env.local`, Vercel client variables, or source control. Set `SMS_SENDER_ID` to `TEIN UCC`. The campaign UI stays disabled unless the server has the key and `SMS_DRY_RUN=false`. The backend rechecks those conditions before queueing a campaign. Campaign recipients must have opted in and not opted out. Confirmation SMS also requires attendee consent and the event setting to be enabled.

## Before production release

Keep production on its current code while the owner provides the first admin email and verifies the CRM on the dev deployment. Production release, bootstrap invite, and production SMS test have not been performed in this handoff.
