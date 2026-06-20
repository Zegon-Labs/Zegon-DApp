export type Language = "en" | "es";

export interface LocaleStrings {
  pageTitle: string;
  tagline: string;
  pressStart: string;
  duel: string;
  daily: string;
  settings: string;
  back: string;
  settingsTitle: string;
  language: string;
  languageEn: string;
  languageEs: string;
  saved: string;
  duelTitle: string;
  zegonReading: string;
  yourMove: string;
  deadeye: string;
  hudYou: string;
  hudZegon: string;
  hudHp: string;
  hudAmmo: string;
  hudBlindsight: string;
  actionFireHigh: string;
  actionFireLow: string;
  actionDodge: string;
  actionFeint: string;
  actionReload: string;
  actionDescFireHigh: string;
  actionDescFireLow: string;
  actionDescDodge: string;
  actionDescFeint: string;
  actionDescReload: string;
  zegonPlayed: string;
  youPlayed: string;
  zegonReadYou: string;
  actionTooltipHint: string;
  youWin: string;
  zegonWins: string;
  draw: string;
  rounds: string;
  timesRead: string;
  finalBlindsight: string;
  score: string;
  verifyOnChain: string;
  share: string;
  copied: string;
  menu: string;
  shareText: string;
  round: string;
  history: string;
  yourTurnPrompt: string;
  deadeyeNear: string;
  verifyOk: string;
  verifyPending: string;
  verifyOffline: string;
  verifyRounds: string;
  verifyOpenExplorer: string;
  roundSummaryRead: string;
  roundSummarySurprised: string;
  roundSummaryYouHit: string;
  roundSummaryZegonHit: string;
  roundSummaryNoDamage: string;
  roundSummaryDeadeyeOn: string;
  roundSummaryDeadeyeUsed: string;
  errorNoAmmo: string;
  tutorial: string;
  tutorialTitle: string;
  tutorialDoneBadge: string;
  tutorialIntro: string;
  tutorialHpTitle: string;
  tutorialHpBody: string;
  tutorialBlindsightTitle: string;
  tutorialBlindsightBody: string;
  tutorialDeadeyeTitle: string;
  tutorialDeadeyeBody: string;
  tutorialActionsTitle: string;
  tutorialActionsBody: string;
  tutorialAmmoTitle: string;
  tutorialAmmoBody: string;
  tutorialPracticeTitle: string;
  tutorialPracticeBody: string;
  tutorialVerifyTitle: string;
  tutorialVerifyBody: string;
  tutorialStepFire: string;
  tutorialStepDodge: string;
  tutorialStepRead: string;
  tutorialStepFeint: string;
  tutorialStepReload: string;
  tutorialStepDamage: string;
  tutorialStepDeadeye: string;
  tutorialComplete: string;
  tutorialCompleteBody: string;
  tutorialCompleteBadge: string;
  tutorialWrong: string;
  tutorialGood: string;
  tutorialSkip: string;
  duelSurrender: string;
  duelSurrenderTitle: string;
  duelSurrenderBody: string;
  duelSurrenderConfirm: string;
  duelSurrenderCancel: string;
  tutorialContinue: string;
  tutorialOk: string;
  tutorialTip: string;
  tutorialStartDuel: string;
  tutorialBackToMenu: string;
  tutorialLessonProgress: string;
  tutorialStepProgress: string;
  tutorialHudHint: string;
  disconnectWallet: string;
  walletOptional: string;
  walletConnected: string;
  walletNoProvider: string;
  hubFooter: string;
  hubVerifyLink: string;
  multiplayerSoon: string;
  leaderboard: string;
  leaderboardTitle: string;
  leaderboardEmpty: string;
  leaderboardRank: string;
  scoreSubmitted: string;
  scoreSubmitNoWallet: string;
  pickArchetype: string;
  dailyPoolLabel: string;
  dailyEntrants: string;
  dailyStake: string;
  dailyStaked: string;
  dailyStakedBadge: string;
  dailyStakeRequired: string;
  dailyStakeFailed: string;
  dailyPoolNotConfigured: string;
  dailyPlay: string;
  achievementsTitle: string;
  claimReward: string;
  shareCard: string;
  challengeLink: string;
  dailyAlreadySubmitted: string;
  duelNotVerified: string;
  connectWallet: string;
  heroTagline: string;
  heroPlaySubtitle: string;
  heroVerifyLine1: string;
  heroVerifyLine2a: string;
  heroVerifyLine2b: string;
  heroOr: string;
  heroBuiltOn: string;
  heroGuestNote: string;
  footerComputeTitle: string;
  footerComputeDesc: string;
  footerChainTitle: string;
  footerChainDesc: string;
  footerStorageTitle: string;
  footerStorageDesc: string;
  settingsSectionProfile: string;
  settingsSectionLanguage: string;
  settingsSectionAudio: string;
  settingsSectionVideo: string;
  settingsSectionGameplay: string;
  settingsMasterVolume: string;
  settingsMusicVolume: string;
  settingsSfxVolume: string;
  settingsUiSounds: string;
  settingsScanlines: string;
  settingsScreenShake: string;
  settingsGlitchEffects: string;
  settingsReducedMotion: string;
  settingsShowActionHints: string;
  settingsAudioNote: string;
  nicknameLabel: string;
  nicknamePlaceholder: string;
  nicknameHint: string;
  nicknameLength: string;
  nicknameChars: string;
  profileSetupTitle: string;
  profileSetupBody: string;
  profileSave: string;
  profileSkip: string;
  profileSaved: string;
  profileSaveFailed: string;
  settingsProfileWallet: string;
  settingsProfileNoWallet: string;
  settingsEditNickname: string;
  leaderboardWalletOnly: string;
  leaderboardSubtitle: string;
  leaderboardColRank: string;
  leaderboardColPlayer: string;
  leaderboardColScore: string;
  leaderboardYou: string;
  scoreSubmitNoProfile: string;
  settingsSoon: string;
}

