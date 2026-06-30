import { getAddress, isAddress } from "viem";

const STORAGE_KEY = "zegon-wallet";

type WalletListener = (address: string | null) => void;

let cachedAddress: string | null = loadStored();
let providerListenersBound = false;

const listeners = new Set<WalletListener>();

function loadStored(): string | null {
  if (typeof localStorage === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && isAddress(stored)) {
    return getAddress(stored);
  }
  return null;
}

function persist(address: string | null): void {
  if (typeof localStorage === "undefined") return;
  if (address) {
    localStorage.setItem(STORAGE_KEY, address);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function bindProviderListeners(): void {
  if (providerListenersBound) return;
  const provider = window.ethereum;
  if (!provider?.on) return;
  providerListenersBound = true;

  provider.on("accountsChanged", (accounts: string[]) => {
    const next = accounts?.[0];
    if (next && isAddress(next)) {
      cachedAddress = getAddress(next);
      persist(cachedAddress);
    } else {
      cachedAddress = null;
      persist(null);
    }
    notify();
  });
}

async function requestAccountPicker(): Promise<void> {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch {
    // Wallet may not support EIP-2255 permissions; eth_requestAccounts still runs below.
  }
}

async function revokeWalletPermissions(): Promise<void> {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch {
    // Not all wallets implement revoke; local disconnect still clears app state.
  }
}

function notify(): void {
  for (const listener of listeners) {
    listener(cachedAddress);
  }
}

export function getWalletAddress(): string | null {
  return cachedAddress;
}

export function onWalletChange(listener: WalletListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function hasEthereumProvider(): boolean {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export async function connectWallet(options?: { pickAccount?: boolean }): Promise<string> {
  if (!window.ethereum) {
    throw new Error("NO_WALLET");
  }

  // After disconnect we revoke permissions; always re-prompt so the user can pick
  // an account. Explicit pickAccount also forces the wallet account selector.
  if (options?.pickAccount !== false) {
    await requestAccountPicker();
  }

  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];

  const raw = accounts[0];
  if (!raw || !isAddress(raw)) {
    throw new Error("INVALID_ADDRESS");
  }

  cachedAddress = getAddress(raw);
  persist(cachedAddress);
  bindProviderListeners();
  notify();
  return cachedAddress;
}

export async function disconnectWallet(): Promise<void> {
  cachedAddress = null;
  persist(null);
  await revokeWalletPermissions();
  notify();
}

if (typeof window !== "undefined" && cachedAddress) {
  bindProviderListeners();
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: never[]) => void) => void;
      removeListener?: (event: string, handler: (...args: never[]) => void) => void;
    };
  }
}
