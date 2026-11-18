import "@/styles/shared/admin-catalog.css";
import "@/styles/screens/ops.css";
import "@/styles/screens/clinical.css";
import "@/styles/areas/staff.css";
import { StaffShell } from "@/components/layout/staff-shell";

export const metadata = { title: "Nhân viên" };

const staffThemeInitScript = `try{var t=localStorage.getItem("ma-staff-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){}`;

export default function StaffLayout({ children }: LayoutProps<"/staff">) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: staffThemeInitScript }} />
      <StaffShell>{children}</StaffShell>
    </>
  );
}
