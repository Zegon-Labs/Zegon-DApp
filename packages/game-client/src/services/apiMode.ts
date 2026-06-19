/** Use server API when deployed (not localhost), unless explicitly overridden. */
export function shouldUseServerApi(): boolean {
  const flag = import.meta.env.VITE_USE_OG_COMPUTE;
  if (flag === "true") return true;
  if (flag === "false") return false;
  if (typeof window === "undefined") return false;
  return !/localhost|127\.0\.0\.1/.test(window.location.hostname);
}

export function apiBaseUrl(): string {
  return "";
}
