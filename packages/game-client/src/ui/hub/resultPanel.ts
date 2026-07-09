import Phaser from "phaser";
import { COLORS, FONT, FONT_DISPLAY, C } from "../theme.js";
import { addHubLogo } from "./landingBackdrop.js";

export const UTILITY_TABLE_KEY = "utility-table";
export const BUTTON_STATES_KEY = "btn-states";

export function preloadResultPanelAssets(scene: Phaser.Scene): void {
  if (!scene.textures.exists(UTILITY_TABLE_KEY))
    scene.load.image(UTILITY_TABLE_KEY, "/sprites/utility_table.png");
  if (!scene.textures.exists(BUTTON_STATES_KEY))
    scene.load.spritesheet(BUTTON_STATES_KEY, "/sprites/button_states.png", {
      frameWidth: 991, frameHeight: 793,
    });
}

// ── Layout ──────────────────────────────────────────────────────────────────
const PANEL_W     = 520;
/** utility_table.png natural aspect — keeps the ornate frame proportional. */
const UTILITY_FRAME_ASPECT = 1086 / 1448;
const FRAME_MIN_H = Math.round(PANEL_W * UTILITY_FRAME_ASPECT);
// Clearance to land content inside the inner BLACK zone of utility_table.png,
// past the decorative silver border.
const INNER_PAD_H = 36;
const INNER_W     = PANEL_W - INNER_PAD_H * 2;   // 448

const BTN_H       = 32;
const BTN_GAP     = 4;
const BTN_W_FULL  = 300;
const BTN_W_HALF  = (BTN_W_FULL - BTN_GAP) / 2;

const PROGRESS_SLOT_H = 34;
const FOOTER_INNER_PAD = 12;
const STATUS_FOOTER_GAP = 10;

interface PanelLayoutProfile {
  innerPadT: number;
  innerPadB: number;
  logoGap: number;
  btnH: number;
  btnGap: number;
  btnFontSize: string;
  progressSlotH: number;
  statsPad: number;
  statsGap: number;
  winnerNamePx: string;
  sectionGap: number;
}

const LAYOUT_NORMAL: PanelLayoutProfile = {
  innerPadT: 58,
  innerPadB: 102,
  logoGap: 22,
  btnH: BTN_H,
  btnGap: BTN_GAP,
  btnFontSize: "10px",
  progressSlotH: PROGRESS_SLOT_H,
  statsPad: 12,
  statsGap: 4,
  winnerNamePx: "36px",
  sectionGap: 8,
};

const LAYOUT_COMPACT: PanelLayoutProfile = {
  innerPadT: 50,
  innerPadB: 96,
  logoGap: 16,
  btnH: 30,
  btnGap: 5,
  btnFontSize: "9px",
  progressSlotH: PROGRESS_SLOT_H,
  statsPad: 8,
  statsGap: 2,
  winnerNamePx: "30px",
  sectionGap: 6,
};

// ── Interfaces ───────────────────────────────────────────────────────────────
export interface HubResultPanelButton {
  label: string;
  primary?: boolean;
  onClick: () => void;
}

export interface HubResultPanelOptions {
  winnerLabel: string;
  winnerColor: string;
  winnerOutcome?: "player" | "zegon" | "draw";
  statsText: string;
  verifyPlaceholder?: string;
  walletHint?: string;
  buttons: HubResultPanelButton[];
}

export interface HubResultPanelHandle {
  container: Phaser.GameObjects.Container;
  verifyLabel: Phaser.GameObjects.Text;
  dailyLabel: Phaser.GameObjects.Text;
  setVerifyText: (text: string) => void;
  relayoutFooter: () => void;
  destroy: () => void;
}

function winnerBannerStyle(outcome: "player" | "zegon" | "draw"): {
  fontSize: string;
  color: string;
  letterSpacing: number;
} {
  switch (outcome) {
    case "player":
      return { fontSize: "42px", color: COLORS.verified, letterSpacing: 6 };
    case "zegon":
      return { fontSize: "38px", color: COLORS.ember, letterSpacing: 4 };
    default:
      return { fontSize: "36px", color: COLORS.gold, letterSpacing: 4 };
  }
}

