import Phaser from "phaser";
import { ALL_PLAYER_ACTIONS, PlayerAction } from "@zegon/game-core";
import { actionButtonWidth, DUEL_LAYOUT as L } from "../layout.js";
import { createHubActionButton, type HubActionButtonHandle } from "./hubButton.js";

export class ActionBar {
  private readonly buttons: HubActionButtonHandle[] = [];
  private readonly buttonContainers: Phaser.GameObjects.Container[] = [];
  private readonly actions: PlayerAction[];
  private readonly enabledSnapshot: boolean[] = [];

  constructor(
    scene: Phaser.Scene,
    actions: PlayerAction[] = [...ALL_PLAYER_ACTIONS],
    labelFor: (action: PlayerAction) => string,
    onAction: (action: PlayerAction) => void,
    depth = 10,
    onActionHover?: (action: PlayerAction, hovering: boolean) => void,
    layoutHint?: {
      /** Centre x of the first button; skips auto-centering when provided. */
      xFirst?: number;
      y?: number;
      btnW?: number;
      btnH?: number;
      gap?: number;
    },
  ) {
    this.actions = actions;
    const { width } = scene.scale;
    const gap = layoutHint?.gap ?? L.actions.gap;
    const btnW = layoutHint?.btnW ?? actionButtonWidth(width, actions.length, gap);
    const y = layoutHint?.y ?? L.actions.y;
    const total = actions.length * btnW + (actions.length - 1) * gap;
    let x = layoutHint?.xFirst ?? ((width - total) / 2 + btnW / 2);

    actions.forEach((action) => {
      const btn = createHubActionButton(
        scene,
        x,
        y,
        btnW,
        layoutHint?.btnH ?? L.actions.h,
        labelFor(action),
        () => onAction(action),
        depth,
        onActionHover ? (hovering) => onActionHover(action, hovering) : undefined,
        action,
      );
      btn.setEnabled(false);
      this.buttons.push(btn);
      this.enabledSnapshot.push(false);
      this.buttonContainers.push(btn.container);
      x += btnW + gap;
    });
  }

  /** Attach buttons to a parent layer (avoids nesting interactives inside another container). */
  addTo(parent: Phaser.GameObjects.Container): void {
    for (const container of this.buttonContainers) {
      parent.add(container);
    }
  }

  setEnabledMap(canAct: boolean, allowed: Set<PlayerAction>): void {
    this.buttons.forEach((btn, i) => {
      const action = this.actions[i]!;
      const active = canAct && allowed.has(action);
      if (this.enabledSnapshot[i] === active) return;
      this.enabledSnapshot[i] = active;
      btn.setEnabled(active);
    });
  }

  setDimmedAll(dimmed: boolean): void {
    this.buttons.forEach((btn) => btn.setDimmed(dimmed));
  }

  resetHoverAll(): void {
    this.buttons.forEach((btn) => btn.resetHover());
  }

  refreshLabels(labelFor: (action: PlayerAction) => string): void {
    this.buttons.forEach((btn, i) => {
      btn.setLabel(labelFor(this.actions[i]!));
    });
  }

  setVisible(visible: boolean): void {
    for (const container of this.buttonContainers) {
      container.setVisible(visible);
    }
  }

  destroy(): void {
    for (const container of this.buttonContainers) {
      container.destroy(true);
    }
    this.buttonContainers.length = 0;
    this.buttons.length = 0;
  }
}
