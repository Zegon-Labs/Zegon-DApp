import Phaser from "phaser";
import { C } from "../ui/theme.js";

export class BlankScene extends Phaser.Scene {
  constructor() {
    super("BlankScene");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C.void);
  }
}
