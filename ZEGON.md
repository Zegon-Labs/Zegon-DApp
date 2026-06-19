# ZEGON — Game Design & Technical Spec

> **Documento de contexto completo.** Está escrito para que una IA (Claude Code) o un humano lo lea y sepa **exactamente** qué construir, con qué tecnologías, con qué estética y en qué orden. Léelo entero antes de escribir código.
>
> **Objetivo:** ganar el **0G "Zero Cup"** (torneo de vibe-coding sobre 0G, formato eliminatorias estilo Mundial, $17K). El MVP debe estar listo y jugable para el **deadline del Group Stage (23 jun)** — ~5-6 días, equipo de **2 personas** con Claude Code.

---

## 0. TL;DR (una línea)

**ZEGON es un duelo de pistoleros pixel-art, dark y glitch, contra una IA con los ojos vendados que NO puede verte — pero te lee por tus patrones. Ganás siendo impredecible. Y podés probar on-chain que la IA nunca hizo trampa.**

Tagline: *"It can't see you. It reads you. Outdraw the blind."*

---

## 1. Concepto & Lore (de qué trata)

ZEGON es el nombre del **antagonista**: un pistolero-centinela de IA, eterno, con los ojos sellados por una **venda criptográfica**. No tiene ojos. No puede ver el tablero, ni tu mano, ni tu disparo. Está literalmente **sellado dentro de una caja** (una analogía directa del TEE de 0G: corre dentro de un enclave a prueba de manipulación).

Pero ZEGON **lee almas por sus patrones**. Cada vez que repetís un gesto, que caés en un ritmo, que sos predecible — la venda **se agrieta y brilla**, y su puntería se traba en vos. La única forma de sobrevivir es **romper tu patrón**, volverte ruido, ser impredecible.

El jugador es un forastero que entra al duelo contra ZEGON. Premisa emocional: *"¿Cómo le ganás a algo que no puede verte... pero te conoce mejor que vos mismo?"*

**El gancho que lo vuelve único:** al final de cada duelo, el jugador puede **verificar on-chain** que ZEGON jugó limpio — que comprometió su jugada **antes** de que el jugador moviera, y que solo te infirió por tu historial, **nunca espió tu disparo**. Es el único juego de duelos donde la IA **provadamente no puede hacer trampa.**

---

## 2. El Hook & por qué 0G (por qué gana)

El corazón del juego **solo es posible con 0G**. Esto es deliberado: los jueces del torneo premian integración real, y la comunidad vota lo que la sorprende.

- **"Provably fair" hoy existe solo para el azar** (dados, RNG de casino). ZEGON lo aplica a la **decisión de una IA con información oculta** — eso no lo hizo nadie, y **requiere inferencia sellada** (un número aleatorio no sirve; lo que se verifica es el *razonamiento* de la IA).
- La **venda = la inferencia sellada de 0G** hecha visual. Cualquiera entiende al toque que ZEGON "está a ciegas". El 0G se vuelve legible sin explicarlo.
- Sin 0G, "te leí" es un truco no confiable (¿y si la app espió tu input?). **Con 0G, es prueba.** Ese es el producto.

**Diferenciación honesta:** existen "AI opponents" y juegos provably-fair de RNG, pero la combinación *"IA ciega que te lee por patrones + commit-reveal + atestación TEE = duelo provadamente justo"* es el wedge libre. (Verificar prior-art antes de fijar; ver §11.)

---

## 3. Contexto estratégico del Zero Cup (por qué existen ciertas features)

El torneo tiene **dos jurados distintos**, y el diseño responde a ambos:

- **Rondas tempranas (Group Stage → Round of 16): JUECES (equipo 0G).** Puntúan integración 0G real + demo funcional + prueba on-chain. → Por eso el commit-reveal on-chain y la atestación TEE son obligatorios en el MVP.
- **Rondas finales (Quarter Finals → Final): VOTO de la COMUNIDAD.** Puntúan lo *wow*, jugable y compartible. → Por eso el modo diario, el leaderboard, la tarjeta compartible y la estética glitch memeable.

Regla del torneo: *"improve and resubmit between rounds."* → Construir un núcleo sólido para el 23, y pulir/expandir cada ronda.

---

## 4. Core Gameplay (qué hace / qué debería hacer)

### 4.1 El loop del duelo (ronda por ronda)

Es un duelo de **selección simultánea** (estilo "yomi" / piedra-papel-tijera con armas y capas).

