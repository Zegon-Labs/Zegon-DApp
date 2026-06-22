import Phaser from "phaser";
import { BlindsightMeter } from "./blindsightMeter.js";
import { SideHudPanel } from "./sideHudPanel.js";

export interface CombatHudState {
  playerHp: number;
  zegonHp: number;
  playerMaxHp: number;
  zegonMaxHp: number;
  blindsight: number;
  readingStreak: number;
  deadeyeStreak: number;
  itemLabel: string;
  itemStatus: string;
  itemReady: boolean;
  itemCooldown: number;
  playerLabel: string;
  zegonLabel: string;
  hudItem: string;
  hudStatus: string;
  blindsightLabel: string;
  blindsightFlavor: string;
  nextMoveHint: string;
  zegonStatus?: string;
}

export interface CombatHudFighterLayout {
  /** Screen X of player panel left edge. */
  playerPanelX?: number;
  /** Screen Y of player panel top edge. */
  playerPanelY?: number;
  /** Screen X of zegon panel RIGHT edge (panel extends left from here). */
  zegonPanelX?: number;
  /** Screen Y of zegon panel top edge. */
  zegonPanelY?: number;
  /** Display height of both panels in screen pixels. */
  panelH?: number;
}

export interface CombatHudOpts {
  /** When true, skip creating the BlindsightMeter panel (streak lives in TopHudBar). */
  hideBlindsight?: boolean;
}

export class CombatHud {
  readonly container: Phaser.GameObjects.Container;
  private readonly playerPanel: SideHudPanel;
  private readonly zegonPanel: SideHudPanel;
  private readonly blindsightMeter: BlindsightMeter | null;

  constructor(
    scene: Phaser.Scene,
    depth = 9,
    fighterLayout?: CombatHudFighterLayout,
    opts?: CombatHudOpts,
  ) {
    this.container = scene.add.container(0, 0).setDepth(depth);

    const { width, height } = scene.scale;
    const panelH = fighterLayout?.panelH ?? 110;

    this.playerPanel = new SideHudPanel(scene, {
      side: "left",
      x: fighterLayout?.playerPanelX ?? 0,
      y: fighterLayout?.playerPanelY ?? height - panelH - 104,
      panelH,
      depth,
    });

    this.zegonPanel = new SideHudPanel(scene, {
      side: "right",
      x: fighterLayout?.zegonPanelX ?? width,
      y: fighterLayout?.zegonPanelY ?? 4,
      panelH,
      depth,
    });

    this.blindsightMeter = opts?.hideBlindsight ? null : new BlindsightMeter(scene, depth);
    if (this.blindsightMeter) {
      this.container.add([this.blindsightMeter.container]);
    }
  }

  update(state: CombatHudState): void {
    this.playerPanel.update(state.playerHp, state.playerMaxHp);
    this.zegonPanel.update(state.zegonHp, state.zegonMaxHp);
    this.blindsightMeter?.update(
      state.blindsightLabel,
      state.readingStreak,
      state.deadeyeStreak,
      state.blindsightFlavor,
      state.nextMoveHint,
      state.blindsight,
    );
  }

  playPlayerHit(previousHp: number, newHp: number, maxHp: number): void {
    this.playerPanel.playHit(previousHp, newHp, maxHp);
  }

  playZegonHit(previousHp: number, newHp: number, maxHp: number): void {
    this.zegonPanel.playHit(previousHp, newHp, maxHp);
  }

  refreshLocale(state: CombatHudState): void {
    this.update(state);
  }

  playerDamageAnchor(): { x: number; y: number } {
    return { x: this.playerPanel.hpBarCenterX(), y: this.playerPanel.hpBarCenterY() };
  }

  zegonDamageAnchor(): { x: number; y: number } {
    return { x: this.zegonPanel.hpBarCenterX(), y: this.zegonPanel.hpBarCenterY() };
  }

  destroy(): void {
    this.playerPanel.destroy();
    this.zegonPanel.destroy();
    this.blindsightMeter?.destroy();
    this.container.destroy(false);
  }
}
