"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryString } from "@/lib/api";
import type { PageResult } from "@/lib/types";
import type { CatalogInput, CatalogKind, CatalogRow } from "@/lib/catalog-types";
import { useDebouncedValue } from "./use-debounced-value";
import { useUser } from "@/components/workspace-ui";
import { useToast } from "@/components/ui/toast";
export function useCatalog(kind: CatalogKind) {
  const [q, setQuery] = useState("");
  const settledQ = useDebouncedValue(q);
  const me = useUser();
  function setQ(value: string) {
    setQuery(value);
    setPage(0);
  }
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [active, setActive] = useState("");
  const [busy, setBusy] = useState(false);
  const cache = useQueryClient();
  const toast = useToast();
  const endpoint = kind === "accounts" ? "/api/v1/staff-accounts" : `/api/v1/catalog/${kind}`;
  const query = useQuery({
    queryKey: ["catalog", kind, me.data?.id, settledQ, page, size, active],
    queryFn: ({ signal }) =>
      api<PageResult<CatalogRow>>(
        `${endpoint}${queryString({ q: settledQ, page, size, active: active || null })}`,
        { signal },
      ),
  });
  async function save(row: CatalogRow | null, input: CatalogInput) {
    setBusy(true);
    try {
      const data = await api<CatalogRow>(endpoint + (row ? `/${row.id}` : ""), {
        method: row ? "PUT" : "POST",
        body: JSON.stringify(input),
      });
      await cache.invalidateQueries({ queryKey: ["catalog", kind] });
      const related: Record<string, string[]> = {
        accounts: ["public-doctors", "doctors"],
        specialties: ["specialties", "public-doctors", "doctors"],
        services: ["public-doctors", "doctors", "slots"],
        departments: ["dashboard-summary"],
        rooms: ["slots", "dashboard-summary"],
      };
      await Promise.all(
        (related[kind] ?? []).map((key) => cache.invalidateQueries({ queryKey: [key] })),
      );
      toast(row ? "Đã lưu thay đổi." : "Đã tạo mới thành công.");
      return data;
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(row: CatalogRow) {
    const data = row;
    const input: CatalogInput = {
      ...data,
      description: data.description ?? undefined,
      phone: data.phone ?? "",
      unitPrice: data.unitPrice ?? undefined,
      specialtyId: data.specialtyId ?? undefined,
      bio: data.bio ?? "",
      photoUrl: data.photoUrl ?? "",
      gender: data.gender ?? "",
      role: data.roles?.[0],
      active: !row.active,
    };
    await save(row, input);
  }
  return {
    q,
    setQ,
    page,
    setPage,
    size,
    setSize,
    active,
    setActive,
    busy,
    query,
    save,
    changeStatus,
    endpoint,
    cache,
    toast,
  };
}