function trimStatsForPanel(raw: string): string {
  const lines = raw.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("•")) break;
    if (/^(Cómo subir|Climb the ranking)/i.test(t)) break;
    out.push(line);
  }
  while (out.length && out[out.length - 1]?.trim() === "") out.pop();
  return out.join("\n");
}

function statLineStyle(line: string, compact = false): {
  color: string;
  fontSize: string;
  fontFamily: string;
  letterSpacing?: number;
} {
  const t = line.trim();
  const bodyPx = compact ? "13px" : "14px";
  const scorePx = compact ? "18px" : "20px";
  const titlePx = compact ? "11px" : "12px";
  if (t.startsWith("+")) {
    return { color: COLORS.verified, fontSize: bodyPx, fontFamily: FONT };
  }
  if (t.startsWith("-") || t.startsWith("−") || t.startsWith("–")) {
    return { color: COLORS.blood, fontSize: bodyPx, fontFamily: FONT };
  }
  if (/^(Total deducted|Total restado|Puntos restados)/i.test(t)) {
    return { color: COLORS.blood, fontSize: bodyPx, fontFamily: FONT_DISPLAY, letterSpacing: 1 };
  }
  if (/^(Puntuación|Score)\s*:/i.test(t)) {
    return { color: COLORS.gold, fontSize: scorePx, fontFamily: FONT_DISPLAY, letterSpacing: 2 };
  }
  if (/^(Desglose|Score breakdown)/i.test(t)) {
    return { color: COLORS.gold, fontSize: titlePx, fontFamily: FONT_DISPLAY, letterSpacing: 3 };
  }
  return { color: COLORS.bone, fontSize: bodyPx, fontFamily: FONT };
}

/** Breathing room before section-title / score lines inside the stats card. */
function extraGapBefore(line: string, compact: boolean): number {
  const t = line.trim();
  if (/^(Desglose|Score breakdown)/i.test(t)) return compact ? 9 : 12;
  if (/^(Puntuación|Score)\s*:/i.test(t)) return compact ? 6 : 9;
  if (/^(Total deducted|Total restado)/i.test(t)) return compact ? 4 : 6;
  return 0;
}

function measureStatsCard(
  scene: Phaser.Scene,
  statsShort: string,
  profile: PanelLayoutProfile,
  compact: boolean,
): number {
  const lines = statsShort.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return 0;
  let h = profile.statsPad * 2;
  for (const line of lines) {
    const style = statLineStyle(line, compact);
    const m = scene.add.text(0, 0, line.trim(), {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      letterSpacing: style.letterSpacing ?? 0,
      wordWrap: { width: INNER_W - 48 },
    });
    h += extraGapBefore(line, compact) + m.height + profile.statsGap;
    m.destroy();
  }
  return h - profile.statsGap;
}

