import type { ReactNode } from "react";
export function InfoItem({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="public-info-item">
      <span aria-hidden="true">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{children}</strong>
      </div>
    </div>
  );
}
