/* =========================================================
   ZEGON — Landing Page
   JS mínimo. Solo expone los puntos de enganche para que el
   equipo de backend conecte su propia lógica (wallet, routing
   al juego, etc). No hay lógica de negocio acá.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const playNowBtn = document.getElementById('play-now-btn');
  const connectWalletBtn = document.getElementById('connect-wallet-btn');

  // TODO (backend): reemplazar este handler por la navegación real
  // al duelo / loading screen del juego.
  playNowBtn?.addEventListener('click', () => {
    console.log('[ZEGON] play-now clicked — enganchar navegación al juego acá');
  });

  // TODO (backend): reemplazar este handler por el flujo real de
  // conexión de wallet (OG Wallet / lo que ya tengan resuelto).
  connectWalletBtn?.addEventListener('click', () => {
    console.log('[ZEGON] connect-wallet clicked — enganchar conexión de wallet acá');
  });
});
