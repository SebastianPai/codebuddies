type PublicEnvironment = {
  apiUrl: string;
  realtimeUrl: string;
};

function normalizeUrl(value: string | undefined): string {
  return value?.replace(/\/$/, "") ?? "";
}

export const env: PublicEnvironment = {
  apiUrl: normalizeUrl(process.env.NEXT_PUBLIC_API_URL),
  realtimeUrl: normalizeUrl(process.env.NEXT_PUBLIC_REALTIME_URL),
};

export function getApiUrl(): string {
  if (!env.apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL must be configured.");
  }

  return env.apiUrl;
}

export function getRealtimeUrl(): string {
  return env.realtimeUrl || getApiUrl();
}