Cada ronda:
1. ZEGON, **a ciegas**, recibe SOLO tu **historial de jugadas** (no tu jugada actual) y **predice tu próxima acción** + elige la suya. (Esto corre **sellado** en 0G Compute → §5.)
2. ZEGON **compromete su jugada on-chain (commit = hash)** antes de que vos elijas.
3. Vos elegís tu acción (sin ver la de ZEGON).
4. **Reveal:** se destapa la jugada de ZEGON; se resuelve el intercambio.
5. Se actualiza el **medidor de Blindsight** (la venda): sube si ZEGON te predijo bien, baja si lo sorprendiste.

> Por turnos = esconde la latencia de la inferencia sellada (unos segundos por ronda están bien, como esperar a un oponente).

### 4.2 Acciones (set inicial — ajustable en playtest)

Set mínimo jugable: `FIRE_HIGH`, `FIRE_LOW`, `DODGE`, `FEINT`, `RELOAD`.

Resolución (lógica de arranque, tunear después):
- **FIRE_x** acierta si ZEGON no anticipó esa línea → ZEGON recibe daño.
- Si ZEGON **predijo tu FIRE_x**, esquiva o contradispara primero → fallás / recibís daño.
- **DODGE** evita el disparo pero no hace daño.
- **FEINT** no hace nada, pero **rompe tu patrón** (baja Blindsight) — cuesta una ronda.
- **RELOAD** repone munición (según arma).

### 4.3 El medidor de BLINDSIGHT (la venda) — la mecánica firma

- Sube **+** cuando ZEGON predice tu acción correctamente (te está leyendo).
- Baja **−** cuando lo sorprendés (predijo mal) o usás FEINT.
- Al **máximo → "DEADEYE":** ZEGON consigue una lectura letal garantizada (un disparo que no falla) → presión brutal para romper tu patrón.
- **Visual:** la venda de ZEGON es una barra. Mientras sube, la venda **se agrieta, brilla en `--ember`, y el glitch de la pantalla se intensifica** (ver §6.4). La estética *es* el medidor.

### 4.4 Armas (tu pedido — integradas a la mecánica, no cosméticas)

Cada arma cambia: **daño, munición, velocidad de desenfunde y "ruido"** (qué tan leíble te vuelve). Set inicial:
| Arma | Daño | Munición | Ruido (legibilidad) | Sabor |
|---|---|---|---|---|
| **Revólver** | Medio | 6 | Medio | Equilibrada, default |
| **Escopeta** | Alto | 2 | **Alto** (te vuelve predecible) | Castiga el spam |
| **Derringer** | Bajo | 2 | Bajo | Rápida, evasiva |
| **Glitch Pistol** (rara) | Medio | 4 | **Bajo** (te camufla del patrón) | Errática; recompensa el caos |

> Roadmap (no MVP): armas como **iNFT (ERC-7857)** que poseés / coleccionás. Dejar fuera del build de 6 días por riesgo de tooling.

### 4.5 Estructura de partida

- **Modo principal (MVP):** mejor de N rondas / hasta que una barra de vida llega a 0. Duelo corto (1-3 min).
- **Modo Diario (MVP-light, clave para viralidad):** todos enfrentan al **mismo ZEGON con la misma semilla** del día → un intento → **leaderboard global** ("¿qué tan impredecible sos?").
- **Link de desafío:** mandás a un amigo el mismo duelo, comparan quién aguantó más rondas / venció a ZEGON con menos lecturas.

### 4.6 El momento de la PRUEBA (verify) — donde pega el 0G

Tras el duelo, una **tarjeta compartible** muestra:
- Resultado + cuántas veces ZEGON te leyó.
- Botón **"VERIFY"**: muestra que la jugada de ZEGON estaba **comprometida on-chain antes de tu input** (timestamp) y que la atestación TEE prueba que solo recibió tu **historial**, nunca tu disparo actual.
- Copy: *"ZEGON committed its move before you drew. It never saw your shot. Verify ↗"* + link al explorer.

---

## 5. La mecánica de justicia verificable (cómo funciona el "no puede hacer trampa")

Claim exacto y honesto que se prueba: **ZEGON predice tu jugada usando solo tu historial, sellado, y compromete su predicción on-chain ANTES de que muevas → provadamente no espió tu jugada actual ni la cambió.**

