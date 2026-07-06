import type { Language } from "../i18n/index.js";

const PLAYER_EN: Record<string, string> = {
  FIRE: "Shoot",
  DODGE: "Dodge",
  USE_ITEM: "Use item",
};

const PLAYER_ES: Record<string, string> = {
  FIRE: "Disparar",
  DODGE: "Esquivar",
  USE_ITEM: "Usar objeto",
};

const ZEGON_EN: Record<string, string> = {
  FIRE: "Shoot",
  DODGE: "Dodge",
};

const ZEGON_ES: Record<string, string> = {
  FIRE: "Disparar",
  DODGE: "Esquivar",
};

const ITEM_EN: Record<string, string> = {
  SMOKE: "Smoke",
  MIRROR: "Mirror",
  PLATE: "Plate",
};

const ITEM_ES: Record<string, string> = {
  SMOKE: "Humo",
  MIRROR: "Espejo",
  PLATE: "Placa",
};

export function formatPlayerActionLabel(
  action: string | undefined,
  lang: Language,
  itemUsed?: string,
): string {
  if (!action) return "—";
  const map = lang === "es" ? PLAYER_ES : PLAYER_EN;
  const base = map[action] ?? action;
  if (action === "USE_ITEM" && itemUsed) {
    const items = lang === "es" ? ITEM_ES : ITEM_EN;
    const item = items[itemUsed] ?? itemUsed;
    return `${base} (${item})`;
  }
  return base;
}

export function formatZegonActionLabel(
  action: string | undefined,
  lang: Language,
): string {
  if (!action) return "—";
  const map = lang === "es" ? ZEGON_ES : ZEGON_EN;
  return map[action] ?? action;
}
