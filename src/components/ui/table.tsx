import type { ComponentProps } from "react";

export function Table({ className = "", ...props }: ComponentProps<"table">) {
  return <table {...props} className={`at-table ${className}`} data-ui="table" />;
}
export function TableHeader(props: ComponentProps<"thead">) {
  return <thead {...props} />;
}
export function TableBody(props: ComponentProps<"tbody">) {
  return <tbody {...props} />;
}
export function TableRow(props: ComponentProps<"tr">) {
  return <tr {...props} />;
}
export function TableHead({ scope = "col", ...props }: ComponentProps<"th">) {
  return <th {...props} scope={scope} />;
}
export function TableCell(props: ComponentProps<"td">) {
  return <td {...props} />;
}
