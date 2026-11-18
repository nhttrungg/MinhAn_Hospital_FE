import type { ComponentProps, ReactNode } from "react";

export function Disclosure({
  title,
  children,
  ...props
}: Omit<ComponentProps<"details">, "title"> & { title: ReactNode }) {
  return (
    <details {...props} data-ui="disclosure">
      <summary>{title}</summary>
      {children}
    </details>
  );
}
