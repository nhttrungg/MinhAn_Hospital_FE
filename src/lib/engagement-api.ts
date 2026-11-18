import { api } from "./api";
import type { PatientReview, ReviewPage } from "./engagement-types";

// Review contracts use `items`; the shared PageResponse currently serializes `content`.
// Keep this compatibility local while the backend and shared types are integrated.
export async function reviewPage<T = PatientReview>(path: string): Promise<ReviewPage<T>> {
  const page = await api<Omit<ReviewPage<T>, "items"> & ({ items: T[] } | { content: T[] })>(path);
  return { ...page, items: "items" in page ? page.items : page.content };
}
