import type { UpgradeId } from "@zegon/game-core";

export type TreeNodeId = UpgradeId | "root";

export type TreeBranch = "offense" | "defense" | "capstone";

export interface TreeNodeDef {
  id: TreeNodeId;
  x: number;
  y: number;
  connectsFrom: TreeNodeId[];
  branch?: TreeBranch;
  icon: string;
}

export const SALOON_TREE_WIDTH = 820;
export const SALOON_TREE_HEIGHT = 520;

/** Permanent upgrades only — consumables live in the Satchel tab. */
export const SALOON_TREE_NODES: TreeNodeDef[] = [
  { id: "root", x: 410, y: 44, connectsFrom: [], icon: "◎" },
  {
    id: "fine_lead",
    x: 190,
    y: 150,
    connectsFrom: ["root"],
    branch: "offense",
    icon: "●",
  },
  {
    id: "hardened_leather",
    x: 630,
    y: 150,
    connectsFrom: ["root"],
    branch: "defense",
    icon: "◆",
  },
  {
    id: "instinct",
    x: 190,
    y: 290,
    connectsFrom: ["fine_lead"],
    branch: "offense",
    icon: "◉",
  },
  {
    id: "quick_hands",
    x: 630,
    y: 290,
    connectsFrom: ["hardened_leather"],
    branch: "defense",
    icon: "✦",
  },
  {
    id: "extra_powder",
    x: 410,
    y: 420,
    connectsFrom: ["instinct", "quick_hands"],
    branch: "capstone",
    icon: "✸",
  },
];

export const BRANCH_LABELS: Record<TreeBranch, { en: string; es: string }> = {
  offense: { en: "Offense path", es: "Rama ofensiva" },
  defense: { en: "Defense path", es: "Rama defensiva" },
  capstone: { en: "Capstone", es: "Tope del árbol" },
};

export type BranchLabelAlign = "left" | "center" | "right";

export interface BranchLabelDef {
  branch: TreeBranch;
  x: number;
  y: number;
  align: BranchLabelAlign;
}

/** Positions sit above each branch column, clear of node spheres. */
export const BRANCH_LABEL_POSITIONS: BranchLabelDef[] = [
  { branch: "offense", x: 190, y: 88, align: "center" },
  { branch: "defense", x: 630, y: 88, align: "center" },
  { branch: "capstone", x: 410, y: 352, align: "center" },
];

export function nodeById(id: TreeNodeId): TreeNodeDef | undefined {
  return SALOON_TREE_NODES.find((n) => n.id === id);
}

export function treeConnections(): Array<{ from: TreeNodeDef; to: TreeNodeDef }> {
  const out: Array<{ from: TreeNodeDef; to: TreeNodeDef }> = [];
  for (const node of SALOON_TREE_NODES) {
    for (const parentId of node.connectsFrom) {
      const from = nodeById(parentId);
      if (from) out.push({ from, to: node });
    }
  }
  return out;
}

export const SALOON_POPOVER_WIDTH = 280;
/** Estimate for viewport clamping — popover grows to fit content. */
export const SALOON_POPOVER_EST_HEIGHT = 220;

export type PopoverPlacement = "right" | "left" | "below" | "above";

export interface PopoverPosition {
  left: number;
  top: number;
  placement: PopoverPlacement;
  anchorX: number;
  anchorY: number;
}

function preferredPlacement(node: TreeNodeDef, treeW: number): PopoverPlacement {
  if (node.id === "root") return "right";
  if (node.branch === "capstone") return "below";
  if (node.x < treeW / 2 - 20) return "right";
  if (node.x > treeW / 2 + 20) return "left";
  return "below";
}

function coordsForPlacement(
  placement: PopoverPlacement,
  node: TreeNodeDef,
  nodeR: number,
  gap: number,
  popW: number,
  popH: number,
): { left: number; top: number } {
  switch (placement) {
    case "right":
      return { left: node.x + nodeR + gap, top: node.y - popH * 0.35 };
    case "left":
      return { left: node.x - nodeR - gap - popW, top: node.y - popH * 0.35 };
    case "below":
      return { left: node.x - popW / 2, top: node.y + nodeR + gap };
    case "above":
      return { left: node.x - popW / 2, top: node.y - nodeR - gap - popH };
  }
}

function fitsInTree(
  left: number,
  top: number,
  popW: number,
  popH: number,
  treeW: number,
  treeH: number,
  pad: number,
): boolean {
  return (
    left >= pad &&
    top >= pad &&
    left + popW <= treeW - pad &&
    top + popH <= treeH - pad
  );
}

const PLACEMENT_FLIP: Record<PopoverPlacement, PopoverPlacement> = {
  right: "left",
  left: "right",
  below: "above",
  above: "below",
};

export function popoverPosition(
  node: TreeNodeDef,
  treeW = SALOON_TREE_WIDTH,
  treeH = SALOON_TREE_HEIGHT,
): PopoverPosition {
  const isRoot = node.id === "root";
  const nodeR = isRoot ? 42 : 36;
  const gap = 14;
  const popW = SALOON_POPOVER_WIDTH;
  const popH = SALOON_POPOVER_EST_HEIGHT;
  const pad = 12;

  let placement = preferredPlacement(node, treeW);
  let { left, top } = coordsForPlacement(placement, node, nodeR, gap, popW, popH);

  if (!fitsInTree(left, top, popW, popH, treeW, treeH, pad)) {
    const flipped = PLACEMENT_FLIP[placement];
    const flippedCoords = coordsForPlacement(flipped, node, nodeR, gap, popW, popH);
    if (fitsInTree(flippedCoords.left, flippedCoords.top, popW, popH, treeW, treeH, pad)) {
      placement = flipped;
      left = flippedCoords.left;
      top = flippedCoords.top;
    }
  }

  left = Math.max(pad, Math.min(left, treeW - popW - pad));
  top = Math.max(pad, Math.min(top, treeH - popH - pad));

  return { left, top, placement, anchorX: node.x, anchorY: node.y };
}
