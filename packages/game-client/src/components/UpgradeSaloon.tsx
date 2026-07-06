import { useEffect, useMemo, useState } from "react";
import {
  UPGRADE_DEFINITIONS,
  RELIC_DEFINITIONS,
  RELIC_ORDER,
  getUpgradeCost,
  getUpgradeLevel,
  getRelicCost,
  getConsumableCount,
  isUpgradeUnlocked,
  isConsumableUnlocked,
  missingUnlockRequirements,
  connectionUnlocked,
  previewSaloonStats,
  previewEquippedConsumableEffect,
  type UpgradeId,
  type SaloonRelicId,
} from "@zegon/game-core";
import { gameBridge } from "../game/bridge.js";
import { useLocale } from "../hooks/useLocale.js";
import { format } from "../i18n/index.js";
import { notify } from "../lib/toast.js";
import { fetchProfile, getCachedProfile, onProfileChange } from "../services/profile.js";
import {
  equipConsumableOnServer,
  purchaseRelicOnServer,
  purchaseUpgradeOnServer,
} from "../services/upgrades.js";
import { getWalletAddress, onWalletChange } from "../services/wallet.js";
import { playSfx } from "../services/sfx.js";
import { shotDamageMultiplierLabel } from "../utils/damageFormat.js";
import { NotchBalance } from "./NotchCoin.js";
import {
  BRANCH_LABELS,
  BRANCH_LABEL_POSITIONS,
  SALOON_TREE_HEIGHT,
  SALOON_TREE_NODES,
  SALOON_TREE_WIDTH,
  popoverPosition,
  treeConnections,
  type TreeNodeDef,
  type TreeNodeId,
} from "./saloonTreeLayout.js";

type SaloonTab = "tree" | "satchel";

type UpgradeNodeState = ReturnType<typeof buildUpgradeNodeState>;

function upgradeEffectLine(
  id: UpgradeId,
  level: number,
  baseLevels: Record<string, number> | undefined,
  strings: ReturnType<typeof useLocale>["strings"],
): string {
  const stats = previewSaloonStats({ ...baseLevels, [id]: level });
  switch (id) {
    case "fine_lead":
      return format(strings.saloonEffectShot, {
        dmg: shotDamageMultiplierLabel(stats.shotDamage),
      });
    case "hardened_leather":
      return format(strings.saloonEffectLives, {
        slots: stats.lifeSlots,
        hits: stats.maxHits,
      });
    case "instinct":
      return format(strings.saloonEffectDeadeye, {
        reads: stats.deadeyeAfterReads,
      });
    case "quick_hands":
      return format(strings.saloonEffectCooldown, {
        rounds: stats.itemCooldownRounds,
      });
    case "extra_powder":
      return format(strings.saloonEffectAmmo, { extra: stats.extraAmmo });
    default:
      return "";
  }
}

function isUpgradeNode(id: TreeNodeId): id is UpgradeId {
  return id !== "root" && id in UPGRADE_DEFINITIONS;
}

function relicBranch(id: SaloonRelicId): "offense" | "defense" | "gear" {
  switch (id) {
    case "bounty_mark":
      return "offense";
    case "nitro_caps":
      return "defense";
    case "adrenaline":
      return "gear";
  }
}

function upgradeDisplayName(id: UpgradeId, lang: "en" | "es"): string {
  const def = UPGRADE_DEFINITIONS[id];
  return lang === "es" ? def.nameEs : def.nameEn;
}

function buildUpgradeNodeState(
  node: TreeNodeDef,
  profile: NonNullable<ReturnType<typeof getCachedProfile>>,
  notches: number,
  lang: "en" | "es",
  strings: ReturnType<typeof useLocale>["strings"],
) {
  if (!isUpgradeNode(node.id)) {
    return {
      level: 0,
      maxLevel: 0,
      cost: null as number | null,
      maxed: false,
      locked: false,
      unlockBlocked: false,
      affordable: false,
      name: strings.saloonTreeRoot,
      desc: strings.saloonLoadoutPreview,
    };
  }
  const def = UPGRADE_DEFINITIONS[node.id];
  const level = getUpgradeLevel(profile.upgrades, node.id);
  const cost = getUpgradeCost(node.id, level);
  const maxed = cost === null;
  const unlockBlocked = !isUpgradeUnlocked(node.id, profile.upgrades);
  const levelBlocked = Boolean(
    def.minPlayerLevel && (profile.level ?? 1) < def.minPlayerLevel,
  );
  const locked = unlockBlocked || levelBlocked;
  const affordable = !maxed && !locked && notches >= (cost ?? 0);
  return {
    level,
    maxLevel: def.maxLevel,
    cost,
    maxed,
    locked,
    unlockBlocked,
    affordable,
    name: lang === "es" ? def.nameEs : def.nameEn,
    desc: lang === "es" ? def.descEs : def.descEn,
  };
}

