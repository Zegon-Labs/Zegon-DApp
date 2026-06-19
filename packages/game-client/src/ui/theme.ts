export const C = {
  void: 0x0a0911,
  ash: 0x14121c,
  smoke: 0x211e2e,
  fog: 0x3a3550,
  cyan: 0x2ee6d6,
  magenta: 0xff2e88,
  ember: 0xff4d2e,
  blood: 0xb3122b,
  verified: 0x4df07a,
  gold: 0xe8b23a,
  bone: 0xe6e1d3,
  dust: 0x9a93a8,
} as const;

export const COLORS = {
  void: C.void,
  ash: C.ash,
  smoke: C.smoke,
  fog: C.fog,
  cyan: "#2EE6D6",
  magenta: "#FF2E88",
  ember: "#FF4D2E",
  blood: "#B3122B",
  /** Color for clickable links (blood red — project identity). */
  link: "#B3122B",
  linkHover: "#FF4D2E",
  verified: "#4DF07A",
  gold: "#E8B23A",
  bone: "#E6E1D3",
  dust: "#9A93A8",
} as const;

export const FONT = "VT323, monospace";