Flujo técnico de una ronda:
1. **Input a ZEGON = solo historial** del jugador (secuencia de acciones pasadas) + estado (vida, arma, ronda). **NO** la acción actual.
2. **Inferencia sellada (0G Compute / TEE):** el modelo devuelve `{ predicted_player_move, zegon_move, confidence, taunt }` + una **atestación** firmada por el TEE.
3. **Commit on-chain:** se escribe `hash(zegon_move + salt)` en el contrato (Galileo) **antes** de habilitar el input del jugador.
4. El jugador mueve.
5. **Reveal:** se publica `(zegon_move, salt)`; el contrato verifica que matchea el commit. Se resuelve.
6. **Prueba:** el timestamp del commit (anterior al move del jugador) + la atestación (input = solo historial) = **no pudo espiar ni cambiar su jugada.**

> La atestación TEE prueba **integridad** (corrió el modelo real, sin modificar, sobre ese input). El commit-reveal prueba **anterioridad** (se fijó antes de tu jugada). Juntos = justicia verificable.

---

## 6. Dirección Visual

### 6.1 Tono y referencias
**Dark neo-western × cyber-glitch.** Imaginá un Spaghetti Western filtrado por una terminal corrupta. Solitario, tenso, sucio, hermoso. Referencias de *mood* (no de copia): la tensión de un duelo de Leone, la paleta fría de un CRT muerto, el datamosh de un VHS dañado.

### 6.2 Pixel art (sin exceso)
- **Resolución interna:** 426×240 (16:9), escalado con **nearest-neighbor** a pantalla. Look "16-bit refinado", **no** 8-bit chunky.
- **Sprites:** personajes ~48-64px de alto, legibles, paleta limitada por sprite. ZEGON debe ser **icónico de silueta** (sombrero/capucha + venda luminosa).
- El **estilo no vive en lo chunky** sino en la capa **CRT + glitch** encima (ver 6.4). Pixel art limpio + post-procesado sucio.

### 6.3 PALETA DE COLORES (completa, con hex y rol)

```
/* Neutrales oscuros (el "dark") */
--void:     #0A0911   /* fondo principal, casi negro azul-violáceo */
--ash:      #14121C   /* paneles / superficies oscuras */
--smoke:    #211E2E   /* superficies elevadas / cards */
--fog:      #3A3550   /* bordes, divisores, elementos apagados */

/* Texto */
--bone:     #E6E1D3   /* texto principal — blanco-hueso western */
--dust:     #9A93A8   /* texto secundario — gris lavanda apagado */

/* Acentos tech / glitch */
--cyan:     #2EE6D6   /* acento primario: UI, "sellado/verificable", la PRUEBA */
--magenta:  #FF2E88   /* glitch / aberración cromática / peligro con flair */

/* Estados de combate */
--ember:    #FF4D2E   /* la VENDA cuando te lee, el medidor Blindsight, DEADEYE */
--blood:    #B3122B   /* daño / impactos / vida baja */
--verified: #4DF07A   /* éxito: "verified on-chain", confirmaciones de prueba */

/* Raro / especial (usar con cuentagotas) */
--gold:     #E8B23A   /* armas raras (Glitch Pistol), campeón, highlights */
```

**Reglas de uso:**
- Base = `--void`/`--ash`/`--smoke`. El 90% de la pantalla es oscura.
- `--cyan` = todo lo "tech/verificable/0G" (botón VERIFY, recibos, atestación).
- `--ember` = la amenaza de ZEGON leyéndote (venda, Blindsight, Deadeye).
- `--verified` (verde) **solo** para confirmaciones de prueba on-chain — que se sienta especial.
- Glitch = par **`--cyan` + `--magenta`** en split RGB.

### 6.4 Sistema de GLITCH (atado a la mecánica, no random)

El glitch **narra**: cuanto más te lee ZEGON, más se corrompe la realidad. El glitch escala con el **Blindsight**.

- **RGB chromatic split** (offset `--cyan` / `--magenta`): en ZEGON cuando te predice, en los impactos, en la venda al brillar, en el logo.
- **Scanlines** sutiles (overlay CRT) siempre presentes, leves.
- **Datamosh / block-glitch:** en momentos grandes — DEADEYE, muerte, el "reveal" de la jugada de ZEGON, y al desbloquear la prueba on-chain.
- **Intensidad dinámica:** Blindsight bajo = glitch casi nulo (mundo "estable", ZEGON ciego). Blindsight alto = glitch fuerte (ZEGON "te ve", la realidad se rompe). Esto convierte el glitch en feedback de juego.