const LOCALES: Record<Language, LocaleStrings> = {
  en: {
    pageTitle: "ZEGON · Outdraw the Blind",
    tagline: "Outdraw the Blind",
    pressStart: "PRESS START",
    duel: "DUEL",
    daily: "DAILY",
    settings: "SETTINGS",
    back: "BACK",
    settingsTitle: "SETTINGS",
    language: "LANGUAGE",
    languageEn: "ENGLISH",
    languageEs: "SPANISH",
    saved: "SAVED",
    duelTitle: "DUEL",
    zegonReading: "ZEGON is reading you...",
    yourMove: "YOUR MOVE",
    deadeye: "DEADEYE!",
    hudYou: "YOU",
    hudZegon: "ZEGON",
    hudHp: "HP",
    hudAmmo: "AMMO",
    hudBlindsight: "BLINDSIGHT",
    actionFireHigh: "FIRE HIGH",
    actionFireLow: "FIRE LOW",
    actionDodge: "DODGE",
    actionFeint: "FEINT",
    actionReload: "RELOAD",
    actionDescFireHigh: "Shoot high. Beats low dodge and feint.",
    actionDescFireLow: "Shoot low. Beats high dodge and reload.",
    actionDescDodge: "Dodge · avoid ZEGON's shot this round.",
    actionDescFeint: "Feint · breaks pattern. Only safe if ZEGON mispredicted.",
    actionDescReload: "Reload · restore ammo (vulnerable).",
    zegonPlayed: "ZEGON played",
    youPlayed: "You played",
    zegonReadYou: "ZEGON READ YOU!",
    actionTooltipHint: "Hover a button to see what it does",
    youWin: "YOU WIN",
    zegonWins: "ZEGON WINS",
    draw: "DRAW",
    rounds: "Rounds",
    timesRead: "Times read",
    finalBlindsight: "Final Blindsight",
    score: "Score",
    verifyOnChain: "VERIFY ON-CHAIN",
    share: "SHARE",
    copied: "COPIED!",
    menu: "MENU",
    shareText:
      "I scored {score} against ZEGON. Times read: {timesRead}. Outdraw the blind.",
    round: "ROUND",
    history: "HISTORY",
    yourTurnPrompt: "ZEGON HAS LOCKED IN. CHOOSE YOUR ACTION.",
    deadeyeNear: "DEADEYE NEAR",
    verifyOk: "ON-CHAIN PROOF VERIFIED",
    verifyPending: "PROOF PENDING",
    verifyOffline: "Offline mode · no on-chain proof",
    verifyRounds: "Rounds sealed before your input",
    verifyOpenExplorer: "View on Chainscan Galileo",
    roundSummaryRead: "Read you",
    roundSummarySurprised: "You surprised ZEGON",
    roundSummaryYouHit: "You took",
    roundSummaryZegonHit: "ZEGON took",
    roundSummaryNoDamage: "No damage this round",
    roundSummaryDeadeyeOn: "DEADEYE activated · next shot is lethal",
    roundSummaryDeadeyeUsed: "DEADEYE spent",
    errorNoAmmo: "No ammo · reload first.",
    tutorial: "TUTORIAL",
    tutorialTitle: "Welcome to the duel",
    tutorialDoneBadge: "✓ DONE",
    tutorialIntro:
      "ZEGON is a blind gunslinger AI · it cannot see your current move.\n\nBut it reads patterns in your history. Repeat gestures and Blindsight rises. Survive by being unpredictable.",
    tutorialHpTitle: "Life (HP)",
    tutorialHpBody:
      "You and ZEGON start at 100 HP (bottom corners).\n\n• Your bar = cyan (left)\n• ZEGON's bar = ember (right)\n\nSuccessful shots deal damage. At 0 HP you lose. First to break the opponent wins.",
    tutorialBlindsightTitle: "Blindsight · the band",
    tutorialBlindsightBody:
      "The meter top-right is ZEGON's Blindsight (the glowing band).\n\n• +15 when ZEGON predicts your action correctly\n• −10 when you surprise it\n• −8 when you Feint successfully\n\nHigh Blindsight = screen glitches intensify. ZEGON is reading you.",
    tutorialDeadeyeTitle: "DEADEYE",
    tutorialDeadeyeBody:
      "At 100% Blindsight, ZEGON enters DEADEYE.\n\nIts next shot becomes lethal · almost impossible to dodge unless you broke the read.\n\nWatch for the ember flash and \"DEADEYE!\" warning. Break patterns before it peaks.",
    tutorialActionsTitle: "Five actions",
    tutorialActionsBody:
      "FIRE HIGH / FIRE LOW · deal damage if ZEGON mispredicted.\n\nDODGE · avoids ZEGON's shot (unless DEADEYE).\n\nFEINT · fake move; breaks rhythm. NOT a dodge · if ZEGON predicted your feint and fires, you take damage.\n\nRELOAD · restores ammo but you're vulnerable.",
    tutorialAmmoTitle: "Ammo",
    tutorialAmmoBody:
      "The revolver holds 6 rounds (shown as AMMO ×N under your HP).\n\nEach shot spends 1 bullet. At 0 ammo you cannot fire · you must RELOAD.\n\nReloading while ZEGON shoots = you get hit.",
    tutorialPracticeTitle: "Practice round",
    tutorialPracticeBody:
      "Now try 5 guided moves against a scripted ZEGON.\n\nFollow the hint bar above the buttons. Only the correct action will be enabled each step.",
    tutorialVerifyTitle: "VERIFY · provably fair",
    tutorialVerifyBody:
      "After a real duel you can VERIFY on-chain: ZEGON committed its move before you acted, using only your history · never your current shot.\n\nThat's the 0G sealed AI proof. Optional, but the core of ZEGON.",
    tutorialStepFire:
      "ZEGON mispredicted. Shoot · FIRE HIGH or FIRE LOW. If you hit, ZEGON loses HP.",
    tutorialStepDodge:
      "ZEGON is firing high. DODGE · you take no damage this round.",
    tutorialStepRead:
      "ZEGON predicted FIRE LOW. Use FIRE LOW anyway · watch Blindsight jump +15 (it read you).",
    tutorialStepFeint:
      "ZEGON expects another shot. FEINT · break your pattern; Blindsight drops if it mispredicted.",
    tutorialStepReload:
      "No ammo left. RELOAD · you'll be vulnerable if ZEGON fires.",
    tutorialStepDamage:
      "RELOAD again · ZEGON will shoot. Watch your HP drop (−damage).",
    tutorialStepDeadeye:
      "DEADEYE active! ZEGON fires · DODGE if you can (almost lethal).",
    tutorialComplete: "Tutorial complete",
    tutorialCompleteBody:
      "You learned HP, Blindsight, DEADEYE, all five actions, and ammo.\n\nYou're ready for a real duel.",
    tutorialCompleteBadge: "Completed",
    tutorialWrong: "Not that one · follow the hint.",
    tutorialGood: "Nice.",
    tutorialSkip: "SKIP",
    duelSurrender: "SURRENDER",
    duelSurrenderTitle: "Surrender?",
    duelSurrenderBody: "You'll return to the menu and this duel will end without a score.",
    duelSurrenderConfirm: "YES, SURRENDER",
    duelSurrenderCancel: "KEEP FIGHTING",
    tutorialContinue: "CONTINUE",
    tutorialOk: "OK!",
    tutorialTip: "TIP",
    tutorialStartDuel: "ENTER DUEL",
    tutorialBackToMenu: "BACK TO MENU",
    tutorialLessonProgress: "Lesson {current}/{total}",
    tutorialStepProgress: "Practice {current}/{total}",
    tutorialHudHint: "Bars: HP bottom · Blindsight top-right · Ammo under you",
    connectWallet: "CONNECT WALLET",
    heroTagline: "It can't see you. It reads you.",
    heroPlaySubtitle: "Enter the duel",
    heroVerifyLine1: "Zegon's inference is sealed.",
    heroVerifyLine2a: "Every duel is ",
    heroVerifyLine2b: "verified on-chain",
    heroOr: "or",
    heroBuiltOn: "Built on",
    heroGuestNote: "Wallet optional · play as guest. Connect later for rewards and rankings.",
    footerComputeTitle: "0G Compute",
    footerComputeDesc: "Sealed inference",
    footerChainTitle: "0G Chain",
    footerChainDesc: "Provably fair",
    footerStorageTitle: "0G Storage",
    footerStorageDesc: "Verifiable data",
    disconnectWallet: "DISCONNECT",
    walletOptional: "Optional · daily ranking & future multiplayer",
    walletConnected: "Connected",
    walletNoProvider: "No wallet found (MetaMask?)",
    hubFooter: "No wallet needed to play · VERIFY on-chain after each duel",
    hubVerifyLink: "How VERIFY works",
    multiplayerSoon: "Multiplayer · coming soon",
    leaderboard: "RANKING",
    leaderboardTitle: "DAILY RANKING",
    leaderboardEmpty: "No scores yet today.",
    leaderboardRank: "#{rank}  {id}  ·  {score}",
    scoreSubmitted: "Score submitted to daily board",
    scoreSubmitNoWallet: "Connect wallet to save your daily score",
    pickArchetype: "Choose your ZEGON",
    dailyPoolLabel: "Pool",
    dailyEntrants: "entrants",
    dailyStake: "Stake to enter",
    dailyStaked: "Staked!",
    dailyStakedBadge: "✓ Staked for today",
    dailyStakeRequired: "Stake OG to play today's daily",
    dailyStakeFailed: "Stake failed · check wallet & balance",
    dailyPoolNotConfigured: "Daily pool not configured yet",
    dailyPlay: "Play daily duel",
    achievementsTitle: "Achievements",
    claimReward: "Claim OG reward",
    shareCard: "Download share card",
    challengeLink: "Copy challenge link",
    dailyAlreadySubmitted: "Daily attempt already submitted",
    duelNotVerified: "Duel could not be verified on-chain",
    scoreSubmitNoProfile: "Create a nickname in Settings to appear on the ranking",
    settingsSectionProfile: "Profile",
    settingsSectionLanguage: "Language",
    settingsSectionAudio: "Audio",
    settingsSectionVideo: "Visual effects",
    settingsSectionGameplay: "Gameplay",
    settingsMasterVolume: "Master volume",
    settingsMusicVolume: "Music",
    settingsSfxVolume: "Sound effects",
    settingsUiSounds: "UI sounds",
    settingsScanlines: "Scanlines overlay",
    settingsScreenShake: "Screen shake",
    settingsGlitchEffects: "Blindsight glitch",
    settingsReducedMotion: "Reduce motion",
    settingsShowActionHints: "Action tooltips",
    settingsAudioNote: "Background music: Ghosts In Spur Dust. Adjust volume below.",
    nicknameLabel: "Nickname",
    nicknamePlaceholder: "Outlaw_42",
    nicknameHint: "3–16 chars · letters, numbers, underscore · shown on daily ranking",
    nicknameLength: "Nickname must be 3–16 characters.",
    nicknameChars: "Use only letters, numbers, and underscore.",
    profileSetupTitle: "Choose your name",
    profileSetupBody: "Your wallet is connected. Pick a nickname to appear on the daily ranking and future leaderboards.",
    profileSave: "Save profile",
    profileSkip: "Later",
    profileSaved: "Profile saved",
    profileSaveFailed: "Could not save profile. Try again.",
    settingsProfileWallet: "Wallet",
    settingsProfileNoWallet: "Connect a wallet to create your player profile and join rankings.",
    settingsEditNickname: "Save nickname",
    leaderboardWalletOnly: "Daily ranking · wallet players with a nickname only",
    leaderboardSubtitle: "Best score today · top 10",
    leaderboardColRank: "#",
    leaderboardColPlayer: "Player",
    leaderboardColScore: "Score",
    leaderboardYou: "you",
    settingsSoon: "Saved for later",
  },
  es: {
    pageTitle: "ZEGON · Supera al ciego",
    tagline: "Supera al ciego",
    pressStart: "PULSA INICIO",
    duel: "DUELO",
    daily: "DIARIO",
    settings: "AJUSTES",
    back: "VOLVER",
    settingsTitle: "AJUSTES",
    language: "IDIOMA",
    languageEn: "INGLÉS",
    languageEs: "ESPAÑOL",
    saved: "GUARDADO",
    duelTitle: "DUELO",
    zegonReading: "ZEGON te está leyendo...",
    yourMove: "TU JUGADA",
    deadeye: "¡OJO DE MUERTE!",
    hudYou: "TÚ",
    hudZegon: "ZEGON",
    hudHp: "PS",
    hudAmmo: "MUNICIÓN",
    hudBlindsight: "CIEGO-VISTA",
    actionFireHigh: "DISPARO ALTO",
    actionFireLow: "DISPARO BAJO",
    actionDodge: "ESQUIVAR",
    actionFeint: "FINTA",
    actionReload: "RECARGAR",
    actionDescFireHigh: "Disparo alto. Gana contra esquiva baja y finta.",
    actionDescFireLow: "Disparo bajo. Gana contra esquiva alta y recarga.",
    actionDescDodge: "Esquivar · evitás el disparo de ZEGON esta ronda.",
    actionDescFeint: "Finta · rompe patrón. Solo te protege si ZEGON predijo mal.",
    actionDescReload: "Recargar · recuperás munición (quedás expuesto).",
    zegonPlayed: "ZEGON jugó",
    youPlayed: "Vos jugaste",
    zegonReadYou: "¡ZEGON TE LEYÓ!",
    actionTooltipHint: "Pasá el mouse sobre un botón para ver qué hace",
    youWin: "GANASTE",
    zegonWins: "GANA ZEGON",
    draw: "EMPATE",
    rounds: "Rondas",
    timesRead: "Veces leído",
    finalBlindsight: "Ciego-vista final",
    score: "Puntuación",
    verifyOnChain: "VERIFICAR EN CADENA",
    share: "COMPARTIR",
    copied: "¡COPIADO!",
    menu: "MENÚ",
    shareText:
      "Saqué {score} contra ZEGON. Me leyó {timesRead} veces. Supera al ciego.",
    round: "RONDA",
    history: "HISTORIAL",
    yourTurnPrompt: "ZEGON YA BLOQUEÓ. ELEGÍ TU JUGADA.",
    deadeyeNear: "OJO DE MUERTE CERCA",
    verifyOk: "PRUEBA ON-CHAIN VERIFICADA",
    verifyPending: "PRUEBA PENDIENTE",
    verifyOffline: "Modo sin conexión · sin prueba on-chain",
    verifyRounds: "Rondas selladas antes de tu jugada",
    verifyOpenExplorer: "Ver en Chainscan Galileo",
    roundSummaryRead: "Te leyó",
    roundSummarySurprised: "Lo sorprendiste",
    roundSummaryYouHit: "Recibiste",
    roundSummaryZegonHit: "ZEGON recibió",
    roundSummaryNoDamage: "Sin daño esta ronda",
    roundSummaryDeadeyeOn: "¡DEADEYE activado · próximo disparo letal!",
    roundSummaryDeadeyeUsed: "DEADEYE consumido",
    errorNoAmmo: "Sin munición · recargá primero.",
    tutorial: "TUTORIAL",
    tutorialTitle: "Bienvenido al duelo",
    tutorialDoneBadge: "✓ HECHO",
    tutorialIntro:
      "ZEGON es un pistolero IA ciego · no puede ver tu jugada actual.\n\nPero lee patrones en tu historial. Si repetís gestos, sube el ciego-vista. Sobreviví siendo impredecible.",
    tutorialHpTitle: "Vida (PS)",
    tutorialHpBody:
      "Vos y ZEGON empezáis con 100 PS (esquinas abajo).\n\n• Tu barra = cyan (izquierda)\n• Barra de ZEGON = ember (derecha)\n\nLos disparos acertados hacen daño. A 0 PS perdés. Gana quien rompa al rival.",
    tutorialBlindsightTitle: "Ciego-vista · la venda",
    tutorialBlindsightBody:
      "El medidor arriba a la derecha es el ciego-vista de ZEGON (la venda brillante).\n\n• +15 si ZEGON predice bien tu acción\n• −10 si lo sorprendés\n• −8 si la finta funciona\n\nCiego-vista alto = más glitch en pantalla. ZEGON te está leyendo.",
    tutorialDeadeyeTitle: "DEADEYE (Ojo de muerte)",
    tutorialDeadeyeBody:
      "Al 100% de ciego-vista, ZEGON entra en DEADEYE.\n\nSu próximo disparo es letal · casi imposible de esquivar si te leyó.\n\nMirá el flash ember y el aviso \"¡OJO DE MUERTE!\". Rompé patrones antes de que llegue al máximo.",
    tutorialActionsTitle: "Cinco acciones",
    tutorialActionsBody:
      "DISPARO ALTO / BAJO · dañan si ZEGON predijo mal.\n\nESQUIVAR · evita el tiro (salvo DEADEYE).\n\nFINTA · movimiento falso; rompe ritmo. NO es esquiva · si ZEGON predijo la finta y dispara, recibís daño.\n\nRECARGAR · recupera munición pero quedás expuesto.",
    tutorialAmmoTitle: "Munición",
    tutorialAmmoBody:
      "El revólver tiene 6 balas (MUNICIÓN ×N bajo tus PS).\n\nCada disparo gasta 1. Con 0 balas no podés disparar · hay que RECARGAR.\n\nRecargar mientras ZEGON dispara = te pegan.",
    tutorialPracticeTitle: "Ronda de práctica",
    tutorialPracticeBody:
      "Ahora probá 5 jugadas guiadas contra un ZEGON scripteado.\n\nSeguí la barra de pistas sobre los botones. Solo la acción correcta estará habilitada.",
    tutorialVerifyTitle: "VERIFY · juego limpio",
    tutorialVerifyBody:
      "Tras un duelo real podés VERIFY on-chain: ZEGON comprometió su jugada antes de que actúes, usando solo tu historial · nunca tu disparo actual.\n\nEsa es la prueba de IA sellada de 0G. Opcional, pero el corazón de ZEGON.",
    tutorialStepFire:
      "ZEGON predijo mal. Dispará · DISPARO ALTO o BAJO. Si acertás, ZEGON pierde PS.",
    tutorialStepDodge:
      "ZEGON dispara alto. ESQUIVÁ · no recibís daño esta ronda.",
    tutorialStepRead:
      "ZEGON predijo DISPARO BAJO. Usá DISPARO BAJO igual · mirá cómo sube +15 el ciego-vista (te leyó).",
    tutorialStepFeint:
      "ZEGON espera otro disparo. FINTA · rompé el patrón; baja el ciego-vista si predijo mal.",
    tutorialStepReload:
      "Sin balas. RECARGÁ · quedás vulnerable si ZEGON dispara.",
    tutorialStepDamage:
      "RECARGÁ otra vez · ZEGON dispara. Mirá bajar tus PS (−daño).",
    tutorialStepDeadeye:
      "¡DEADEYE activo! ZEGON dispara · ESQUIVÁ si podés (casi letal).",
    tutorialComplete: "Tutorial completado",
    tutorialCompleteBody:
      "Aprendiste PS, ciego-vista, DEADEYE, las cinco acciones y la munición.\n\nEstás listo para un duelo real.",
    tutorialCompleteBadge: "Completado",
    tutorialWrong: "Esa no · seguí la pista.",
    tutorialGood: "Bien.",
    tutorialSkip: "SALTAR",
    duelSurrender: "RENDIRSE",
    duelSurrenderTitle: "¿Rendirse?",
    duelSurrenderBody: "Volverás al menú y este duelo terminará sin puntuación.",
    duelSurrenderConfirm: "SÍ, RENDIRME",
    duelSurrenderCancel: "SEGUIR LUCHANDO",
    tutorialContinue: "CONTINUAR",
    tutorialOk: "¡OKEY!",
    tutorialTip: "TIP",
    tutorialStartDuel: "ENTRAR AL DUELO",
    tutorialBackToMenu: "VOLVER AL MENÚ",
    tutorialLessonProgress: "Lección {current}/{total}",
    tutorialStepProgress: "Práctica {current}/{total}",
    tutorialHudHint: "Barras: PS abajo · Ciego-vista arriba-derecha · Munición bajo vos",
    connectWallet: "CONECTAR WALLET",
    heroTagline: "No te ve. Te lee.",
    heroPlaySubtitle: "Entrá al duelo",
    heroVerifyLine1: "La inferencia de Zegon está sellada.",
    heroVerifyLine2a: "Cada duelo se ",
    heroVerifyLine2b: "verifica on-chain",
    heroOr: "o",
    heroBuiltOn: "Construido en",
    heroGuestNote: "Wallet opcional · jugá como invitado. Conectá después para recompensas y ranking.",
    footerComputeTitle: "0G Compute",
    footerComputeDesc: "Inferencia sellada",
    footerChainTitle: "0G Chain",
    footerChainDesc: "Provably fair",
    footerStorageTitle: "0G Storage",
    footerStorageDesc: "Datos verificables",
    disconnectWallet: "DESCONECTAR",
    walletOptional: "Opcional · ranking diario y multijugador futuro",
    walletConnected: "Conectado",
    walletNoProvider: "No hay wallet (¿MetaMask?)",
    hubFooter: "No necesitás wallet para jugar · VERIFY on-chain tras cada duelo",
    hubVerifyLink: "Cómo funciona VERIFY",
    multiplayerSoon: "Multijugador · próximamente",
    leaderboard: "RANKING",
    leaderboardTitle: "RANKING DIARIO",
    leaderboardEmpty: "Sin puntajes hoy todavía.",
    leaderboardRank: "#{rank}  {id}  ·  {score}",
    scoreSubmitted: "Puntaje enviado al ranking diario",
    scoreSubmitNoWallet: "Conectá wallet para guardar tu puntaje diario",
    pickArchetype: "Elegí tu ZEGON",
    dailyPoolLabel: "Pool",
    dailyEntrants: "entrantes",
    dailyStake: "Apostar para entrar",
    dailyStaked: "¡Apostado!",
    dailyStakedBadge: "✓ Apostado hoy",
    dailyStakeRequired: "Apostá OG para jugar el daily de hoy",
    dailyStakeFailed: "Falló la apuesta · revisá wallet y saldo",
    dailyPoolNotConfigured: "Pool diario aún no configurado",
    dailyPlay: "Jugar duelo diario",
    achievementsTitle: "Logros",
    claimReward: "Reclamar premio OG",
    shareCard: "Descargar tarjeta",
    challengeLink: "Copiar link de desafío",
    dailyAlreadySubmitted: "Ya enviaste tu intento diario",
    duelNotVerified: "No se pudo verificar el duelo on-chain",
    scoreSubmitNoProfile: "Creá un nickname en Ajustes para aparecer en el ranking",
    settingsSectionProfile: "Perfil",
    settingsSectionLanguage: "Idioma",
    settingsSectionAudio: "Audio",
    settingsSectionVideo: "Efectos visuales",
    settingsSectionGameplay: "Jugabilidad",
    settingsMasterVolume: "Volumen general",
    settingsMusicVolume: "Música",
    settingsSfxVolume: "Efectos de sonido",
    settingsUiSounds: "Sonidos de interfaz",
    settingsScanlines: "Scanlines",
    settingsScreenShake: "Sacudida de pantalla",
    settingsGlitchEffects: "Glitch ciego-vista",
    settingsReducedMotion: "Reducir movimiento",
    settingsShowActionHints: "Tips de acciones",
    settingsAudioNote: "Música de fondo: Ghosts In Spur Dust. Ajusta el volumen abajo.",
    nicknameLabel: "Nickname",
    nicknamePlaceholder: "Forajido_42",
    nicknameHint: "3–16 caracteres · letras, números, guion bajo · visible en el ranking diario",
    nicknameLength: "El nickname debe tener 3–16 caracteres.",
    nicknameChars: "Solo letras, números y guion bajo.",
    profileSetupTitle: "Elegí tu nombre",
    profileSetupBody: "Tu wallet está conectada. Elegí un nickname para aparecer en el ranking diario y futuros leaderboards.",
    profileSave: "Guardar perfil",
    profileSkip: "Después",
    profileSaved: "Perfil guardado",
    profileSaveFailed: "No se pudo guardar. Intentá de nuevo.",
    settingsProfileWallet: "Wallet",
    settingsProfileNoWallet: "Conectá una wallet para crear tu perfil y entrar al ranking.",
    settingsEditNickname: "Guardar nickname",
    leaderboardWalletOnly: "Ranking diario · solo jugadores con wallet y nickname",
    leaderboardSubtitle: "Mejor puntaje de hoy · top 10",
    leaderboardColRank: "#",
    leaderboardColPlayer: "Jugador",
    leaderboardColScore: "Pts",
    leaderboardYou: "vos",
    settingsSoon: "Guardado para más adelante",
  },
};

const STORAGE_KEY = "zegon-language";

function detectBrowserLanguage(): Language {
  if (typeof navigator !== "undefined") {
    return navigator.language.startsWith("es") ? "es" : "en";
  }
  return "en";
}

function loadLanguage(): Language {
  if (typeof localStorage === "undefined") {
    return detectBrowserLanguage();
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "es") {
    return stored;
  }
  return detectBrowserLanguage();
}

let currentLanguage: Language = loadLanguage();

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, lang);
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
    document.title = LOCALES[lang].pageTitle;
  }
}

export function t(): LocaleStrings {
  return LOCALES[currentLanguage];
}

export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

// Apply on module load
setLanguage(currentLanguage);
