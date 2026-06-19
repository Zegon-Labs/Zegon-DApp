export const ASSETS = {
  banner: "assets/banner.png",
  logo: "assets/logo_zegon.png",
  menuInicio: "assets/menu_inicio.png",
  duelNormal: "assets/normal.png",
  duelDamaged: "assets/danado.png",
  duelFire: "assets/disparo.png",
  duelYourTurn: "assets/tu_turno.png",
} as const;

export function coverImage(
  scene: Phaser.Scene,
  key: string,
  depth = 0,
): Phaser.GameObjects.Image {
  const { width, height } = scene.scale;
  const img = scene.add.image(width / 2, height / 2, key).setDepth(depth);
  const scale = Math.max(width / img.width, height / img.height);
  img.setScale(scale);
  return img;
}