### 6.5 Pantallas (layout)

1. **Title:** logo ZEGON glitcheado (`--bone` con split cyan/magenta), silueta del pistolero vendado, "PRESS START". Modo: Duelo / Diario / Verify.
2. **Duel screen:** jugador (izq) vs ZEGON (der). Centro: el "campo" del duelo. HUD: vida de ambos, arma + munición, y **el medidor BLINDSIGHT (la venda de ZEGON)** prominente arriba. Botonera de acciones abajo.
3. **Round resolve:** animación de desenfunde, hit/miss con glitch, daño en `--blood`.
4. **Deadeye warning:** pantalla se tiñe `--ember`, glitch máximo, la venda totalmente abierta.
5. **Result / Verify card:** resumen + botón VERIFY (`--cyan`) → expande commit hash, atestación, link al explorer (`--verified` al confirmar). Botón "Share".
6. **Daily / Leaderboard:** ranking global, "tu impredecibilidad", link de desafío.

### 6.6 Tipografía
- **Logo / headers:** una fuente pixel display pesada y glitcheable (sugerencia: una pixel-font bold libre; aplicar split RGB).
- **Body / HUD / terminal:** **VT323** (Google Fonts) — mono de terminal, encaja con el mood "consola corrupta" y es legible. Alternativa: "Silkscreen".

### 6.7 Audio (dirección, ligero para MVP)
- Ambiente: viento de desierto + hum de CRT/estática.
- SFX: desenfunde, disparo seco, glitch-zap al ser leído, un "latido" que se acelera con el Blindsight.
- Stinger de DEADEYE y de VERIFY (un "chime" limpio al confirmar prueba — contraste con la suciedad).

---

## 7. Tecnologías empleadas (stack — explícito)

**Frontend / juego (web):**
- **Phaser 3** (motor 2D pixel-art para web) — sprites, animaciones, escenas, pipelines de shader para el glitch. *Alternativa válida:* PixiJS, o Canvas plano + React si el equipo prefiere. (Para un duelo por turnos, Phaser es cómodo y Claude Code lo conoce bien.)
- Glitch: shader/pipeline custom (RGB split + scanlines) o, si se va por DOM, CSS glitch + filtros.
- Build/deploy: **Vite** + **Vercel** (o Netlify) — estático + serverless functions.

**Backend / serverless (Vercel/Node functions):** mantiene la wallet y el broker **del lado servidor** para que **el jugador NO necesite wallet ni pague gas** (clave para viralidad). Hace las llamadas a 0G Compute, firma el commit-reveal y patrocina el gas en testnet.

**0G — integración (los 3 componentes):**
- **0G Compute (inferencia sellada / TEE)** — la predicción de ZEGON.
  - SDK: `@0glabs/0g-serving-broker` (Node). `createZGComputeNetworkBroker(signer)`.
  - Fondeo: `broker.ledger` (addLedger / depositFund).
  - Inferencia: `broker.inference.getServiceMetadata` / `getRequestHeaders` / `processResponse` (esto último da la verificación/atestación).
  - Modos TEE: **TeeML** (modelo dentro del TEE — p.ej. `GLM-5-FP8`, `gpt-oss-120b`) ó **TeeTLS** (proxy verificado a proveedor central — p.ej. `qwen3.6-plus`).
  - Modelo sugerido: **GLM-5.1** o **qwen3.6-plus** por capacidad de razonamiento; elegir el más **rápido** disponible para que la ronda sea ágil. *(Confirmar catálogo vivo con `listService` — §11.)*
- **0G Chain (Galileo testnet)** — el commit-reveal + los recibos.
  - Red: **Galileo testnet**, `chainId 16602`, RPC `https://evmrpc-testnet.0g.ai`, explorer `https://chainscan-galileo.0g.ai`, faucet `https://faucet.0g.ai`.
  - Contrato: **Solidity**, desplegado con **Hardhat** o **Foundry**. Interacción con **ethers.js**.
- **0G Storage** — guardar el log completo del duelo + la atestación, para reverificación.
  - SDK: `@0glabs/0g-ts-sdk` (Indexer + upload/download, **blob storage**; *evitar KV* en MVP porque requiere correr nodos propios). Indexer `https://indexer-storage-turbo.0g.ai`.

**Lenguajes:** TypeScript (front + funciones), Solidity (contrato).

