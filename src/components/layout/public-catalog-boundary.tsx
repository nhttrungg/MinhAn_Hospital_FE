import "server-only";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
const catalogs = [
  ["public-clinic", "/api/v1/public/clinic"],
  ["specialties", "/api/v1/specialties"],
  ["public-doctors", "/api/v1/doctors"],
] as const;
export async function PublicCatalogBoundary({ children }: { children: ReactNode }) {
  const cache = new QueryClient();
  await Promise.all(
    catalogs.map(([key, path]) =>
      cache.prefetchQuery({
        queryKey: [key],
        staleTime: 60_000,
        queryFn: async () => {
          const response = await fetch(
            `${process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8080"}${path}`,
            { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) },
          );
          if (!response.ok) throw new Error("Danh mục chưa sẵn sàng");
          return response.json();
        },
      }),
    ),
  );
  return <HydrationBoundary state={dehydrate(cache)}>{children}</HydrationBoundary>;
}
