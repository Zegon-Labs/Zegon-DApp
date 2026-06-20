import Phaser from "phaser";
import { ALL_PLAYER_ACTIONS, PlayerAction } from "@zegon/game-core";
import { actionButtonWidth, DUEL_LAYOUT as L } from "../layout.js";
import { createHubActionButton, type HubActionButtonHandle } from "./hubButton.js";

export class ActionBar {
  private readonly buttons: HubActionButtonHandle[] = [];
  private readonly buttonContainers: Phaser.GameObjects.Container[] = [];
  private readonly actions: PlayerAction[];

  constructor(
    scene: Phaser.Scene,
    actions: PlayerAction[] = [...ALL_PLAYER_ACTIONS],
    labelFor: (action: PlayerAction) => string,
    onAction: (action: PlayerAction) => void,
    depth = 10,
    onActionHover?: (action: PlayerAction, hovering: boolean) => void,
  ) {
    this.actions = actions;
    const { width } = scene.scale;
    const btnW = actionButtonWidth(width, actions.length, L.actions.gap);
    const y = L.actions.y;
    const total = actions.length * btnW + (actions.length - 1) * L.actions.gap;
    let x = (width - total) / 2 + btnW / 2;

    actions.forEach((action) => {
      const btn = createHubActionButton(
        scene,
        x,
        y,
        btnW,
        L.actions.h,
        labelFor(action),
        () => onAction(action),
        depth,
        onActionHover ? (hovering) => onActionHover(action, hovering) : undefined,
        action,
      );
      btn.setEnabled(false);
      this.buttons.push(btn);
      this.buttonContainers.push(btn.container);
      x += btnW + L.actions.gap;
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
      btn.setEnabled(active);
      btn.resetHover();
    });
  }

  setDimmedAll(dimmed: boolean): void {
    this.buttons.forEach((btn) => btn.setDimmed(dimmed));
  }

  resetHoverAll(): void {
    this.buttons.forEach((btn) => btn.resetHover());
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