interface TreePopoverProps {
  node: TreeNodeDef;
  state: UpgradeNodeState;
  profile: NonNullable<ReturnType<typeof getCachedProfile>>;
  stats: ReturnType<typeof previewSaloonStats>;
  equippedFx: string[];
  strings: ReturnType<typeof useLocale>["strings"];
  unlockHint: (id: UpgradeId) => string | null;
  onBuy: (id: UpgradeId) => void;
}

function SaloonTreePopover({
  node,
  state,
  profile,
  stats,
  equippedFx,
  strings,
  unlockHint,
  onBuy,
}: TreePopoverProps) {
  const pos = popoverPosition(node);
  const isRoot = node.id === "root";
  const caretOffset = Math.max(22, Math.min(pos.anchorY - pos.top, 280));

  return (
    <div
      className={`saloon-popover saloon-popover--${pos.placement}`}
      style={{
        left: pos.left,
        top: pos.top,
        ["--caret-offset" as string]: `${caretOffset}px`,
      }}
      role="dialog"
      aria-label={state.name}
    >
      <span className="saloon-popover__caret" aria-hidden="true" />
      <div className="saloon-popover__head">
        <h2 className="saloon-popover__title">{state.name}</h2>
        {!isRoot ? (
          <span className="saloon-popover__level">
            {state.level}/{state.maxLevel}
          </span>
        ) : null}
      </div>
      <p className="saloon-popover__desc">{state.desc}</p>

      {isRoot ? (
        <ul className="saloon-popover__loadout">
          <li>
            {format(strings.saloonEffectShot, {
              dmg: shotDamageMultiplierLabel(stats.shotDamage),
            })}
          </li>
          <li>
            {format(strings.saloonEffectLives, {
              slots: stats.lifeSlots,
              hits: stats.maxHits,
            })}
          </li>
          <li>
            {format(strings.saloonEffectDeadeye, {
              reads: stats.deadeyeAfterReads,
            })}
          </li>
          {equippedFx.map((line) => (
            <li key={line} className="saloon-popover__loadout-relic">
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <>
          {(state.level > 0 || !state.maxed) && isUpgradeNode(node.id) ? (
            <div className="saloon-popover__effects">
              {state.level > 0 ? (
                <div className="saloon-popover__effect-row">
                  <span className="saloon-popover__effect-tag">
                    {strings.saloonNowTag}
                  </span>
                  <span className="saloon-popover__effect-value">
                    {upgradeEffectLine(node.id, state.level, profile.upgrades, strings)}
                  </span>
                </div>
              ) : null}
              {!state.maxed ? (
                <div className="saloon-popover__effect-row saloon-popover__effect-row--next">
                  <span className="saloon-popover__effect-tag saloon-popover__effect-tag--next">
                    {strings.saloonNextTag}
                  </span>
                  <span className="saloon-popover__effect-value">
                    {upgradeEffectLine(node.id, state.level + 1, profile.upgrades, strings)}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
          {state.unlockBlocked && isUpgradeNode(node.id) ? (
            <p className="saloon-popover__locked">{unlockHint(node.id)}</p>
          ) : null}
          {state.locked && !state.unlockBlocked && isUpgradeNode(node.id) ? (
            <p className="saloon-popover__locked">
              {format(strings.saloonLevelRequired, {
                level: UPGRADE_DEFINITIONS[node.id].minPlayerLevel ?? 1,
              })}
            </p>
          ) : null}
          <div className="saloon-popover__footer">
            {!state.maxed && state.cost != null ? (
              <NotchBalance
                amount={state.cost}
                size="sm"
                showLabel={false}
                className={`saloon-popover__cost${state.affordable ? " saloon-popover__cost--ok" : ""}`}
              />
            ) : null}
            <button
              type="button"
              className={`saloon-popover__buy${state.affordable ? " saloon-popover__buy--ready" : ""}`}
              disabled={state.maxed || state.locked}
              onClick={() => isUpgradeNode(node.id) && onBuy(node.id)}
            >
              {state.maxed
                ? strings.saloonOwned
                : strings.saloonUpgradeAction}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function UpgradeSaloon() {
  const { strings, language: lang } = useLocale();
  const [wallet, setWallet] = useState<string | null>(getWalletAddress());
  const [, tick] = useState(0);
  const [tab, setTab] = useState<SaloonTab>("tree");
  const [selectedId, setSelectedId] = useState<TreeNodeId | null>(null);
  const [selectedRelic, setSelectedRelic] = useState<SaloonRelicId | null>(null);

  useEffect(() => onWalletChange(setWallet), []);

  useEffect(() => {
    if (!wallet) return;
    void fetchProfile(wallet).then(() => tick((n) => n + 1));
    return onProfileChange((addr) => {
      if (addr === wallet) tick((n) => n + 1);
    });
  }, [wallet]);

  const profile = wallet ? getCachedProfile(wallet) : null;
  const notches = profile?.notches ?? 0;
  const stats = previewSaloonStats(profile?.upgrades);
  const equippedFx = previewEquippedConsumableEffect(profile?.equippedConsumable ?? null, lang);
  const connections = useMemo(() => treeConnections(), []);

  function unlockHint(id: UpgradeId): string | null {
    const missing = missingUnlockRequirements(id, profile?.upgrades);
    if (!missing.length) return null;
    return missing
      .map((req) =>
        format(strings.saloonUnlockRequires, {
          name: upgradeDisplayName(req.upgradeId, lang),
        }),
      )
      .join(" · ");
  }

  function selectNode(id: TreeNodeId) {
    playSfx("ui_modal_open");
    setSelectedId(id);
  }

  async function buyUpgrade(id: UpgradeId) {
    if (!wallet) return;
    const ok = await purchaseUpgradeOnServer(wallet, id);
    if (ok) {
      playSfx("achievement_unlock");
      await fetchProfile(wallet);
      tick((n) => n + 1);
      notify.success(strings.saloonTitle);
    } else {
      notify.error(strings.profileSaveFailed);
    }
  }

  async function buyConsumable(id: SaloonRelicId) {
    if (!wallet) return;
    const ok = await purchaseRelicOnServer(wallet, id);
    if (ok) {
      playSfx("achievement_unlock");
      await fetchProfile(wallet);
      tick((n) => n + 1);
      notify.success(strings.saloonTitle);
    } else {
      notify.error(strings.profileSaveFailed);
    }
  }

  async function toggleEquip(id: SaloonRelicId) {
    if (!wallet || !profile) return;
    const next = profile.equippedConsumable === id ? null : id;
    if (next && getConsumableCount(profile.relics, next) <= 0) return;
    const ok = await equipConsumableOnServer(wallet, next);
    if (ok) {
      await fetchProfile(wallet);
      tick((n) => n + 1);
    }
  }

  const selectedNode = selectedId
    ? SALOON_TREE_NODES.find((n) => n.id === selectedId)
    : undefined;
  const selectedState =
    selectedNode && profile ? buildUpgradeNodeState(selectedNode, profile, notches, lang, strings) : null;

  return (
    <div className="saloon-screen" role="dialog" aria-modal="true">
      <div className="saloon-screen__panel">
        <span className="saloon-screen__corner saloon-screen__corner--tl" aria-hidden="true" />
        <span className="saloon-screen__corner saloon-screen__corner--tr" aria-hidden="true" />
        <span className="saloon-screen__corner saloon-screen__corner--bl" aria-hidden="true" />
        <span className="saloon-screen__corner saloon-screen__corner--br" aria-hidden="true" />

        <header className="saloon-screen__header">
          <button
            type="button"
            className="saloon-screen__back"
            onClick={() => gameBridge.navigate({ type: "hub" })}
          >
            ← {strings.back}
          </button>
          <div className="saloon-screen__heading">
            <span className="saloon-screen__menu-label">{strings.saloonMenu}</span>
            <h1 className="saloon-screen__title">{strings.saloonTitle}</h1>
          </div>
          <NotchBalance
            amount={notches}
            size="lg"
            showLabel
            label={strings.notchCurrencyName}
            className="saloon-screen__currency"
            aria-live="polite"
          />
        </header>

        <div className="saloon-screen__tabs-wrap">
          <nav className="saloon-screen__tabs" aria-label={strings.saloonTitle}>
            <button
              type="button"
              className={`saloon-screen__tab${tab === "tree" ? " saloon-screen__tab--active" : ""}`}
              onClick={() => {
                setTab("tree");
                setSelectedRelic(null);
              }}
            >
              {strings.saloonTabTree}
            </button>
            <button
              type="button"
              className={`saloon-screen__tab${tab === "satchel" ? " saloon-screen__tab--active" : ""}`}
              onClick={() => {
                setTab("satchel");
                setSelectedId(null);
              }}
            >
              {strings.saloonTabSatchel}
            </button>
          </nav>
        </div>

        {!wallet || !profile ? (
          <div className="saloon-screen__empty">
            <p>{strings.settingsProfileNoWallet}</p>
          </div>
        ) : tab === "tree" ? (
          <div className="saloon-screen__tree-wrap">
            <div className="saloon-screen__tree-board">
              <p className="saloon-screen__tree-hint">{strings.saloonTreeHint}</p>
              <div
                className="saloon-screen__tree"
                style={{ width: SALOON_TREE_WIDTH, height: SALOON_TREE_HEIGHT }}
              >
            <svg
              className="saloon-tree__lines"
              width={SALOON_TREE_WIDTH}
              height={SALOON_TREE_HEIGHT}
              aria-hidden="true"
            >
              {connections.map(({ from, to }) => {
                if (!isUpgradeNode(to.id)) return null;
                const active = connectionUnlocked(
                  from.id === "root" ? "root" : from.id,
                  to.id,
                  profile.upgrades,
                );
                return (
                  <line
                    key={`${from.id}-${to.id}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    className={`saloon-tree__line${active ? " saloon-tree__line--active" : ""}${!active ? " saloon-tree__line--locked" : ""}`}
                  />
                );
              })}
            </svg>

            {BRANCH_LABEL_POSITIONS.map(({ branch, x, y, align }) => (
              <div
                key={branch}
                className={`saloon-tree__branch saloon-tree__branch--${branch} saloon-tree__branch--align-${align}`}
                style={{ left: x, top: y }}
              >
                {BRANCH_LABELS[branch][lang]}
              </div>
            ))}

            {SALOON_TREE_NODES.map((node) => {
              if (node.id === "root") {
                return (
                  <button
                    key={node.id}
                    type="button"
                    className={`saloon-tree__node saloon-tree__node--root${selectedId === "root" ? " saloon-tree__node--selected" : ""}`}
                    style={{ left: node.x, top: node.y }}
                    onClick={() => selectNode("root")}
                    aria-pressed={selectedId === "root"}
                  >
                    <span className="saloon-tree__node-icon">{node.icon}</span>
                  </button>
                );
              }
              const state = buildUpgradeNodeState(node, profile, notches, lang, strings);
              const isSelected = selectedId === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  className={[
                    "saloon-tree__node",
                    node.branch ? `saloon-tree__node--${node.branch}` : "",
                    state.level > 0 ? "saloon-tree__node--owned" : "",
                    state.affordable ? "saloon-tree__node--affordable" : "",
                    state.locked ? "saloon-tree__node--locked" : "",
                    state.maxed ? "saloon-tree__node--maxed" : "",
                    isSelected ? "saloon-tree__node--selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ left: node.x, top: node.y }}
                  onClick={() => selectNode(node.id)}
                  aria-pressed={isSelected}
                  aria-label={state.name}
                >
                  <span className="saloon-tree__node-icon">{node.icon}</span>
                  {state.maxLevel > 1 ? (
                    <span className="saloon-tree__node-pips" aria-hidden="true">
                      {Array.from({ length: state.maxLevel }, (_, i) => (
                        <span
                          key={i}
                          className={`saloon-tree__pip${i < state.level ? " saloon-tree__pip--on" : ""}`}
                        />
                      ))}
                    </span>
                  ) : null}
                  {state.unlockBlocked && state.level === 0 ? (
                    <span className="saloon-tree__node-lock" aria-hidden="true">
                      🔒
                    </span>
                  ) : null}
                  {state.cost != null && !state.maxed && !state.locked ? (
                    <span
                      className={`saloon-tree__node-cost${state.affordable ? " saloon-tree__node-cost--ok" : ""}`}
                    >
                      {state.cost}
                    </span>
                  ) : null}
                </button>
              );
            })}

            {selectedNode && selectedState ? (
              <SaloonTreePopover
                node={selectedNode}
                state={selectedState}
                profile={profile}
                stats={stats}
                equippedFx={equippedFx}
                strings={strings}
                unlockHint={unlockHint}
                onBuy={(id) => void buyUpgrade(id)}
              />
            ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="saloon-screen__satchel">
            <div className="saloon-screen__satchel-board">
              <p className="saloon-screen__satchel-intro">{strings.saloonConsumableHint}</p>
              <div className="saloon-satchel-grid">
            {RELIC_ORDER.map((id) => {
              const def = RELIC_DEFINITIONS[id];
              const count = getConsumableCount(profile.relics, id);
              const cost = getRelicCost(id);
              const unlocked = isConsumableUnlocked(id, profile.upgrades);
              const equipped = profile.equippedConsumable === id;
              const canBuy = unlocked && notches >= cost;
              const name = lang === "es" ? def.nameEs : def.nameEn;
              const desc = lang === "es" ? def.descEs : def.descEn;
              const gate = def.unlockAfterUpgrade
                ? upgradeDisplayName(def.unlockAfterUpgrade, lang)
                : null;
              const isSelected = selectedRelic === id;
              const branch = relicBranch(id);
              const owned = count > 0;
              const sphereClass = [
                "saloon-tree__node",
                "saloon-tree__node--satchel",
                `saloon-tree__node--${branch}`,
                owned ? "saloon-tree__node--owned" : "",
                canBuy ? "saloon-tree__node--affordable" : "",
                !unlocked ? "saloon-tree__node--locked" : "",
                equipped ? "saloon-satchel-card__sphere--equipped" : "",
                isSelected ? "saloon-tree__node--selected" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <div
                  key={id}
                  className={`saloon-satchel-card${isSelected ? " saloon-satchel-card--selected" : ""}`}
                >
                  <button
                    type="button"
                    className="saloon-satchel-card__trigger"
                    onClick={() => {
                      playSfx("ui_modal_open");
                      setSelectedRelic(isSelected ? null : id);
                    }}
                    aria-expanded={isSelected}
                    aria-label={name}
                  >
                    <span className={sphereClass}>
                      <span className="saloon-tree__node-icon">{def.icon}</span>
                      {!unlocked ? (
                        <span className="saloon-tree__node-lock" aria-hidden="true">
                          🔒
                        </span>
                      ) : null}
                      {unlocked ? (
                        <span
                          className={`saloon-tree__node-cost${canBuy ? " saloon-tree__node-cost--ok" : ""}`}
                        >
                          {cost}
                        </span>
                      ) : null}
                      {owned ? (
                        <span className="saloon-satchel-card__qty" aria-label={`×${count}`}>
                          ×{count}
                        </span>
                      ) : null}
                    </span>
                    <span className="saloon-satchel-card__name">{name}</span>
                  </button>
                  {isSelected ? (
                    <div className="saloon-popover saloon-popover--satchel" role="dialog" aria-label={name}>
                      <div className="saloon-popover__head">
                        <h2 className="saloon-popover__title">{name}</h2>
                        <span className="saloon-popover__level">×{count}</span>
                      </div>
                      <p className="saloon-popover__desc">{desc}</p>
                      {!unlocked && gate ? (
                        <p className="saloon-popover__locked">
                          {format(strings.saloonConsumableUnlock, { name: gate })}
                        </p>
                      ) : null}
                      <div className="saloon-popover__footer">
                        {unlocked ? (
                          <NotchBalance
                            amount={cost}
                            size="sm"
                            showLabel={false}
                            className={`saloon-popover__cost${canBuy ? " saloon-popover__cost--ok" : ""}`}
                          />
                        ) : null}
                        <button
                          type="button"
                          className={`saloon-popover__buy saloon-popover__buy--equip${equipped ? " saloon-popover__buy--equipped" : ""}`}
                          disabled={!unlocked || count <= 0}
                          onClick={() => void toggleEquip(id)}
                        >
                          {equipped ? strings.saloonUnequip : strings.saloonEquip}
                        </button>
                        <button
                          type="button"
                          className={`saloon-popover__buy${canBuy ? " saloon-popover__buy--ready" : ""}`}
                          disabled={!unlocked}
                          onClick={() => void buyConsumable(id)}
                        >
                          {strings.saloonBuyAction}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
