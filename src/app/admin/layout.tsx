import { StaffGate } from "../../components/staff/StaffGate";
import { StaffShell } from "../../components/staff/StaffShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <StaffGate><StaffShell>{children}</StaffShell></StaffGate>;
}
