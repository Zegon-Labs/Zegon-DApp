/** Open a URL in a new tab while the user-gesture chain is still active. */
export function openExternalTab(
  url: string,
  target = "_blank",
  features = "noopener,noreferrer,width=550,height=420",
): boolean {
  try {
    const win = window.open(url, target, features);
    if (win) {
      win.focus();
      return true;
    }
  } catch {
    /* ignore */
  }

  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = target;
    anchor.rel = "noopener noreferrer";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return true;
  } catch {
    return false;
  }
}

/** Navigate an already-open tab after async work completes. */
export function navigateExternalTab(tabName: string, url: string): boolean {
  try {
    const win = window.open("", tabName);
    if (!win || win.closed) return false;
    win.location.href = url;
    win.focus();
    return true;
  } catch {
    return false;
  }
}
