export enum PlayerAction {
  FIRE = "FIRE",
  DODGE = "DODGE",
  USE_ITEM = "USE_ITEM",
}

export enum ZegonAction {
  FIRE = "FIRE",
  DODGE = "DODGE",
}

export enum DuelItemId {
  SMOKE = "SMOKE",
  MIRROR = "MIRROR",
  PLATE = "PLATE",
}

export enum DuelPhase {
  IDLE = "IDLE",
  ZEGON_THINKING = "ZEGON_THINKING",
  AWAITING_PLAYER = "AWAITING_PLAYER",
  RESOLVING = "RESOLVING",
  ROUND_END = "ROUND_END",
  DEADEYE = "DEADEYE",
  DUEL_END = "DUEL_END",
}

export enum WeaponId {
  REVOLVER = "REVOLVER",
  SHOTGUN = "SHOTGUN",
  DERRINGER = "DERRINGER",
  GLITCH_PISTOL = "GLITCH_PISTOL",
}

export enum DuelWinner {
  PLAYER = "PLAYER",
  ZEGON = "ZEGON",
  DRAW = "DRAW",
}

export interface WeaponStats {
  damage: number;
  maxAmmo: number;
  drawSpeed: number;
  noiseFactor: number;
  reloadAmount: number;
}

export interface RoundContext {
  roundIndex: number;
  playerHistory: readonly PlayerAction[];
  playerHp: number;
  zegonHp: number;
  weapon: WeaponId;
  ammo: number;
  /** Legacy display value derived from reading streak. */
  blindsight: number;
  readingStreak: number;
  equippedItem: DuelItemId;
  itemCooldown: number;
  /** Max item cooldown for this duel (player upgrades). */
  itemCooldownRounds?: number;
  isDeadeye: boolean;
  modifiers?: DuelModifiers;
  archetype?: string;
  timesReadSoFar?: number;
  itemUsageCounts?: Partial<Record<DuelItemId, number>>;
  itemHistory?: readonly DuelItemId[];
}

export interface ZegonDecision {
  predictedPlayerMove: PlayerAction;
  zegonMove: ZegonAction;
  confidence: number;
  taunt: string;
}

export interface RoundReveal {
  zegonMove: ZegonAction;
  salt: string;
}

export interface RoundLogEntry {
  roundIndex: number;
  commitHash?: string;
  commitTimestamp?: number;
  playerActionTimestamp?: number;
  reveal?: RoundReveal;
  attestationHash?: string;
  inputHash?: string;
  playerAction: PlayerAction;
  zegonDecision: ZegonDecision;
  predictionCorrect: boolean;
  itemUsed?: DuelItemId;
}

export interface RoundOutcome {
  playerAction: PlayerAction;
  zegonDecision: ZegonDecision;
  predictionCorrect: boolean;
  playerDamage: number;
  zegonDamage: number;
  blindsightDelta: number;
  blindsightAfter: number;
  readingStreakAfter: number;
  deadeyeTriggered: boolean;
  deadeyeConsumed: boolean;
  /** DEADEYE was active entering this round. */
  wasDeadeye: boolean;
  /** DEADEYE remains after resolution (streak may be 0). */
  deadeyeStillActive: boolean;
  ammoAfter: number;
  itemCooldownAfter: number;
  itemUsed?: DuelItemId;
  log: RoundLogEntry;
}

export interface DuelModifiers {
  blindsightOnCorrect?: number;
  blindsightOnCorrectReduction?: number;
  deadeyeThreshold?: number;
  deadeyeStreak?: number;
  /** Extra consecutive reads required before DEADEYE (player upgrades). */
  deadeyeStreakBonus?: number;
  zegonDodgeBias?: number;
  zegonDamageMultiplier?: number;
  playerDamageMultiplier?: number;
}

export interface DuelConfig {
  maxRounds: number;
  initialPlayerHp: number;
  initialZegonHp: number;
  weapon: WeaponId;
  seed?: string;
  mode: "standard" | "daily" | "challenge";
  archetype?: string;
  modifiers?: DuelModifiers;
  startingAmmoBonus?: number;
  itemCooldownReduction?: number;
  /** Round limit before the rounds-won tie-break (default DUEL.MAX_ROUNDS_TIEBREAK). */
  tiebreakRounds?: number;
}

export interface DuelState {
  phase: DuelPhase;
  roundIndex: number;
  playerHp: number;
  zegonHp: number;
  weapon: WeaponId;
  ammo: number;
  blindsight: number;
  readingStreak: number;
  equippedItem: DuelItemId;
  itemCooldown: number;
  isDeadeye: boolean;
  playerHistory: readonly PlayerAction[];
  roundsWonByPlayer: number;
  roundsWonByZegon: number;
  pendingZegonDecision: ZegonDecision | null;
  roundLogs: readonly RoundLogEntry[];
  config: DuelConfig;
}

export interface DuelResult {
  winner: DuelWinner;
  roundsPlayed: number;
  roundsWonByPlayer: number;
  roundsWonByZegon: number;
  timesRead: number;
  finalBlindsight: number;
  finalReadingStreak: number;
  playerHp: number;
  zegonHp: number;
  roundLogs: readonly RoundLogEntry[];
  score: number;
}

export type DuelEventType =
  | "phaseChange"
  | "roundResolved"
  | "deadeye"
  | "duelEnd";

export interface DuelEvent {
  type: DuelEventType;
  state: DuelState;
  outcome?: RoundOutcome;
  result?: DuelResult;
}

export type DuelEventListener = (event: DuelEvent) => void;

export function isFireAction(action: PlayerAction | ZegonAction): boolean {
  return action === PlayerAction.FIRE || action === ZegonAction.FIRE;
}

export const ALL_PLAYER_ACTIONS: readonly PlayerAction[] = [
  PlayerAction.FIRE,
  PlayerAction.DODGE,
  PlayerAction.USE_ITEM,
];

export const ALL_ZEGON_ACTIONS: readonly ZegonAction[] = [
  ZegonAction.FIRE,
  ZegonAction.DODGE,
];

export const ALL_DUEL_ITEMS: readonly DuelItemId[] = [
  DuelItemId.SMOKE,
  DuelItemId.MIRROR,
  DuelItemId.PLATE,
];
