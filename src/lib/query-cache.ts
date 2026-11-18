import type { QueryClient } from "@tanstack/react-query";
/** Refresh only the data families affected by an operation, including their child views. */
export function invalidateDataGroups(cache: QueryClient, groups: readonly string[]) {
  return cache.invalidateQueries({
    predicate: (query) => {
      const key = String(query.queryKey[0]);
      return groups.some(
        (group) => key === group || key === `${group}s` || key.startsWith(`${group}-`),
      );
    },
  });
}
