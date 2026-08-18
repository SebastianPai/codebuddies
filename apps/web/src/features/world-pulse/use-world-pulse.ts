import useSWR from "swr";
import { worldPulseApi, type WorldPulse } from "./api";

// El endpoint cachea 15s del lado del server (rankings.service.ts); pedir
// más seguido que eso solo agregaría requests sin datos más frescos.
const REFRESH_INTERVAL_MS = 20_000;

export function useWorldPulse() {
  const { data, isLoading, error } = useSWR<WorldPulse>("world-pulse", () => worldPulseApi.get(), {
    refreshInterval: REFRESH_INTERVAL_MS,
    revalidateOnFocus: false,
  });

  return { pulse: data, isLoading, error };
}
