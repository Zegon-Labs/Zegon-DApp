export type Language = "en" | "es";

export interface LocaleStrings {
  pageTitle: string;
  tagline: string;
  pressStart: string;
  duel: string;
  daily: string;
  settings: string;
  back: string;
  settingsTitle: string;
  language: string;
  languageEn: string;
  languageEs: string;
  saved: string;
  duelTitle: string;
  zegonReading: string;
  yourMove: string;
  deadeye: string;
  hudYou: string;
  hudZegon: string;
  hudHp: string;
  hudAmmo: string;
  hudBlindsight: string;
  actionFireHigh: string;
  actionFireLow: string;
  actionDodge: string;
  actionFeint: string;
  actionReload: string;
  youWin: string;
  zegonWins: string;
  draw: string;
  rounds: string;
  timesRead: string;
  finalBlindsight: string;
  score: string;
  verifyOnChain: string;
  share: string;
  copied: string;
  menu: string;
  shareText: string;
}

const LOCALES: Record<Language, LocaleStrings> = {
  en: {
    pageTitle: "ZEGON — Outdraw the Blind",
    tagline: "Outdraw the Blind",
    pressStart: "PRESS START",
    duel: "DUEL",
    daily: "DAILY",
    settings: "SETTINGS",
    back: "BACK",
    settingsTitle: "SETTINGS",
    language: "LANGUAGE",
    languageEn: "ENGLISH",
    languageEs: "SPANISH",
    saved: "SAVED",
    duelTitle: "DUEL",
    zegonReading: "ZEGON is reading you...",
    yourMove: "YOUR MOVE",
    deadeye: "DEADEYE!",
    hudYou: "YOU",
    hudZegon: "ZEGON",
    hudHp: "HP",
    hudAmmo: "AMMO",
    hudBlindsight: "BLINDSIGHT",
    actionFireHigh: "FIRE HIGH",
    actionFireLow: "FIRE LOW",
    actionDodge: "DODGE",
    actionFeint: "FEINT",
    actionReload: "RELOAD",
    youWin: "YOU WIN",
    zegonWins: "ZEGON WINS",
    draw: "DRAW",
    rounds: "Rounds",
    timesRead: "Times read",
    finalBlindsight: "Final Blindsight",
    score: "Score",
    verifyOnChain: "VERIFY ON-CHAIN",
    share: "SHARE",
    copied: "COPIED!",
    menu: "MENU",
    shareText:
      "I scored {score} against ZEGON. Times read: {timesRead}. Outdraw the blind.",
  },
  es: {
    pageTitle: "ZEGON — Supera al ciego",
    tagline: "Supera al ciego",
    pressStart: "PULSA INICIO",
    duel: "DUELO",
    daily: "DIARIO",
    settings: "AJUSTES",
    back: "VOLVER",
    settingsTitle: "AJUSTES",
    language: "IDIOMA",
    languageEn: "INGLÉS",
    languageEs: "ESPAÑOL",
    saved: "GUARDADO",
    duelTitle: "DUELO",
    zegonReading: "ZEGON te está leyendo...",
    yourMove: "TU JUGADA",
    deadeye: "¡OJO DE MUERTE!",
    hudYou: "TÚ",
    hudZegon: "ZEGON",
    hudHp: "PS",
    hudAmmo: "MUNICIÓN",
    hudBlindsight: "CIEGO-VISTA",
    actionFireHigh: "DISPARO ALTO",
    actionFireLow: "DISPARO BAJO",
    actionDodge: "ESQUIVAR",
    actionFeint: "FINTA",
    actionReload: "RECARGAR",
    youWin: "GANASTE",
    zegonWins: "GANA ZEGON",
    draw: "EMPATE",
    rounds: "Rondas",
    timesRead: "Veces leído",
    finalBlindsight: "Ciego-vista final",
    score: "Puntuación",
    verifyOnChain: "VERIFICAR EN CADENA",
    share: "COMPARTIR",
    copied: "¡COPIADO!",
    menu: "MENÚ",
    shareText:
      "Saqué {score} contra ZEGON. Me leyó {timesRead} veces. Supera al ciego.",
  },
};

const STORAGE_KEY = "zegon-language";

function detectBrowserLanguage(): Language {
  if (typeof navigator !== "undefined") {
    return navigator.language.startsWith("es") ? "es" : "en";
  }
  return "en";
}

function loadLanguage(): Language {
  if (typeof localStorage === "undefined") {
    return detectBrowserLanguage();
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "es") {
    return stored;
  }
  return detectBrowserLanguage();
}

let currentLanguage: Language = loadLanguage();

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, lang);
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
    document.title = LOCALES[lang].pageTitle;
  }
}

export function t(): LocaleStrings {
  return LOCALES[currentLanguage];
}

export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

// Apply on module load
setLanguage(currentLanguage);
