import { StaffGate } from "../../components/staff/StaffGate";
import { StaffShell } from "../../components/staff/StaffShell";

export default function CheckinLayout({ children }: { children: React.ReactNode }) {
  return <StaffGate allowCheckin><StaffShell>{children}</StaffShell></StaffGate>;
}