function addStatsCard(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  y: number,
  statsShort: string,
  profile: PanelLayoutProfile,
  compact: boolean,
): number {
  const lines = statsShort.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return 0;

  const cardW = INNER_W - 20;
  const cardH = measureStatsCard(scene, statsShort, profile, compact);
  const cardTop = y;

  const bg = scene.add.graphics();
  // Recessed plate: darker fill with faint warm sheen at the top
  bg.fillStyle(C.void, 0.82);
  bg.fillRoundedRect(-cardW / 2, cardTop, cardW, cardH, 6);
  bg.fillStyle(C.blood, 0.05);
  bg.fillRoundedRect(-cardW / 2, cardTop, cardW, Math.min(26, cardH), 6);
  bg.lineStyle(1, C.fog, 0.4);
  bg.strokeRoundedRect(-cardW / 2, cardTop, cardW, cardH, 6);
  // Blood hairline across the top edge
  bg.lineStyle(1.5, C.blood, 0.8);
  bg.lineBetween(-cardW / 2 + 14, cardTop + 0.5, cardW / 2 - 14, cardTop + 0.5);
  // Gold corner ticks
  const tick = 7;
  bg.lineStyle(1, C.gold, 0.6);
  bg.lineBetween(-cardW / 2 + 5, cardTop + 5 + tick, -cardW / 2 + 5, cardTop + 5);
  bg.lineBetween(-cardW / 2 + 5, cardTop + 5, -cardW / 2 + 5 + tick, cardTop + 5);
  bg.lineBetween(cardW / 2 - 5 - tick, cardTop + 5, cardW / 2 - 5, cardTop + 5);
  bg.lineBetween(cardW / 2 - 5, cardTop + 5, cardW / 2 - 5, cardTop + 5 + tick);
  bg.lineBetween(-cardW / 2 + 5, cardTop + cardH - 5 - tick, -cardW / 2 + 5, cardTop + cardH - 5);
  bg.lineBetween(-cardW / 2 + 5, cardTop + cardH - 5, -cardW / 2 + 5 + tick, cardTop + cardH - 5);
  bg.lineBetween(cardW / 2 - 5 - tick, cardTop + cardH - 5, cardW / 2 - 5, cardTop + cardH - 5);
  bg.lineBetween(cardW / 2 - 5, cardTop + cardH - 5, cardW / 2 - 5, cardTop + cardH - 5 - tick);
  container.add(bg);

  let cy = cardTop + profile.statsPad;
  for (const line of lines) {
    const style = statLineStyle(line, compact);
    const isSectionTitle = /^(Desglose|Score breakdown)/i.test(line.trim());
    cy += extraGapBefore(line, compact);
    const txt = scene.add
      .text(0, cy, line.trim(), {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        color: style.color,
        letterSpacing: style.letterSpacing ?? 0,
        align: "center",
        wordWrap: { width: cardW - 24 },
      })
      .setOrigin(0.5, 0)
      .setResolution(2);
    container.add(txt);
    if (isSectionTitle) {
      // Gold dashes flanking the section title
      const halfW = txt.width / 2 + 10;
      const dash = 26;
      const ly = cy + txt.height / 2;
      const orn = scene.add.graphics();
      orn.lineStyle(1, C.gold, 0.4);
      orn.lineBetween(-halfW - dash, ly, -halfW, ly);
      orn.lineBetween(halfW, ly, halfW + dash, ly);
      orn.fillStyle(C.gold, 0.55);
      orn.fillCircle(-halfW - dash - 3, ly, 1.5);
      orn.fillCircle(halfW + dash + 3, ly, 1.5);
      container.add(orn);
    }
    cy += txt.height + profile.statsGap;
  }

  return cardH;
}