> Nota para la IA ejecutora: las firmas exactas de métodos del SDK de 0G **deben confirmarse en `docs.0g.ai` / el README del paquete al momento de construir** — no inventarlas (§11).

---

## 8. Detalle de integración 0G

### 8.1 Interfaz del contrato (boceto — Solidity, Galileo)
```solidity
// Pseudocódigo — refinar al construir
struct Round { bytes32 commit; bool revealed; uint8 zegonMove; uint64 ts; }
struct Duel  { address player; bytes32 attestationHash; uint8 result; uint64 ts; }

function commitMove(uint256 duelId, uint256 roundId, bytes32 commit) external; // backend, ANTES del input
function revealMove(uint256 duelId, uint256 roundId, uint8 move, bytes32 salt) external; // verifica hash
function recordDuel(uint256 duelId, bytes32 attestationHash, uint8 result) external; // recibo final
// Eventos: Committed, Revealed, DuelRecorded — para que el botón VERIFY los lea.
```

### 8.2 Prompt de ZEGON (inferencia sellada — boceto)
```
SYSTEM: Sos ZEGON, un pistolero ciego. NO podés ver la jugada actual del rival.
Recibís SOLO su historial de acciones. Tu tarea: predecir su PRÓXIMA acción a
partir del patrón, y elegir tu jugada para contrarrestarla.
Devolvé SOLO JSON: {"predicted_player_move","zegon_move","confidence","taunt"}.

USER: history=[...]  state={hp_player, hp_zegon, weapon, ammo, round, blindsight}
```
(Determinismo: `temperature 0` para que la salida sea reproducible y la atestación tenga sentido.)

### 8.3 Flujo de datos de una ronda
`historial → 0G Compute (sellado) → {move ZEGON + atestación} → commitMove() on-chain → input jugador → revealMove() → resolver → actualizar Blindsight → (al final) recordDuel() + log a 0G Storage`

---

## 9. Plan estratégico por fases

> 2 personas. **Persona A = Juego/Visual (Phaser, arte, glitch, UX).** **Persona B = 0G/Contrato (Compute, Solidity, backend, verify).** Trabajan en paralelo; integran al final de cada fase.

### FASE 0 — Setup & Verificación (medio día)
- B: crear wallet de testnet, **faucet** (`faucet.0g.ai`), instalar `@0glabs/0g-serving-broker`, **confirmar SDK/modelos vivos** y hacer **un "hello world" de inferencia sellada** que devuelva texto + atestación. Scaffold de Hardhat/Foundry apuntando a Galileo.
- A: scaffold Vite + Phaser, pantalla vacía corriendo, importar VT323, definir las variables de color (§6.3).
- **Entregable:** repo corriendo, una inferencia sellada real funcionando, contrato vacío desplegado en Galileo.

### FASE 1 — Núcleo del duelo (jugable, SIN 0G todavía)
- A: implementar el loop de selección simultánea, las 5 acciones, vida, armas, y el **medidor Blindsight** — contra un **ZEGON "dummy"** (predice con lógica simple/local). **Hacerlo divertido primero.**
- B: terminar el contrato commit-reveal (commit/reveal/record) + tests.
- **Entregable:** duelo jugable de punta a punta contra una IA local; contrato testeado.

### FASE 2 — ZEGON real (0G Compute)
- B: reemplazar el dummy por la **inferencia sellada** (el prompt de §8.2). La predicción de ZEGON viene de 0G Compute, con atestación. Manejar latencia (loading "ZEGON is reading you...").
- A: integrar la respuesta al loop; animar la "lectura".
- **Entregable:** ZEGON predice de verdad, sellado, desde el historial.

### FASE 3 — Capa verificable (commit-reveal on-chain)
- B: cablear el flujo de §8.3 — commit ANTES del input, reveal después, record al final; backend patrocina gas (jugador sin wallet). Guardar log + atestación en **0G Storage**.
- **Entregable:** cada ronda deja prueba on-chain; existe el dato para el botón VERIFY.

### FASE 4 — Identidad visual (dark + pixel + glitch)
- A: arte de ZEGON (silueta icónica + venda), fondo del duelo, sprites de armas/disparos, aplicar **paleta §6.3**, **sistema de glitch §6.4** atado al Blindsight, scanlines/CRT, pantalla DEADEYE.
- **Entregable:** el juego **se ve como ZEGON** — oscuro, glitchy, tenso.

