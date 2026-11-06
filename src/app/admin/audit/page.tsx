"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function AuditPage() {
  const entries = useQuery(api.audit.recent);
  return <><div className="staff-page-heading"><div><p className="staff-kicker">ACCOUNTABILITY</p><h1>Activity log</h1><p>Recent staff and registration changes, exports, invitations and communication actions.</p></div></div><section className="staff-section"><div className="staff-table-wrap"><table className="staff-table"><thead><tr><th>Time</th><th>Staff member</th><th>Action</th><th>Record</th><th>Details</th></tr></thead><tbody>{entries?.map(entry => <tr key={entry._id}><td>{new Date(entry._creationTime).toLocaleString()}</td><td>{entry.actor}</td><td>{entry.action.replaceAll(".", " · ")}</td><td>{entry.target || "—"}</td><td>{entry.meta || "—"}</td></tr>)}</tbody></table>{entries?.length === 0 && <p className="staff-empty">No activity recorded yet.</p>}</div><p className="staff-privacy-note">Showing the latest 150 actions. The log does not include attendee contact details.</p></section></>;
}