function layoutWinnerBanner(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  startY: number,
  label: string,
  outcome: "player" | "zegon" | "draw",
  profile: PanelLayoutProfile,
): { endY: number; bannerH: number } {
  const parts = label.trim().split(/\s+/);
  const twoLine =
    outcome === "zegon" &&
    parts.length >= 2 &&
    parts[parts.length - 1]?.toUpperCase() === "ZEGON";
  let y = startY;
  let contentH = 0;

  if (twoLine) {
    const lead = parts.slice(0, -1).join(" ");
    const name = parts[parts.length - 1]!;
    const leadText = scene.add
      .text(0, y, lead, {
        fontFamily: FONT_DISPLAY,
        fontSize: "16px",
        color: COLORS.dust,
        letterSpacing: 6,
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setResolution(2);
    container.add(leadText);
    // Faint dashes flanking the lead word ("GANA")
    const leadHalf = leadText.width / 2 + 12;
    const leadLy = y + leadText.height / 2;
    const leadOrn = scene.add.graphics();
    leadOrn.lineStyle(1, C.blood, 0.6);
    leadOrn.lineBetween(-leadHalf - 34, leadLy, -leadHalf, leadLy);
    leadOrn.lineBetween(leadHalf, leadLy, leadHalf + 34, leadLy);
    container.add(leadOrn);
    y += leadText.height + 4;
    contentH = y - startY;

    const nameText = scene.add
      .text(0, y, name, {
        fontFamily: FONT_DISPLAY,
        fontSize: profile.winnerNamePx,
        color: COLORS.ember,
        letterSpacing: 4,
        align: "center",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setResolution(2)
      .setStroke("#0a0911", 4)
      .setShadow(0, 2, "#000000", 10, true, true);
    container.add(nameText);
    contentH = y + nameText.height - startY;
  } else {
    const style = winnerBannerStyle(outcome);
    const banner = scene.add
      .text(0, y, label, {
        fontFamily: FONT_DISPLAY,
        fontSize: style.fontSize,
        color: style.color,
        letterSpacing: style.letterSpacing,
        align: "center",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setResolution(2)
      .setStroke("#0a0911", 4)
      .setShadow(0, 2, "#000000", 10, true, true);
    container.add(banner);
    contentH = banner.height;
  }

  // Ornamental divider: tapered lines meeting a center diamond
  const ruleY = startY + contentH + 10;
  const ruleW = Math.min(INNER_W - 80, 220);
  const rule = scene.add.graphics();
  const ruleColor = outcome === "player" ? C.verified : outcome === "draw" ? C.gold : C.ember;
  rule.lineStyle(1.5, ruleColor, 0.7);
  rule.lineBetween(-ruleW / 2, ruleY, -10, ruleY);
  rule.lineBetween(10, ruleY, ruleW / 2, ruleY);
  rule.lineStyle(1, ruleColor, 0.35);
  rule.lineBetween(-ruleW / 2 - 26, ruleY, -ruleW / 2, ruleY);
  rule.lineBetween(ruleW / 2, ruleY, ruleW / 2 + 26, ruleY);
  // Center diamond
  rule.fillStyle(ruleColor, 0.9);
  rule.beginPath();
  rule.moveTo(0, ruleY - 4);
  rule.lineTo(4, ruleY);
  rule.lineTo(0, ruleY + 4);
  rule.lineTo(-4, ruleY);
  rule.closePath();
  rule.fillPath();
  // End caps
  rule.fillStyle(ruleColor, 0.5);
  rule.fillCircle(-ruleW / 2 - 29, ruleY, 1.5);
  rule.fillCircle(ruleW / 2 + 29, ruleY, 1.5);
  container.add(rule);

  return { endY: ruleY + 16, bannerH: ruleY + 16 - startY };
}

function measureWinnerBanner(
  scene: Phaser.Scene,
  label: string,
  outcome: "player" | "zegon" | "draw",
  profile: PanelLayoutProfile,
): number {
  const parts = label.trim().split(/\s+/);
  const twoLine =
    outcome === "zegon" &&
    parts.length >= 2 &&
    parts[parts.length - 1]?.toUpperCase() === "ZEGON";
  let h = 0;
  if (twoLine) {
    const lead = parts.slice(0, -1).join(" ");
    const name = parts[parts.length - 1]!;
    const lm = scene.add.text(0, 0, lead, { fontFamily: FONT_DISPLAY, fontSize: "16px" });
    const nm = scene.add.text(0, 0, name, {
      fontFamily: FONT_DISPLAY,
      fontSize: profile.winnerNamePx,
      fontStyle: "bold",
    });
    h = lm.height + 4 + nm.height;
    lm.destroy();
    nm.destroy();
  } else {
    const style = winnerBannerStyle(outcome);
    const m = scene.add.text(0, 0, label, {
      fontFamily: FONT_DISPLAY,
      fontSize: style.fontSize,
      fontStyle: "bold",
    });
    h = m.height;
    m.destroy();
  }
  return h + 10 + 12;
}

function measureButtonBlock(
  primaryCount: number,
  secondaryCount: number,
  profile: PanelLayoutProfile,
): number {
  let h = primaryCount * (profile.btnH + profile.btnGap);
  h += Math.ceil(secondaryCount / 2) * (profile.btnH + profile.btnGap);
  return h;
}

function measurePanelContent(
  scene: Phaser.Scene,
  options: HubResultPanelOptions,
  profile: PanelLayoutProfile,
  compact: boolean,
): number {
  const outcome = options.winnerOutcome ?? "zegon";
  const statsShort = trimStatsForPanel(options.statsText);
  const statsH = measureStatsCard(scene, statsShort, profile, compact);
  const winnerH = measureWinnerBanner(scene, options.winnerLabel, outcome, profile);

  let walletHintH = 0;
  if (options.walletHint) {
    const hm = scene.add.text(0, 0, options.walletHint, {
      fontFamily: FONT, fontSize: "12px", align: "center",
      wordWrap: { width: INNER_W - 20 },
    });
    walletHintH = hm.height;
    hm.destroy();
  }

  const verifySample = `${options.verifyPlaceholder ?? "…"}\n0/0`;
  const verifyMeasure = scene.add.text(0, 0, verifySample, {
    fontFamily: FONT_DISPLAY,
    fontSize: "10px",
    align: "center",
    wordWrap: { width: INNER_W - 20 },
    lineSpacing: 2,
    letterSpacing: 1,
  });
  const verifyH = verifyMeasure.height;
  verifyMeasure.destroy();

  const primaryBtns = options.buttons.filter((b) => b.primary);
  const secondaryBtns = options.buttons.filter((b) => !b.primary);
  const btnBlockH = measureButtonBlock(primaryBtns.length, secondaryBtns.length, profile);

  const LOGO_H = 20;
  let h = profile.innerPadT;
  h += LOGO_H + profile.logoGap;
  h += winnerH + profile.sectionGap;
  h += statsH + profile.sectionGap;
  if (options.walletHint) h += walletHintH + profile.sectionGap;
  h += verifyH + 8;
  h += profile.progressSlotH + STATUS_FOOTER_GAP;
  h += btnBlockH + FOOTER_INNER_PAD * 2;
  h += profile.innerPadB;
  return h;
}

function pickLayoutProfile(
  scene: Phaser.Scene,
  options: HubResultPanelOptions,
): { profile: PanelLayoutProfile; compact: boolean } {
  const maxPanelH = scene.scale.height - 24;
  const btnCount = options.buttons.length;
  const preferCompact = btnCount >= 5;
  const normalH = measurePanelContent(scene, options, LAYOUT_NORMAL, false);
  if (!preferCompact && normalH <= maxPanelH) {
    return { profile: LAYOUT_NORMAL, compact: false };
  }
  const compactH = measurePanelContent(scene, options, LAYOUT_COMPACT, true);
  if (compactH <= maxPanelH) {
    return { profile: LAYOUT_COMPACT, compact: true };
  }
  return { profile: LAYOUT_COMPACT, compact: true };
}

function addButtonFooter(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  topY: number,
  blockH: number,
): void {
  const footerW = INNER_W - 8;
  const footerH = blockH + FOOTER_INNER_PAD * 2;
  const g = scene.add.graphics();
  g.fillStyle(C.void, 0.78);
  g.fillRoundedRect(-footerW / 2, topY, footerW, footerH, 5);
  g.lineStyle(1, C.blood, 0.55);
  g.strokeRoundedRect(-footerW / 2 + 0.5, topY + 0.5, footerW - 1, footerH - 1, 5);
  g.lineStyle(1, C.gold, 0.35);
  g.lineBetween(-footerW / 2 + 12, topY + 1, footerW / 2 - 12, topY + 1);
  container.add(g);
}

// ── Button helper ────────────────────────────────────────────────────────────
// Drawn plate buttons — the button_states sprite squashes badly at 380×40,
// so we render crisp blood-themed plates that match the rest of the HUD.
function drawBtnPlate(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  isPrimary: boolean,
  hover: boolean,
): void {
  const left = x - w / 2;
  const top = y - h / 2;
  g.clear();

  // Base plate
  g.fillStyle(C.void, 0.92);
  g.fillRoundedRect(left, top, w, h, 4);
  // Accent wash
  if (isPrimary) {
    g.fillStyle(C.blood, hover ? 0.34 : 0.22);
    g.fillRoundedRect(left, top, w, h, 4);
  } else if (hover) {
    g.fillStyle(C.blood, 0.14);
    g.fillRoundedRect(left, top, w, h, 4);
  }
  // Top-lit sheen
  g.fillStyle(0xffffff, 0.03);
  g.fillRoundedRect(left, top, w, h / 2, 4);

  // Border
  if (isPrimary) {
    g.lineStyle(1.5, hover ? C.ember : C.blood, hover ? 1 : 0.9);
  } else {
    g.lineStyle(1, hover ? C.blood : C.fog, hover ? 0.9 : 0.7);
  }
  g.strokeRoundedRect(left + 0.5, top + 0.5, w - 1, h - 1, 4);

  // Side accent notches
  const notchColor = isPrimary ? C.ember : C.blood;
  g.fillStyle(notchColor, hover ? 0.95 : 0.65);
  g.fillRect(left, y - 5, 2, 10);
  g.fillRect(left + w - 2, y - 5, 2, 10);

  // Gold corner ticks on primary
  if (isPrimary) {
    const tk = 5;
    g.lineStyle(1, C.gold, hover ? 0.9 : 0.6);
    g.lineBetween(left + 3, top + 3 + tk, left + 3, top + 3);
    g.lineBetween(left + 3, top + 3, left + 3 + tk, top + 3);
    g.lineBetween(left + w - 3 - tk, top + 3, left + w - 3, top + 3);
    g.lineBetween(left + w - 3, top + 3, left + w - 3, top + 3 + tk);
    g.lineBetween(left + 3, top + h - 3 - tk, left + 3, top + h - 3);
    g.lineBetween(left + 3, top + h - 3, left + 3 + tk, top + h - 3);
    g.lineBetween(left + w - 3 - tk, top + h - 3, left + w - 3, top + h - 3);
    g.lineBetween(left + w - 3, top + h - 3, left + w - 3, top + h - 3 - tk);
  }
}

function addSpriteBtn(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  w: number,
  profile: PanelLayoutProfile,
  isPrimary = false,
): void {
  const btnH = profile.btnH - 4;

  const plate = scene.add.graphics();
  drawBtnPlate(plate, x, y, w, btnH, isPrimary, false);
  container.add(plate);

  const lbl = scene.add
    .text(x, y, label.toUpperCase(), {
      fontFamily: FONT_DISPLAY,
      fontSize: profile.btnFontSize,
      color: isPrimary ? COLORS.ember : COLORS.bone,
      letterSpacing: 2,
      align: "center",
      wordWrap: { width: w - 24 },
    })
    .setOrigin(0.5, 0.5)
    .setResolution(2);
  container.add(lbl);

  const hit = scene.add
    .rectangle(x, y, w, btnH, 0x000000, 0)
    .setInteractive({ useHandCursor: true });
  hit
    .on("pointerover", () => {
      drawBtnPlate(plate, x, y, w, btnH, isPrimary, true);
      lbl.setColor(isPrimary ? COLORS.gold : COLORS.ember);
    })
    .on("pointerout", () => {
      drawBtnPlate(plate, x, y, w, btnH, isPrimary, false);
      lbl.setColor(isPrimary ? COLORS.ember : COLORS.bone);
      lbl.setScale(1);
    })
    .on("pointerdown", () => {
      lbl.setScale(0.96);
    })
    .on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.wasTouch && pointer.button !== 0) return;
      lbl.setScale(1);
      onClick();
    });
  container.add(hit);
}

// ── Factory ──────────────────────────────────────────────────────────────────
export function createHubResultPanel(
  scene: Phaser.Scene,
  centerX: number,
  centerY: number,
  options: HubResultPanelOptions,
): HubResultPanelHandle {
  const outcome = options.winnerOutcome ?? "zegon";
  const statsShort = trimStatsForPanel(options.statsText);
  const { profile, compact } = pickLayoutProfile(scene, options);

  const contentH = measurePanelContent(scene, options, profile, compact);
  const maxPanelH = scene.scale.height - 24;
  const panelH = Math.max(contentH, FRAME_MIN_H);
  const panelScale = panelH > maxPanelH ? maxPanelH / panelH : 1;

  const primaryBtns   = options.buttons.filter((b) =>  b.primary);
  const secondaryBtns = options.buttons.filter((b) => !b.primary);

  let walletHintH = 0;
  if (options.walletHint) {
    const hm = scene.add.text(0, 0, options.walletHint, {
      fontFamily: FONT, fontSize: "12px", align: "center",
      wordWrap: { width: INNER_W - 20 },
    });
    walletHintH = hm.height;
    hm.destroy();
  }

  const LOGO_H = 20;
  const topY   = -panelH / 2;

  const container = scene.add.container(centerX, centerY).setDepth(10);
  if (panelScale < 1) {
    container.setScale(panelScale);
  }

  if (scene.textures.exists(UTILITY_TABLE_KEY)) {
    container.add(
      scene.add
        .image(0, 0, UTILITY_TABLE_KEY)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(PANEL_W, panelH),
    );
  }

  let y = topY + profile.innerPadT;

  container.add(addHubLogo(scene, 0, y, 100, 11));
  y += LOGO_H + profile.logoGap;

  const bannerLayout = layoutWinnerBanner(
    scene,
    container,
    y,
    options.winnerLabel,
    outcome,
    profile,
  );
  y = bannerLayout.endY;

  const cardH = addStatsCard(scene, container, y, statsShort, profile, compact);
  y += cardH + profile.sectionGap;

  // Wallet hint
  if (options.walletHint) {
    container.add(
      scene.add
        .text(0, y + walletHintH / 2, options.walletHint, {
          fontFamily: FONT,
          fontSize: "13px",
          color: COLORS.ember,
          align: "center",
          wordWrap: { width: INNER_W - 20 },
        })
        .setOrigin(0.5, 0.5)
        .setResolution(2),
    );
    y += walletHintH + profile.sectionGap;
  }

  const verifyLabel = scene.add
    .text(0, y, options.verifyPlaceholder ?? "…", {
      fontFamily: FONT_DISPLAY,
      fontSize: "10px",
      color: COLORS.ember,
      align: "center",
      wordWrap: { width: INNER_W - 20 },
      lineSpacing: 2,
      letterSpacing: 1,
    })
    .setOrigin(0.5, 0)
    .setResolution(2);
  container.add(verifyLabel);
  y += verifyLabel.height + 8;

  const statusSlotTop = y;
  const dailyLabel = scene.add
    .text(0, statusSlotTop + profile.progressSlotH / 2, "", {
      fontFamily: FONT,
      fontSize: compact ? "11px" : "12px",
      color: COLORS.gold,
      align: "center",
      wordWrap: { width: INNER_W - 24 },
      lineSpacing: 3,
    })
    .setOrigin(0.5, 0.5)
    .setAlpha(0)
    .setResolution(2);
  container.add(dailyLabel);
  y += profile.progressSlotH + STATUS_FOOTER_GAP;

  const btnBlockH = measureButtonBlock(primaryBtns.length, secondaryBtns.length, profile);
  addButtonFooter(scene, container, y, btnBlockH);
  y += FOOTER_INNER_PAD;

  const btnHalfGap = profile.btnGap / 2;
  for (const btn of primaryBtns) {
    addSpriteBtn(scene, container, 0, y + profile.btnH / 2, btn.label, btn.onClick, BTN_W_FULL, profile, true);
    y += profile.btnH + profile.btnGap;
  }

  for (let i = 0; i < secondaryBtns.length; i += 2) {
    const left  = secondaryBtns[i]!;
    const right = secondaryBtns[i + 1];
    const cy    = y + profile.btnH / 2;
    if (right) {
      addSpriteBtn(scene, container, -(BTN_W_HALF / 2 + btnHalfGap), cy, left.label,  left.onClick,  BTN_W_HALF, profile);
      addSpriteBtn(scene, container,  (BTN_W_HALF / 2 + btnHalfGap), cy, right.label, right.onClick, BTN_W_HALF, profile);
    } else {
      addSpriteBtn(scene, container, 0, cy, left.label, left.onClick, BTN_W_FULL, profile);
    }
    y += profile.btnH + profile.btnGap;
  }

  const relayoutFooter = () => {
    dailyLabel.setY(statusSlotTop + profile.progressSlotH / 2);
  };

  return {
    container,
    verifyLabel,
    dailyLabel,
    setVerifyText: (text) => {
      verifyLabel.setText(text);
      relayoutFooter();
    },
    relayoutFooter,
    destroy: () => container.destroy(true),
  };
}
