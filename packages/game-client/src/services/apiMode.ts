function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  return /localhost|127\.0\.0\.1/.test(window.location.hostname);
}

/**
 * Use server API when VITE_USE_OG_COMPUTE is enabled.
 * Vite proxies /api → localhost:3000 during `pnpm dev`.
 */
export function shouldUseServerApi(): boolean {
  const flag = import.meta.env.VITE_USE_OG_COMPUTE;
  if (flag === "false") return false;
  if (isLocalhost()) {
    return flag === "true" || import.meta.env.VITE_LOCAL_API === "true";
  }
  return true;
}

export function apiBaseUrl(): string {
  return "";
}
