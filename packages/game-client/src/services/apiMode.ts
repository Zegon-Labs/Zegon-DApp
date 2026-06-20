function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  return /localhost|127\.0\.0\.1/.test(window.location.hostname);
}

/**
 * Use server API on deployed builds. On localhost, default to local dummy brain
 * unless VITE_LOCAL_API=true (requires `pnpm dev:server` on port 3000).
 */
export function shouldUseServerApi(): boolean {
  const flag = import.meta.env.VITE_USE_OG_COMPUTE;
  if (flag === "false") return false;
  if (isLocalhost()) {
    return import.meta.env.VITE_LOCAL_API === "true";
  }
  if (flag === "true") return true;
  return true;
}

export function apiBaseUrl(): string {
  return "";
}
