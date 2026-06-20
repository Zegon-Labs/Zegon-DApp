import { BLINDSIGHT, DEFAULT_DUEL_CONFIG } from "../constants/index.js";
import { DuelConfig, DuelModifiers, WeaponId } from "../types/index.js";
import { getDailySeed } from "./dailySeed.js";

export type ZegonArchetypeId = "reader" | "phantom" | "deadeye" | "gambler";

export interface ZegonArchetype {
  id: ZegonArchetypeId;
  seedSuffix: string;
  nameEn: string;
  nameEs: string;
  loreEn: string;
  loreEs: string;
  advantageEn: string;
  advantageEs: string;
  tradeoffEn: string;
  tradeoffEs: string;
  modifiers: DuelModifiers;
  initialPlayerHpDelta?: number;
}

const ARCHETYPES: Record<ZegonArchetypeId, ZegonArchetype> = {
  reader: {
    id: "reader",
    seedSuffix: "reader",
    nameEn: "The Reader",
    nameEs: "El Lector",
    loreEn: "Reads souls faster than most.",
    loreEs: "Lee almas más rápido que la mayoría.",
    advantageEn: "Blindsight rises faster (+18 on read)",
    advantageEs: "Ciego-vista sube más rápido (+18 al leerte)",
    tradeoffEn: "Starts with −10 HP",
    tradeoffEs: "Empieza con −10 PS",
    modifiers: { blindsightOnCorrect: 18 },
    initialPlayerHpDelta: -10,
  },
  phantom: {
    id: "phantom",
    seedSuffix: "phantom",
    nameEn: "The Phantom",
    nameEs: "El Fantasma",
    loreEn: "Slips through bullets like smoke.",
    loreEs: "Se escurre entre balas como humo.",
    advantageEn: "Dodges more often (+15% bias)",
    advantageEs: "Esquiva más seguido (+15% sesgo)",
    tradeoffEn: "ZEGON shots deal −15% damage",
    tradeoffEs: "Sus disparos hacen −15% daño",
    modifiers: { zegonDodgeBias: 0.15, zegonDamageMultiplier: 0.85 },
  },
  deadeye: {
    id: "deadeye",
    seedSuffix: "deadeye",
    nameEn: "The Deadeye",
    nameEs: "Ojo de Muerte",
    loreEn: "DEADEYE comes early and hard.",
    loreEs: "DEADEYE llega antes y fuerte.",
    advantageEn: "DEADEYE at 85% Blindsight",
    advantageEs: "DEADEYE al 85% ciego-vista",
    tradeoffEn: "Starts with +10 HP",
    tradeoffEs: "Empieza con +10 PS",
    modifiers: { deadeyeThreshold: 85 },
    initialPlayerHpDelta: 10,
  },
  gambler: {
    id: "gambler",
    seedSuffix: "gambler",
    nameEn: "The Gambler",
    nameEs: "El Apostador",
    loreEn: "Chaos is the only pattern.",
    loreEs: "El caos es el único patrón.",
    advantageEn: "Unpredictable counters",
    advantageEs: "Contraataques impredecibles",
    tradeoffEn: "Wild weapon rotation",
    tradeoffEs: "Rotación de armas errática",
    modifiers: { zegonDodgeBias: -0.1 },
  },
};

const ARCHETYPE_ORDER: ZegonArchetypeId[] = [
  "reader",
  "phantom",
  "deadeye",
  "gambler",
];

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getAllArchetypes(): ZegonArchetype[] {
  return ARCHETYPE_ORDER.map((id) => ARCHETYPES[id]);
}

export function getArchetype(id: ZegonArchetypeId): ZegonArchetype {
  return ARCHETYPES[id];
}

export function getDailyArchetype(date: Date = new Date()): ZegonArchetype {
  const seed = getDailySeed(date);
  const idx = hashString(seed) % ARCHETYPE_ORDER.length;
  return ARCHETYPES[ARCHETYPE_ORDER[idx]!]!;
}

export function applyArchetypeToConfig(
  config: DuelConfig,
  archetypeId: ZegonArchetypeId,
): DuelConfig {
  const arch = getArchetype(archetypeId);
  const playerHpDelta = arch.initialPlayerHpDelta ?? 0;
  return {
    ...config,
    seed: config.seed ? `${config.seed}-${arch.seedSuffix}` : arch.seedSuffix,
    archetype: archetypeId,
    modifiers: { ...arch.modifiers },
    initialPlayerHp: Math.max(50, config.initialPlayerHp + playerHpDelta),
  };
}

export function createStandardDuelWithArchetype(
  archetypeId: ZegonArchetypeId,
  overrides: Partial<DuelConfig> = {},
): DuelConfig {
  const base: DuelConfig = {
    ...DEFAULT_DUEL_CONFIG,
    mode: "standard",
    seed: "standard",
    ...overrides,
  };
  return applyArchetypeToConfig(base, archetypeId);
}

export function getEffectiveBlindsightOnCorrect(modifiers?: DuelModifiers): number {
  return modifiers?.blindsightOnCorrect ?? BLINDSIGHT.ON_CORRECT_PREDICT;
}

export function getEffectiveDeadeyeThreshold(modifiers?: DuelModifiers): number {
  return modifiers?.deadeyeThreshold ?? BLINDSIGHT.DEADEYE_THRESHOLD;
}

export function applyZegonDamageMultiplier(
  damage: number,
  modifiers?: DuelModifiers,
): number {
  const mult = modifiers?.zegonDamageMultiplier ?? 1;
  return Math.round(damage * mult);
}

const WEAPONS_ROTATION: WeaponId[] = [
  WeaponId.REVOLVER,
  WeaponId.SHOTGUN,
  WeaponId.DERRINGER,
  WeaponId.GLITCH_PISTOL,
];

export function getGamblerWeapon(seed: string, roundIndex: number): WeaponId {
  const h = hashString(`${seed}-gambler-${roundIndex}`);
  return WEAPONS_ROTATION[h % WEAPONS_ROTATION.length]!;
}
