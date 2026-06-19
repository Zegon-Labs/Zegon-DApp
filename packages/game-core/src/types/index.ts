export enum PlayerAction {
  FIRE_HIGH = "FIRE_HIGH",
  FIRE_LOW = "FIRE_LOW",
  DODGE = "DODGE",
  FEINT = "FEINT",
  RELOAD = "RELOAD",
}

export enum ZegonAction {
  FIRE_HIGH = "FIRE_HIGH",
  FIRE_LOW = "FIRE_LOW",
  DODGE = "DODGE",
  FEINT = "FEINT",
  RELOAD = "RELOAD",
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
  blindsight: number;
  isDeadeye: boolean;
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
}

export interface RoundOutcome {
  playerAction: PlayerAction;
  zegonDecision: ZegonDecision;
  predictionCorrect: boolean;
  playerDamage: number;
  zegonDamage: number;
  blindsightDelta: number;
  blindsightAfter: number;
  deadeyeTriggered: boolean;
  deadeyeConsumed: boolean;
  ammoAfter: number;
  log: RoundLogEntry;
}

export interface DuelConfig {
  maxRounds: number;
  initialPlayerHp: number;
  initialZegonHp: number;
  weapon: WeaponId;
  seed?: string;
  mode: "standard" | "daily" | "challenge";
}

export interface DuelState {
  phase: DuelPhase;
  roundIndex: number;
  playerHp: number;
  zegonHp: number;
  weapon: WeaponId;
  ammo: number;
  blindsight: number;
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
  return action === PlayerAction.FIRE_HIGH || action === PlayerAction.FIRE_LOW;
}

export const ALL_PLAYER_ACTIONS: readonly PlayerAction[] = [
  PlayerAction.FIRE_HIGH,
  PlayerAction.FIRE_LOW,
  PlayerAction.DODGE,
  PlayerAction.FEINT,
  PlayerAction.RELOAD,
];

export const ALL_ZEGON_ACTIONS: readonly ZegonAction[] = [
  ZegonAction.FIRE_HIGH,
  ZegonAction.FIRE_LOW,
  ZegonAction.DODGE,
  ZegonAction.FEINT,
  ZegonAction.RELOAD,
];
