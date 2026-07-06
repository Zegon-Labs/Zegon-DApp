const NOTCH_COIN_SRC = "/sprites/coin.png";

export type NotchCoinSize = "sm" | "md" | "lg" | "xl";

interface NotchCoinProps {
  size?: NotchCoinSize;
  className?: string;
  alt?: string;
}

export function NotchCoin({
  size = "md",
  className = "",
  alt = "Notch",
}: NotchCoinProps) {
  return (
    <img
      src={NOTCH_COIN_SRC}
      alt={alt}
      className={`notch-coin notch-coin--${size}${className ? ` ${className}` : ""}`}
      draggable={false}
      loading="lazy"
    />
  );
}

interface NotchBalanceProps {
  amount: number;
  size?: NotchCoinSize;
  showLabel?: boolean;
  label?: string;
  className?: string;
  compact?: boolean;
  "aria-live"?: "polite" | "off" | "assertive";
}

export function NotchBalance({
  amount,
  size = "md",
  showLabel = true,
  label = "Notches",
  className = "",
  compact = false,
  "aria-live": ariaLive,
}: NotchBalanceProps) {
  return (
    <div
      className={`notch-balance${compact ? " notch-balance--compact" : ""}${className ? ` ${className}` : ""}`}
      aria-label={`${amount} ${label}`}
      aria-live={ariaLive}
    >
      <NotchCoin size={size} alt="" />
      <span className="notch-balance__amount">{amount}</span>
      {showLabel ? <span className="notch-balance__label">{label}</span> : null}
    </div>
  );
}
