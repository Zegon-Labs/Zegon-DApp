# ZEGON — Landing (design reference)

**Live landing:** [zegon-landing.vercel.app](https://zegon-landing.vercel.app) · **Game:** [zegon-dapp.vercel.app](https://zegon-dapp.vercel.app)

The reference landing lives here. **The in-game integrated version** is at:

- `packages/game-client/public/landing/` — assets (`bg.png`, `character.png`, `logo.png`)
- `packages/game-client/src/styles/hero.css` — styles and animations
- `packages/game-client/src/components/HeroHub.tsx` — main game hub menu

Opening `index.html` in this folder still works to review the static design without a build.

## Integration

The game hub uses React + Phaser: the landing is the home screen; duel/tutorial run on the Phaser canvas. Notifications (wallet, settings) use [Sileo](https://sileo.aaryan.design).
