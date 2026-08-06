import { apiFetch } from "@/shared/api/client";

export const fetcher = <T = any>(url: string, options?: RequestInit) =>
  apiFetch<T>(url, options);
