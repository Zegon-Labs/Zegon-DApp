import Phaser from "phaser";
import { C } from "../ui/theme.js";

/** Empty scene while React hub/menus are visible. */
export class BlankScene extends Phaser.Scene {
  constructor() {
    super("BlankScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C.void);
  }
}
