# ZEGON — Landing (referencia de diseño)

**Landing en vivo:** [zegon-landing.vercel.app](https://zegon-landing.vercel.app) · **Juego:** [zegon-dapp.vercel.app](https://zegon-dapp.vercel.app)

La landing de referencia vive aquí. **La versión integrada al juego** está en:

- `packages/game-client/public/landing/` — assets (`bg.png`, `character.png`, `logo.png`)
- `packages/game-client/src/styles/hero.css` — estilos y animaciones
- `packages/game-client/src/components/HeroHub.tsx` — menú principal del juego

Abrir `index.html` en esta carpeta sigue sirviendo para revisar el diseño estático sin build.

## Integración

El hub del juego usa React + Phaser: la landing es la pantalla de inicio; el duelo/tutorial corren en canvas Phaser. Las notificaciones (wallet, ajustes) usan [Sileo](https://sileo.aaryan.design).