### FASE 5 — VERIFY UX + Diario + Leaderboard + Share
- A+B: la **tarjeta de resultado con botón VERIFY** (commit hash + atestación + link al explorer, en `--cyan`/`--verified`), el **modo Diario** (semilla del día) + **leaderboard** + **link de desafío** + **tarjeta compartible**.
- **Entregable:** los loops virales y la prueba lista para jueces.

### FASE 6 — Pulido, demo & lanzamiento
- Playtest y balance (¿es justo y adictivo? ¿el Blindsight presiona bien?).
- **Video demo < 3 min** (guionar: un duelo que termina con DEADEYE, luego el VERIFY que prueba que no hizo trampa).
- **README** con: descripción, **contract address + link al explorer**, setup, features de 0G usadas, equipo (TG/X).
- **Tweet de lanzamiento** (§13).
- **Entregable:** submission completo para el Group Stage.

---

## 10. Alcance: MVP vs Roadmap

**Dentro del MVP (6 días):** duelo 1v1 vs ZEGON sellado, Blindsight, 4 armas, commit-reveal on-chain, VERIFY card, modo diario + leaderboard básico, estética dark/glitch, log en 0G Storage.

**Roadmap (mencionar en el pitch, NO construir ahora):** armas como **iNFT (ERC-7857)** coleccionables; PvP (humano vs humano con ZEGON de árbitro); "ZEGON entrenado con tu propio estilo"; ligas/temporadas; mainnet (Aristotle, `chainId 16661`).

---

## 11. Supuestos y cosas a VERIFICAR antes de codear (honesto)

1. **Catálogo y firmas del SDK de 0G Compute** (modelos vivos, métodos de `broker.inference`, forma de la atestación que se puede mostrar al usuario) → confirmar en `docs.0g.ai` y el README de `@0glabs/0g-serving-broker`. **No inventar APIs.**
2. **Latencia** de la inferencia sellada por ronda → por eso el juego es por turnos. Si es alta, mostrar el "reading..." como parte del drama.
3. **Galileo testnet** (chainId/RPC/explorer/faucet) operativa → confirmar al iniciar.
4. **0G Storage**: usar **blob** (no KV — KV requiere nodos propios).
5. **Prior-art**: confirmar que "duelo vs IA ciega que te lee, provably fair" no esté ya hecho en el ecosistema 0G/cripto antes de fijar.
6. **iNFT (ERC-7857)** queda fuera del MVP por madurez de tooling.

---

## 12. Checklist de submission (Zero Cup)
- [ ] Demo jugable en vivo (link).
- [ ] **Contract address + link al explorer** (Galileo).
- [ ] Repo público con **README** (setup + features de 0G).
- [ ] **Video < 3 min** (duelo + DEADEYE + VERIFY).
- [ ] Qué SDKs/features de 0G se usaron (Compute sellado, Chain commit-reveal, Storage).
- [ ] Nombres del equipo + contacto (Telegram & X).

---

## 13. Hook de lanzamiento (para el voto comunitario)
Idea de tweet: *"We built a gunslinger that's BLINDFOLDED. It can't see your move. It still reads you and outdraws you — and you can prove on-chain it never cheated. Meet ZEGON. 🤠🩹 Powered by 0G sealed inference. Play the Daily ↓"* + clip de un DEADEYE seguido del VERIFY.

Mensaje único, repetido en todos lados: **"Dados justos ya está resuelto. ZEGON prueba que la *mente* es justa."**

---

## 14. Riesgos honestos & mitigación
- **"¿La IA juega bien?"** → No prometemos que ZEGON sea invencible; prometemos que **no puede hacer trampa, y se prueba.** Enmarcar el claim con precisión.
- **Scope (combate en 6 días)** → mantener el duelo **por turnos y mínimo**; el wow vive en el Blindsight + la prueba, no en gráficos AAA. Si Fase 2-3 se atrasa, simplificar la "inteligencia" de ZEGON (que igual sea provadamente-ciego).
- **Originalidad** → vigilar el framing "IA ciega que te lee, provably fair"; verificar prior-art (§11.5).
- **Fricción** → jugador **sin wallet**; el backend patrocina el gas; VERIFY es opcional pero impactante.

---

*Fin del spec. Para construir: empezar por FASE 0. No saltar la verificación del SDK de 0G (§11). El corazón del juego es la justicia verificable — todo lo demás (armas, glitch, lore) sirve a eso.*
